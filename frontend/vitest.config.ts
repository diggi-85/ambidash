import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `@ambi/core` is a folder of this repository for now; the alias mirrors the `paths` entry in tsconfig.json
export default defineConfig({
  resolve: { alias: { "@ambi/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)) } },
  test: { include: ["test/**/*.test.ts", "packages/*/test/**/*.test.ts"], environment: "node" },
});
