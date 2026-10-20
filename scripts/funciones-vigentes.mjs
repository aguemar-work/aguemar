/**
 * Vuelca la definición vigente de cada función SQL a db/funciones/<nombre>.sql
 * (ARQUITECTURA.md, ADR-04). Así se lee y se revisa en un diff la versión que rige
 * sin recorrer todas las migraciones. Es solo lectura: la fuente sigue siendo migrations/.
 *
 *   npm run db:funciones
 *
 * El test tests/unit/migraciones.node.test.ts falla si la carpeta quedó desactualizada.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { archivoFuncion, funcionesVigentes } from "./lib/funciones-sql.mjs";

const DIR = join("db", "funciones");
mkdirSync(DIR, { recursive: true });
for (const f of readdirSync(DIR)) if (f.endsWith(".sql")) rmSync(join(DIR, f));

const vigentes = funcionesVigentes();
for (const f of vigentes.values()) writeFileSync(join(DIR, `${f.nombre}.sql`), archivoFuncion(f));
console.log(`db/funciones: ${vigentes.size} funciones vigentes.`);
