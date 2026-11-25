/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** מזהה ה-build הנוכחי (vite.config.ts): ה-commit ב-Vercel, או זמן הבנייה מקומית. */
declare const __APP_VERSION__: string;
