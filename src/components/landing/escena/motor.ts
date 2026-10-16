import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { esForma, generarFormas } from "@/lib/escena/formas";
import { estadoRecorrido, type Ancla } from "@/lib/escena/recorrido";

/**
 * Motor de la escena de la landing (solo navegador; se carga con import() después de pintar).
 *
 * Las posiciones se calculan en la CPU cada cuadro: el objetivo es la mezcla de dos formas
 * según el scroll, y cada partícula lo persigue con su propia velocidad. Así los cambios
 * (scroll, pestañas de servicios) siempre son continuos y las partículas llegan escalonadas.
 */

const VERTICE = /* glsl */ `
  attribute float aAzar;
  uniform float uTiempo;
  uniform float uPixel;
  uniform float uTamano;
  uniform vec2 uPuntero;
  uniform float uEmpuje;
  varying float vAzar;
  varying float vBrillo;

  void main() {
    vec3 p = position;
    // Respiración: cada partícula flota un poco a su ritmo.
    p += vec3(
      sin(uTiempo * 0.6 + aAzar * 40.0),
      cos(uTiempo * 0.5 + aAzar * 23.0),
      sin(uTiempo * 0.4 + aAzar * 17.0)
    ) * 0.035;

    vec4 mundo = modelMatrix * vec4(p, 1.0);
    // El cursor aparta las partículas (en el plano de la pantalla).
    vec2 d = mundo.xy - uPuntero;
    float cerca = 1.0 - smoothstep(0.0, 1.4, length(d));
    mundo.xy += normalize(d + 1e-4) * cerca * cerca * uEmpuje;
    mundo.z += cerca * 0.6 * uEmpuje;

    vec4 vista = viewMatrix * mundo;
    gl_Position = projectionMatrix * vista;
    float tam = uTamano * (0.55 + aAzar * 0.9) * (1.0 + cerca * 0.8);
    gl_PointSize = tam * uPixel * (10.0 / -vista.z);
    vAzar = aAzar;
    vBrillo = 0.55 + 0.45 * sin(uTiempo * (0.8 + aAzar) + aAzar * 60.0) + cerca * 0.6;
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uMenta;
  uniform float uOpacidad;
  varying float vAzar;
  varying float vBrillo;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.6);
    // Una de cada ocho partículas es casi blanca: da profundidad al verde.
    vec3 color = mix(uMenta, vec3(0.92, 1.0, 0.96), step(0.875, vAzar) * 0.75);
    gl_FragColor = vec4(color, a * vBrillo * uOpacidad);
  }
`;

export interface OpcionesEscena {
  particulas: number;
  /** Se llama cuando el primer cuadro ya está pintado. */
  alEstarLista?: () => void;
  /** Se llama si se pierde el contexto WebGL (la landing vuelve al SVG). */
  alFallar?: () => void;
}

interface AnclaDom extends Ancla {
  el: HTMLElement;
}

const numero = (valor: string | undefined, porDefecto: number) => {
  const n = Number(valor);
  return Number.isFinite(n) && valor !== undefined && valor !== "" ? n : porDefecto;
};

export function crearEscena(contenedor: HTMLElement, opciones: OpcionesEscena): () => void {
  const n = opciones.particulas;
  const formas = generarFormas(n);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "default" });
  renderer.setClearColor(0x000000, 0);
  const pixel = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixel);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  contenedor.appendChild(renderer.domElement);

  const escena = new Scene();
  const camara = new PerspectiveCamera(35, 1, 0.1, 100);
  camara.position.z = 10;

  // Arranca disperso: al cargar, las partículas se juntan en los corchetes.
  const actual = new Float32Array(n * 3);
  const nube = formas.nube;
  for (let i = 0; i < actual.length; i++) actual[i] = nube[i]! * 1.8;
  const objetivo = new Float32Array(n * 3);
  const azar = new Float32Array(n);
  // Cuánto se acerca cada partícula a su objetivo por cuadro a 60 fps, guardado como ln(1 - v)
  // para que el suavizado sea igual a cualquier tasa de cuadros: v(dt) = 1 - e^(ln(1 - v) · dt · 60).
  const lnResto = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    azar[i] = Math.random();
    lnResto[i] = Math.log(1 - (0.035 + Math.random() * 0.05));
  }

  const geometria = new BufferGeometry();
  const atributo = new BufferAttribute(actual, 3);
  atributo.setUsage(DynamicDrawUsage); // se sube cada cuadro
  geometria.setAttribute("position", atributo);
  geometria.setAttribute("aAzar", new BufferAttribute(azar, 1));

  const uniformes = {
    uTiempo: { value: 0 },
    uPixel: { value: pixel },
    uTamano: { value: 2.4 },
    uPuntero: { value: new Vector2(99, 99) },
    uEmpuje: { value: 0.55 },
    uMenta: { value: new Color("#1CE783") },
    uOpacidad: { value: 0 },
  };
  const material = new ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: uniformes,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const puntos = new Points(geometria, material);
  puntos.frustumCulled = false;
  const grupo = new Group();
  grupo.add(puntos);
  escena.add(grupo);

  // ---------- Medidas ----------
  let ancho = 1;
  let alto = 1;
  let medioAlto = 1;
  let medioAncho = 1;
  const medir = () => {
    ancho = contenedor.clientWidth || window.innerWidth;
    alto = contenedor.clientHeight || window.innerHeight;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    medioAlto = Math.tan(((camara.fov / 2) * Math.PI) / 180) * camara.position.z;
    medioAncho = medioAlto * camara.aspect;
  };

  let anclas: AnclaDom[] = [];
  const leerAnclas = () => {
    anclas = Array.from(document.querySelectorAll<HTMLElement>("[data-forma]")).map((el) => {
      const r = el.getBoundingClientRect();
      return { el, centro: r.top + window.scrollY + r.height / 2, forma: "corchetes", lado: 0, intensidad: 1, escala: 1 };
    });
  };
  /** Forma y parámetros se leen en vivo: las pestañas de servicios cambian `data-forma` sin mover nada. */
  const refrescarDatos = () => {
    for (const a of anclas) {
      const d = a.el.dataset;
      a.forma = esForma(d.forma) ? d.forma : "nube";
      a.lado = numero(d.lado, 0);
      a.intensidad = numero(d.intensidad, 1);
      a.escala = numero(d.escala, 1);
    }
  };

  medir();
  leerAnclas();
  const alRedimensionar = () => {
    medir();
    leerAnclas();
  };
  window.addEventListener("resize", alRedimensionar);
  // El formulario y las fuentes cargan después y mueven las secciones.
  const observador = new ResizeObserver(() => leerAnclas());
  observador.observe(document.body);

  // ---------- Puntero ----------
  const puntero = new Vector2(99, 99);
  const punteroSuave = new Vector2(0, 0);
  const centro = new Vector2(0, 0);
  const alMoverPuntero = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    puntero.set(((e.clientX / ancho) * 2 - 1) * medioAncho, (1 - (e.clientY / alto) * 2) * medioAlto);
  };
  const alSalirPuntero = () => puntero.set(99, 99);
  window.addEventListener("pointermove", alMoverPuntero, { passive: true });
  document.documentElement.addEventListener("pointerleave", alSalirPuntero);

  // ---------- Bucle ----------
  const params = { lado: 0, intensidad: 0, escala: 1 };
  let cuadro = 0;
  let previo = performance.now();
  let tiempo = 0;
  let primerCuadro = true;

  const animar = (ahora: number) => {
    cuadro = requestAnimationFrame(animar);
    const dt = Math.min(0.25, (ahora - previo) / 1000);
    previo = ahora;
    tiempo += dt;
    // Suavizado independiente de la pantalla: k = cuadros de 60 fps transcurridos.
    const k = dt * 60;
    const suave = (v: number) => 1 - Math.pow(1 - v, k);

    refrescarDatos();
    const estado = estadoRecorrido(anclas, window.scrollY + alto / 2);
    const desde = formas[estado?.desde ?? "corchetes"];
    const hacia = formas[estado?.hacia ?? "corchetes"];
    const m = estado?.mezcla ?? 0;
    for (let i = 0; i < objetivo.length; i++) objetivo[i] = desde[i]! + (hacia[i]! - desde[i]!) * m;
    for (let i = 0; i < n; i++) {
      const v = 1 - Math.exp(lnResto[i]! * k);
      const j = i * 3;
      actual[j] = actual[j]! + (objetivo[j]! - actual[j]!) * v;
      actual[j + 1] = actual[j + 1]! + (objetivo[j + 1]! - actual[j + 1]!) * v;
      actual[j + 2] = actual[j + 2]! + (objetivo[j + 2]! - actual[j + 2]!) * v;
    }
    atributo.needsUpdate = true;

    // En pantallas angostas la forma va al centro, más chica y más tenue: el texto manda.
    const angosto = camara.aspect < 0.9;
    const lado = angosto ? 0 : (estado?.lado ?? 0);
    const ajuste = angosto ? Math.min(1, medioAncho / 3.4) : 1;
    const intensidad = (estado?.intensidad ?? 1) * (angosto ? 0.5 : 1);
    params.lado += (lado - params.lado) * suave(0.06);
    const escala = angosto ? Math.max(estado?.escala ?? 1, 0.95) * ajuste : (estado?.escala ?? 1);
    params.escala += (escala - params.escala) * suave(0.06);
    params.intensidad += (intensidad - params.intensidad) * suave(0.04);

    punteroSuave.lerp(puntero.x > 50 ? centro : puntero, suave(0.05));
    grupo.position.x = params.lado * medioAncho;
    grupo.scale.setScalar(params.escala);
    grupo.rotation.y = (punteroSuave.x / medioAncho) * 0.35 + Math.sin(tiempo * 0.15) * 0.12;
    grupo.rotation.x = -(punteroSuave.y / medioAlto) * 0.2 + Math.sin(tiempo * 0.11) * 0.05;

    uniformes.uTiempo.value = tiempo;
    uniformes.uPuntero.value.copy(puntero);
    uniformes.uOpacidad.value = params.intensidad;
    renderer.render(escena, camara);

    if (primerCuadro) {
      primerCuadro = false;
      opciones.alEstarLista?.();
    }
  };

  const iniciar = () => {
    if (cuadro) return;
    previo = performance.now();
    cuadro = requestAnimationFrame(animar);
  };
  const detener = () => {
    cancelAnimationFrame(cuadro);
    cuadro = 0;
  };
  // Pestaña oculta = cero trabajo.
  const alCambiarVisibilidad = () => (document.hidden ? detener() : iniciar());
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  const alPerderContexto = (e: Event) => {
    e.preventDefault();
    detener();
    opciones.alFallar?.();
  };
  renderer.domElement.addEventListener("webglcontextlost", alPerderContexto);

  iniciar();

  return () => {
    detener();
    window.removeEventListener("resize", alRedimensionar);
    window.removeEventListener("pointermove", alMoverPuntero);
    document.documentElement.removeEventListener("pointerleave", alSalirPuntero);
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    renderer.domElement.removeEventListener("webglcontextlost", alPerderContexto);
    observador.disconnect();
    geometria.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

