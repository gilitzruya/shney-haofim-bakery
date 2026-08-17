import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/app-shell";
import logo from "@/assets/bakery-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { to: "/admin", label: "דף הבית" },
  { to: "/admin/orders", label: "הזמנות" },
  { to: "/admin/customers", label: "לקוחות" },
  { to: "/admin/products", label: "מוצרים" },
  { to: "/admin/reports/distribution", label: "דוח חלוקה" },
  { to: "/admin/reports/production", label: "דוח אפייה / ייצור" },
  { to: "/admin/documents", label: "מסמכים" },
  { to: "/admin/cutoff", label: "שעות סגירה" },
] as const;

/** מעטפת מסכי הניהול — נשענת על אותו קנבס ושפה ויזואלית של צד הלקוח. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <AdminHeader />
        {children}
      </div>
    </AppShell>
  );
}

function AdminHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-canvas shadow-header">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5 md:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="תפריט ניהול"
            onClick={() => setOpen(true)}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-transparent text-heading md:hidden"
          >
            <Menu className="size-[18px]" strokeWidth={2.2} />
          </button>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">ממשק ניהול</div>
            <div className="text-xs font-semibold text-foreground md:text-[13px]">מאפיית שני האופים</div>
          </div>
        </div>

        <nav className="hidden items-center gap-1.5 md:flex">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground no-underline"
              activeProps={{ className: "border-primary bg-primary-soft text-primary" }}
              activeOptions={{ exact: item.to === "/admin" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link to="/admin" className="flex min-w-0 items-center gap-2 no-underline">
          <img src={logo.url} alt="לוגו מאפיית שני האופים" className="size-[34px] shrink-0 object-contain md:size-[38px]" />
        </Link>
      </div>
      {open ? <AdminSideMenu onClose={() => setOpen(false)} /> : null}
    </header>
  );
}

function AdminSideMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="סגירת התפריט"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(32,21,24,0.5)]"
      />
      <nav className="relative me-0 ms-auto flex h-full w-[264px] flex-col bg-canvas p-4 shadow-header">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-heading">ניהול</span>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-[10px] border border-border text-heading"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "rounded-xl border border-border bg-card px-3.5 py-3 text-[13.5px] font-semibold text-foreground no-underline",
              )}
              activeProps={{ className: "border-primary bg-primary-soft text-primary" }}
              activeOptions={{ exact: item.to === "/admin" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
