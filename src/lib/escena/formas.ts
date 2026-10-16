/**
 * Formas de la escena 3D de la landing: cada una es una nube de N puntos (x, y, z)
 * que las partículas toman al llegar a su sección. Son funciones puras y deterministas
 * (misma semilla, mismos puntos) para poder probarlas sin WebGL.
 *
 * Unidades: la cámara ve unas ±3,1 unidades de alto en z = 0; las formas miden ~±2,2.
 */

export const FORMAS = ["corchetes", "espiral", "llaves", "chip", "nube", "linea", "plano", "huella", "red"] as const;
export type Forma = (typeof FORMAS)[number];

export function esForma(valor: unknown): valor is Forma {
  return typeof valor === "string" && (FORMAS as readonly string[]).includes(valor);
}

type Punto = [number, number];
type Aleatorio = () => number;

/** PRNG mulberry32: rápido y reproducible. */
export function aleatorio(semilla: number): Aleatorio {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal aproximada (suma de tres uniformes), centrada en 0 y con desvío ~0,5. */
function campana(r: Aleatorio) {
  return r() + r() + r() - 1.5;
}

/** Curva cuadrática de Bézier partida en `pasos` tramos. */
function bezier(p0: Punto, c: Punto, p1: Punto, pasos = 20): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const u = 1 - t;
    puntos.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return puntos;
}

function circulo(cx: number, cy: number, radio: number, pasos = 48, desde = 0, hasta = Math.PI * 2): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i <= pasos; i++) {
    const a = desde + ((hasta - desde) * i) / pasos;
    puntos.push([cx + Math.cos(a) * radio, cy + Math.sin(a) * radio]);
  }
  return puntos;
}

/**
 * Reparte n puntos a lo largo de varias polilíneas (proporcional a su largo),
 * con un grosor de trazo y algo de profundidad para que se vea en 3D.
 */
function sobreTrazos(polilineas: Punto[][], n: number, r: Aleatorio, grosor: number, profundidad: number): Float32Array {
  const tramos: { a: Punto; b: Punto; largo: number }[] = [];
  let total = 0;
  for (const linea of polilineas) {
    for (let i = 0; i < linea.length - 1; i++) {
      const a = linea[i]!;
      const b = linea[i + 1]!;
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (largo === 0) continue;
      tramos.push({ a, b, largo });
      total += largo;
    }
  }
  // Largo acumulado para elegir el tramo con una búsqueda binaria.
  const acumulado = new Float64Array(tramos.length);
  let suma = 0;
  tramos.forEach((t, i) => {
    suma += t.largo;
    acumulado[i] = suma;
  });

  const salida = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const objetivo = r() * total;
    let bajo = 0;
    let alto = tramos.length - 1;
    while (bajo < alto) {
      const medio = (bajo + alto) >> 1;
      if (acumulado[medio]! < objetivo) bajo = medio + 1;
      else alto = medio;
    }
    const { a, b } = tramos[bajo]!;
    const t = r();
    salida[i * 3] = a[0] + (b[0] - a[0]) * t + campana(r) * grosor;
    salida[i * 3 + 1] = a[1] + (b[1] - a[1]) * t + campana(r) * grosor;
    salida[i * 3 + 2] = campana(r) * profundidad;
  }
  return salida;
}

/** `< >` del logo (mismo trazo que `Brackets`, viewBox 200 × 120, centrado). */
function corchetes(n: number, r: Aleatorio) {
  const s = 2.2 / 50;
  const p = (x: number, y: number): Punto => [(x - 100) * s, (60 - y) * s];
  return sobreTrazos(
    [
      [p(70, 10), p(18, 60), p(70, 110)],
      [p(130, 10), p(182, 60), p(130, 110)],
    ],
    n,
    r,
    0.11,
    0.25,
  );
}

/**
 * Rectángulo áureo partido en cuadrados con su espiral (la de Fibonacci). Diseño.
 * Cada paso corta un cuadrado (izquierda, arriba, derecha, abajo) y traza un cuarto de círculo dentro.
 */
function espiral(n: number, r: Aleatorio) {
  const phi = (1 + Math.sqrt(5)) / 2;
  let x = 0;
  let y = 0;
  let w = phi;
  let h = 1;
  const cuadros: Punto[][] = [];
  const arcos: Punto[] = [];
  for (let k = 0; k < 10; k++) {
    const paso = k % 4;
    const s = paso % 2 === 0 ? h : w;
    let cuadro: [number, number];
    let centro: Punto;
    let desde: number;
    if (paso === 0) {
      cuadro = [x, y];
      centro = [x + s, y];
      desde = Math.PI;
      x += s;
      w -= s;
    } else if (paso === 1) {
      cuadro = [x, y + h - s];
      centro = [x, y + h - s];
      desde = Math.PI / 2;
      h -= s;
    } else if (paso === 2) {
      cuadro = [x + w - s, y];
      centro = [x + w - s, y + s];
      desde = 0;
      w -= s;
    } else {
      cuadro = [x, y];
      centro = [x + s, y + s];
      desde = -Math.PI / 2;
      y += s;
      h -= s;
    }
    const [cx, cy] = cuadro;
    cuadros.push([
      [cx, cy],
      [cx + s, cy],
      [cx + s, cy + s],
      [cx, cy + s],
      [cx, cy],
    ]);
    arcos.push(...circulo(centro[0], centro[1], s, 24, desde, desde - Math.PI / 2));
  }
  // La espiral lleva el doble de puntos que los cuadrados: es la protagonista.
  const escala = 4.6 / phi;
  const centrar = (p: Punto): Punto => [(p[0] - phi / 2) * escala, (p[1] - 0.5) * escala];
  const nEspiral = Math.round(n * 0.6);
  const a = sobreTrazos([arcos.map(centrar)], nEspiral, r, 0.03, 0.12);
  const b = sobreTrazos(cuadros.map((c) => c.map(centrar)), n - nEspiral, r, 0.012, 0.05);
  const salida = new Float32Array(n * 3);
  salida.set(a);
  salida.set(b, a.length);
  return salida;
}

/** `{ }`. Desarrollo. */
function llaves(n: number, r: Aleatorio) {
  const llave = (dx: number, signo: 1 | -1): Punto[] => {
    const q = (x: number, y: number): Punto => [dx + x * signo, y];
    return [
      ...bezier(q(0.55, 2.2), q(0, 2.2), q(0, 1.65)),
      ...bezier(q(0, 1.65), q(0, 1.1), q(0, 0.55), 4),
      ...bezier(q(0, 0.55), q(0, 0), q(-0.55, 0)),
      ...bezier(q(-0.55, 0), q(0, 0), q(0, -0.55)),
      ...bezier(q(0, -0.55), q(0, -1.1), q(0, -1.65), 4),
      ...bezier(q(0, -1.65), q(0, -2.2), q(0.55, -2.2)),
    ];
  };
  return sobreTrazos([llave(-1.5, 1), llave(1.5, -1)], n, r, 0.08, 0.22);
}

/** Un chip con patas y pistas. Soporte técnico. */
function chip(n: number, r: Aleatorio) {
  const cuadro = (m: number): Punto[] => [
    [-m, -m],
    [m, -m],
    [m, m],
    [-m, m],
    [-m, -m],
  ];
  const lineas: Punto[][] = [cuadro(1.05), cuadro(0.5)];
  const patas = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];
  for (const p of patas) {
    lineas.push([[p, 1.05], [p, 1.45]], [[p, -1.05], [p, -1.45]], [[1.05, p], [1.45, p]], [[-1.05, p], [-1.45, p]]);
  }
  // Pistas que salen del chip y doblan, como en una placa.
  lineas.push(
    [[-0.45, 1.45], [-0.45, 1.9], [-1.2, 2.3]],
    [[0.75, 1.45], [0.75, 2.2]],
    [[1.45, 0.15], [2.1, 0.15], [2.4, 0.6]],
    [[1.45, -0.75], [2.3, -0.75]],
    [[0.15, -1.45], [0.15, -1.9], [0.9, -2.3]],
    [[-1.45, -0.45], [-2.0, -0.45], [-2.4, -1.0]],
    [[-1.45, 0.75], [-2.3, 0.75]],
    circulo(-1.2, 2.3, 0.1, 12),
    circulo(2.4, 0.6, 0.1, 12),
    circulo(0.9, -2.3, 0.1, 12),
    circulo(-2.4, -1.0, 0.1, 12),
  );
  return sobreTrazos(lineas, n, r, 0.04, 0.12);
}

/** Polvo amplio y tranquilo, para las secciones de lectura. */
function nube(n: number, r: Aleatorio) {
  const salida = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    salida[i * 3] = (r() * 2 - 1) * 6.5;
    salida[i * 3 + 1] = (r() * 2 - 1) * 3.8;
    salida[i * 3 + 2] = (r() * 2 - 1) * 3;
  }
  return salida;
}

/** Un camino con cuatro nodos: los cuatro pasos de cómo trabajo. */
function linea(n: number, r: Aleatorio) {
  const camino: Punto[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    camino.push([Math.sin(t * Math.PI * 2) * 0.7, 2.5 - t * 5]);
  }
  const nodos = [0.125, 0.375, 0.625, 0.875].map((t) => circulo(Math.sin(t * Math.PI * 2) * 0.7, 2.5 - t * 5, 0.32, 32));
  return sobreTrazos([camino, ...nodos], n, r, 0.035, 0.15);
}

/** Una cuadrícula inclinada, como un plano de trabajo. Tu espacio. */
function plano(n: number, r: Aleatorio) {
  const lineas: Punto[][] = [];
  for (let x = -5; x <= 5; x += 0.625) lineas.push([[x, -3], [x, 3]]);
  for (let z = -3; z <= 3; z += 0.625) lineas.push([[-5, z], [5, z]]);
  const base = sobreTrazos(lineas, n, r, 0.012, 0);
  // La cuadrícula se arma en x/z y se inclina hacia la cámara.
  const salida = new Float32Array(n * 3);
  const inclinacion = 1.05;
  const cos = Math.cos(inclinacion);
  const sin = Math.sin(inclinacion);
  for (let i = 0; i < n; i++) {
    const x = base[i * 3]!;
    const z = base[i * 3 + 1]!;
    const y = Math.sin(x * 0.8) * Math.cos(z * 0.9) * 0.18 - 0.6;
    salida[i * 3] = x;
    salida[i * 3 + 1] = y * cos - z * sin;
    salida[i * 3 + 2] = y * sin + z * cos;
  }
  return salida;
}

/** Una huella digital: hecho a mano, por una persona. Quién está detrás. */
function huella(n: number, r: Aleatorio) {
  const lineas: Punto[][] = [];
  for (let k = 1; k <= 13; k++) {
    const radio = 0.16 * k;
    const corte = (k * 1.7) % (Math.PI * 2);
    const anillo: Punto[] = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      // Un hueco por anillo, en distinto lugar: así deja de parecer una diana.
      const distancia = Math.abs(((a - corte + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (k > 2 && distancia < 0.22 + (k % 3) * 0.08) {
        if (anillo.length > 1) lineas.push(anillo.splice(0));
        else anillo.length = 0;
        continue;
      }
      const ondula = 1 + 0.05 * Math.sin(a * 3 + k) + 0.03 * Math.sin(a * 5 - k * 0.7);
      anillo.push([Math.cos(a) * radio * 0.82 * ondula, Math.sin(a) * radio * 1.12 * ondula - 0.1 * (k / 13)]);
    }
    if (anillo.length > 1) lineas.push(anillo);
  }
  return sobreTrazos(lineas, n, r, 0.02, 0.05);
}

/** Nodos unidos con sus vecinos más cercanos: sistemas conectados. Proyectos. */
function red(n: number, r: Aleatorio) {
  const nodos: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) nodos.push([(r() * 2 - 1) * 3.4, (r() * 2 - 1) * 2.3, (r() * 2 - 1) * 1.6]);
  const aristas: [number, number][] = [];
  nodos.forEach((a, i) => {
    const cercanos = nodos
      .map((b, j) => ({ j, d: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }))
      .filter((x) => x.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { j } of cercanos) if (!aristas.some(([p, q]) => (p === j && q === i) || (p === i && q === j))) aristas.push([i, j]);
  });
  const salida = new Float32Array(n * 3);
  const enNodos = Math.round(n * 0.35);
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    let z: number;
    if (i < enNodos) {
      // Un racimo en cada nodo.
      const c = nodos[i % nodos.length]!;
      x = c[0] + campana(r) * 0.1;
      y = c[1] + campana(r) * 0.1;
      z = c[2] + campana(r) * 0.1;
    } else {
      const [p, q] = aristas[Math.floor(r() * aristas.length)]!;
      const a = nodos[p]!;
      const b = nodos[q]!;
      const t = r();
      x = a[0] + (b[0] - a[0]) * t + campana(r) * 0.015;
      y = a[1] + (b[1] - a[1]) * t + campana(r) * 0.015;
      z = a[2] + (b[2] - a[2]) * t + campana(r) * 0.015;
    }
    salida[i * 3] = x;
    salida[i * 3 + 1] = y;
    salida[i * 3 + 2] = z;
  }
  return salida;
}

const GENERADORES: Record<Forma, (n: number, r: Aleatorio) => Float32Array> = {
  corchetes,
  espiral,
  llaves,
  chip,
  nube,
  linea,
  plano,
  huella,
  red,
};

/** Los puntos de una forma: Float32Array de n × 3. */
export function generarForma(forma: Forma, n: number, semilla = 7): Float32Array {
  return GENERADORES[forma](n, aleatorio(semilla + FORMAS.indexOf(forma) * 101));
}

/** Todas las formas, para generarlas una vez al iniciar la escena. */
export function generarFormas(n: number, semilla = 7): Record<Forma, Float32Array> {
  return Object.fromEntries(FORMAS.map((f) => [f, generarForma(f, n, semilla)])) as Record<Forma, Float32Array>;
}
