import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppStoreProvider } from "@/store/app-store";
import { RecurringDraftProvider } from "@/store/recurring-draft";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/app/pwa-install-prompt";
import { getAuthContext } from "@/lib/auth/auth-context";
import { useCatalog } from "@/hooks/use-catalog";

const LOGIN_PATH = "/login";
const roleHome = (role: "customer" | "admin") => (role === "admin" ? "/admin" : "/catalog");

function NotFoundComponent() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-heading">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">הדף לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">הדף שחיפשתם אינו קיים או הועבר.</p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground no-underline"
          >
            חזרה לדף הבית
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">הדף לא נטען</h1>
        <p className="mt-2 text-sm text-muted-foreground">משהו השתבש. אפשר לנסות שוב או לחזור לדף הבית.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            נסו שוב
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground no-underline"
          >
            לדף הבית
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const result = await getAuthContext();

    if (result.status !== "ok") {
      if (location.pathname !== LOGIN_PATH) {
        const search: { redirect: string; error?: "no-access" } = { redirect: location.href };
        if (result.status === "no-access") search.error = "no-access";
        throw redirect({ to: LOGIN_PATH, search });
      }
      return { auth: null };
    }

    if (location.pathname === LOGIN_PATH) {
      throw redirect({ to: roleHome(result.role) });
    }

    const { status: _status, ...auth } = result;
    return { auth };
  },

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "מאפיית שני האופים — הזמנות סיטונאיות" },
      {
        name: "description",
        content: "מערכת הזמנות סיטונאית של מאפיית שני האופים ללקוחות עסקיים.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#8E3B5B" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** אין דף שלא צריך אותו: `findProduct`/`linesTotal` (`data/catalog.ts`, `lib/format.ts`)
 * נצרכים סינכרונית מחוץ ל-React בכל מסלול (הזמנות, דוחות...), לא רק בדפי הקטלוג עצמם —
 * לכן אינדקס ה-runtime חייב להיטען פעם אחת ברמת ה-root, בלי תלות באיזה מסך נטען ראשון. */
function CatalogSync() {
  useCatalog();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <RecurringDraftProvider>
          <CatalogSync />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="bottom-center" dir="rtl" />
          <PwaInstallPrompt />
        </RecurringDraftProvider>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}
