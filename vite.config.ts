import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function apiPlugin() {
  return {
    name: "api-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api", async (req: any, res: any) => {
        try {
          const mod = await import("./api/index.ts");
          const handler = mod.default;
          handler(req, res);
        } catch (err: any) {
          console.error("API middleware error:", err);
          res.setHeader("Content-Type", "application/json");
          res.status(500).json({ error: err.message || "API error" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // base path for GitHub Pages (set via GITHUB_REPOSITORY env var in CI)
  base: process.env.GITHUB_REPOSITORY ? "/" + process.env.GITHUB_REPOSITORY.split("/")[1] + "/" : "/",
  server: {
    host: "0.0.0.0",
    hmr: false,
  },
});
