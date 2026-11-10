// Bundles the frontend into custom_components/ambidash/frontend/ambidash.js.
// The bundle is committed (HACS installs from the repository); CI fails when it is out of date.
import { build, context } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const options = {
  // The dashboards' script stays small; the Studio has its own that loads only when its panel is opened
  entryPoints: { ambidash: join(root, "src", "main.ts"), studio: join(root, "src", "studio", "main.ts") },
  outdir: join(root, "..", "custom_components", "ambidash", "frontend"),
  bundle: true,
  format: "esm",
  target: "es2021",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  legalComments: "none",
  logLevel: "info",
};

if (watch) await (await context(options)).watch();
else await build(options);
