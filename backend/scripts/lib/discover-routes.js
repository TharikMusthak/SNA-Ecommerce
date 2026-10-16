import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const appFile = path.join(backendRoot, "src/app.js");

export function discoverRoutes() {
  const appSource = fs.readFileSync(appFile, "utf8");
  const imports = importedModules(appSource);
  const routes = [];
  for (const block of appSource.matchAll(
    /app\.use\(\s*["']([^"']+)["'][\s\S]*?\);/g,
  )) {
    const mount = block[1];
    if (!mount.startsWith("/api/v1") && mount !== "/api/auth") continue;
    const variable = block[0].match(/,\s*(\w+)\s*\);\s*$/)?.[1];
    const module = imports.get(variable);
    if (!module) continue;
    const source = fs.readFileSync(module.file, "utf8");
    const routeVariable = module.exportName || "router";
    const expression = new RegExp(
      `\\b${routeVariable}\\s*\\.\\s*(get|post|put|patch|delete)\\s*\\(\\s*[\"']([^\"']*)[\"']`,
      "gi",
    );
    for (const match of source.matchAll(expression))
      routes.push(route(match[1], join(mount, match[2]), module.file));
  }
  for (const match of appSource.matchAll(
    /app\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi,
  )) {
    if (match[2] === "/api/health" || match[2].startsWith("/api/v1"))
      routes.push(route(match[1], match[2], appFile));
  }
  const unique = new Map();
  for (const item of routes) {
    const key = `${item.method} ${item.path}`;
    const previous = unique.get(key);
    if (previous) previous.sources.push(...item.sources);
    else unique.set(key, item);
  }
  return [...unique.values()].sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}

function importedModules(source) {
  const map = new Map();
  for (const match of source.matchAll(
    /import\s+(\w+)\s+from\s+["']([^"']+)["']/g,
  ))
    map.set(match[1], { file: resolveModule(match[2]), exportName: null });
  for (const match of source.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    for (const name of match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      const [exportName, alias] = name.split(/\s+as\s+/);
      map.set(alias || exportName, {
        file: resolveModule(match[2]),
        exportName,
      });
    }
  }
  return map;
}
function resolveModule(specifier) {
  return path.resolve(path.dirname(appFile), specifier);
}
function join(base, child) {
  return `${base.replace(/\/$/, "")}/${child.replace(/^\//, "")}`.replace(
    /\/$/,
    "",
  );
}
function route(method, expressPath, source) {
  return {
    method: method.toLowerCase(),
    path: expressPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
    expressPath,
    sources: [path.relative(backendRoot, source).replaceAll("\\", "/")],
  };
}
