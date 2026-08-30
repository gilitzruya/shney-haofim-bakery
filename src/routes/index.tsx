import { createFileRoute, redirect } from "@tanstack/react-router";

/** אין דף בית ללקוח (החלטה 10) — הכניסה היא ישר לקטלוג/ניהול, בלי מסך ביניים. */
export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.auth?.role === "admin" ? "/admin" : "/catalog" });
  },
  component: () => null,
});
