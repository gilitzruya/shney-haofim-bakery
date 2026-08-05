import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/** The mobile-first app canvas used by every screen in the handoff. */
export function AppShell({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div dir="rtl" lang="he" className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-canvas md:max-w-[834px] lg:max-w-[1120px]">
        {children}
      </div>
    </div>
  );
}

export function PageTitleBar({
  title,
  backTo,
  onBack,
}: {
  title: string;
  backTo?: string;
  onBack?: (() => void) | undefined;
}) {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-3.5 pt-0.5 pb-3 md:px-5">
      <button
        type="button"
        aria-label="חזרה"
        onClick={() => (onBack ? onBack() : backTo ? router.navigate({ to: backTo }) : router.history.back())}
        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground"
      >
        <ChevronLeft className="size-4 rotate-180" />
      </button>
      <h1 className="text-[19px] font-bold text-foreground">{title}</h1>
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <div className={cn("mx-auto w-full max-w-5xl flex-1 px-3.5 md:px-5", className)}>{children}</div>;
}
