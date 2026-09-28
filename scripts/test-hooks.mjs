// Hooks de resolución para correr tests con el runner nativo de Node
// (`npm test`, node:test) sin agregar dependencias: resuelve el alias
// "@/..." de tsconfig y los imports relativos sin extensión (convención del
// proyecto, pensada para el bundler de Next) hacia los archivos .ts/.tsx.
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcDir = path.resolve(import.meta.dirname, "../src");
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveFile(basePath) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = basePath + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath = null;
    if (specifier.startsWith("@/")) {
      basePath = path.join(srcDir, specifier.slice(2));
    } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      basePath = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const resolved = basePath ? resolveFile(basePath) : null;
    return nextResolve(resolved ?? specifier, context);
  },
});
