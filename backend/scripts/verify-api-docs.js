import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRoutes } from "./lib/discover-routes.js";
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const spec=JSON.parse(fs.readFileSync(path.join(projectRoot,"docs/openapi.yaml"),"utf8"));
const registered=new Set(discoverRoutes().map(route=>`${route.method} ${route.path}`));
const documented=new Set();const duplicates=[];
for(const [routePath,methods] of Object.entries(spec.paths||{})){for(const method of Object.keys(methods)){if(["get","post","put","patch","delete"].includes(method)){const key=`${method} ${routePath}`;if(documented.has(key))duplicates.push(key);documented.add(key);}}}
const missing=[...registered].filter(key=>!documented.has(key)),extra=[...documented].filter(key=>!registered.has(key));
for(const value of missing)console.error(`Registered route missing from OpenAPI: ${value}`);for(const value of extra)console.error(`OpenAPI route missing from application: ${value}`);for(const value of duplicates)console.error(`Duplicate route documentation: ${value}`);
if(missing.length||extra.length||duplicates.length)process.exitCode=1;else console.log(`API documentation verified: ${registered.size} registered routes match OpenAPI exactly.`);
