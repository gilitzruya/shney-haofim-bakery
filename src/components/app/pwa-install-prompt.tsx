import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "./button";
import logo from "@/assets/bakery-logo.png";

const DISMISS_STORAGE_KEY = "bakery-pwa-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return !Number.isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

/** Custom in-app install banner — not the browser's default mini-infobar. */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3">
      <div className="flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-header">
        <img src={logo} alt="" aria-hidden className="size-10 shrink-0 rounded-xl object-contain" />
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[13px] font-bold text-foreground">התקינו את האפליקציה</div>
          <div className="text-[11.5px] text-muted-foreground">
            {showIosHint
              ? 'לחצו על "שיתוף" ואז "הוסף למסך הבית"'
              : "גישה מהירה להזמנות, ישירות ממסך הבית"}
          </div>
        </div>
        {showIosHint ? null : (
          <Button size="sm" onClick={install}>
            התקנה
          </Button>
        )}
        <button
          type="button"
          aria-label="סגירה"
          onClick={dismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-card-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
