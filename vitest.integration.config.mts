import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/** Tests d'intégration Supabase (projet de test) : `npm run test:integration`. Exclus de `npm test`. */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.ts"],
    testTimeout: 30000,
  },
});
