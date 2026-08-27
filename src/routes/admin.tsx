import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (context.auth?.role !== "admin") {
      throw redirect({ to: "/catalog" });
    }
  },
  component: () => <Outlet />,
});
