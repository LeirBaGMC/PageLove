import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { catalog } from "./api/catalog.mjs";
export default defineConfig(({ mode }) => {
  const settings = loadEnv(mode, process.cwd(), "");
  for (const key of ["EDITOR_KEY", "PRESENTATION_MODE", "CATALOG_FILE"])
    if (settings[key] && !process.env[key]) process.env[key] = settings[key];
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "mentatlas-catalog",
        configureServer(server) {
          server.middlewares.use(catalog);
        },
      },
    ],
  };
});
