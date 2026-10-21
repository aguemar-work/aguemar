import { config } from "zod";

/**
 * Apaga la compilación JIT de Zod. Zod 4 prueba `new Function("")` para acelerar los validadores y
 * la CSP lo reporta como `eval` bloqueado (issue AGUEMAR-1 en Sentry), aunque no falle; sin JIT
 * validan igual. Lo importan, solo por su efecto, los módulos con esquemas que corren en el
 * navegador: así viaja con los formularios y no en el chunk que cargan todas las rutas.
 * No reexporta `z`: reexportarlo impide descartar partes de Zod (los textos en otros idiomas).
 */
config({ jitless: true });
