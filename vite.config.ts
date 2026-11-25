import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// מזהה הגרסה של ה-build: ה-commit ב-Vercel, ובבנייה מקומית — זמן הבנייה. נצרב לקוד (__APP_VERSION__)
// ונכתב ל-/version.json, כדי שחלון פתוח יזהה שיצאה גרסה חדשה ויתרענן במעבר המסך הבא
// (components/app/version-watcher.tsx). מחושב פעם אחת — זהה בבניית הלקוח ובבניית השרת.
const APP_VERSION = process.env["VERCEL_GIT_COMMIT_SHA"] ?? `local-${Date.now()}`;

function versionFile(): Plugin {
  return {
    name: "app-version-file",
    apply: "build",
    generateBundle() {
      if (this.environment.name !== "client") return;
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: APP_VERSION }),
      });
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  server: { host: "::", port: 8080 },
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts wraps the generated SSR handler to render a branded error
      // page instead of a raw 500 when h3 swallows an unhandled throw.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    nitro({ preset: "vercel" }),
    viteReact(),
    versionFile(),
  ],
});
