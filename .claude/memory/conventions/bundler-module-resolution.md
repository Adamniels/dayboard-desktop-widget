---
name: bundler-module-resolution
description: The monorepo uses TypeScript "bundler" moduleResolution with extensionless internal relative imports
type: convention
---

Internal relative imports across the monorepo are **extensionless** (`import { project }
from "./project"`, not `"./project.js"`). `tsconfig.base.json` sets
`moduleResolution: "bundler"`, and every package is consumed through a bundler or
transpiler (Vite for the frontends, tsx for the api, esbuild inside vitest and
drizzle-kit), never executed as raw Node ESM where file extensions are mandatory.

**Why:** drizzle-kit drove the decision. It bundles the shared schema and resolves the
literal import specifier; with `.js` specifiers pointing at `.ts` source it failed with
`Cannot find module './project.js'`. Extensionless specifiers resolve correctly under
every tool here and keep one consistent style. `verbatimModuleSyntax` is on, so
type-only imports must still use `import type`.

**How to apply:** Write internal relative imports without a file extension. Do not add
`.js` to relative specifiers to "fix" an import. Keep `moduleResolution: "bundler"` in
the base tsconfig. If a package ever needs to run as plain Node ESM (no bundler), that
package, and only it, would switch to `NodeNext` with explicit `.js` extensions.
Related: [[stack-typescript-monorepo]], [[core-stays-pure]].
