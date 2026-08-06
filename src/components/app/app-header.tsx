import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import logo from "@/assets/bakery-logo.png.asset.json";
import { useStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "דף הבית" },
  { to: "/new-order", label: "הזמנה חדשה" },
  { to: "/orders", label: "ההזמנות שלי" },
  { to: "/recurring", label: "הזמנות קבועות" },
  { to: "/business", label: "פרטי העסק" },
  { to: "/contact", label: "יצירת קשר" },
] as const;

export function AppHeader({ children }: { children?: React.ReactNode | undefined }) {
  const [open, setOpen] = useState(false);
  const { business } = useStore();

  return (
    <header className="sticky top-0 z-20 bg-canvas shadow-header">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5 md:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="תפריט"
            onClick={() => setOpen(true)}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-transparent text-heading md:size-[38px]"
          >
            <Menu className="size-[18px]" strokeWidth={2.2} />
          </button>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">שלום,</div>
            <div className="text-xs font-semibold text-foreground md:text-[13px]">{business.name}</div>
          </div>
        </div>
        <Link to="/" className="flex min-w-0 items-center gap-2 no-underline">
          <div className="flex flex-col items-center text-xs leading-[1.25] font-bold whitespace-nowrap text-heading md:text-[13px]">
            <div>מאפיית</div>
            <div>שני האופים</div>
          </div>
          <img
            src={logo.url}
            alt="לוגו מאפיית שני האופים"
            className="size-[34px] shrink-0 object-contain md:size-[38px]"
          />
        </Link>
      </div>
      {children}
      {open ? <SideMenu onClose={() => setOpen(false)} /> : null}
    </header>
  );
}

function SideMenu({ onClose }: { onClose: () => void }) {
  const { resetDemoData } = useStore();
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="סגירת התפריט"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(32,21,24,0.5)]"
      />
      <nav className="relative me-0 ms-auto flex h-full w-[264px] flex-col bg-canvas p-4 shadow-header">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-heading">תפריט</span>
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
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "rounded-xl border border-border bg-card px-3.5 py-3 text-[13.5px] font-semibold text-foreground no-underline",
              )}
              activeProps={{ className: "border-primary bg-primary-soft text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            resetDemoData();
            onClose();
          }}
          className="mt-auto rounded-xl border border-border bg-transparent px-3.5 py-3 text-[12.5px] font-semibold text-muted-foreground"
        >
          איפוס נתוני הדמו
        </button>
      </nav>
    </div>
  );
}
