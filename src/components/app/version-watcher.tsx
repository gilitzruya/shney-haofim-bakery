import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useRecurringDraft } from "@/store/recurring-draft";

/** כל כמה זמן חלון פתוח בודק אם יצאה גרסה חדשה (בנוסף לבדיקה כשחוזרים לחלון). */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
/** הגרסה שכבר רועננה אליה בלשונית הזו — מונע לולאת רענונים אם הבדיקה מתבלבלת. */
const RELOADED_KEY = "reloadedForVersion";
/** מתי רועננו בגלל קובץ קוד חסר — רענון אחד לדקה לכל היותר. */
const PRELOAD_RELOAD_KEY = "preloadErrorReloadAt";

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // בלי sessionStorage (חלון פרטי חסום) — עדיין מרעננים, רק בלי ההגנה מלולאה בין טעינות.
  }
}

/**
 * רענון בטוח לגרסה חדשה. האפליקציה טוענת את הקוד פעם אחת, ומעבר בין מסכים לא טוען את הדף
 * מחדש — לכן חלון שנשאר פתוח בזמן פריסה ממשיך לרוץ על הגרסה הישנה, ועלול להיתקע כשהוא מבקש
 * קובץ קוד של הגרסה הישנה שכבר לא קיים בשרת (25.11: דף הבית הציג אפסים עד Ctrl+Shift+R).
 *
 * כשמזוהה גרסה חדשה (`/version.json` ≠ `__APP_VERSION__`) — לא מרעננים באמצע מסך. במעבר המסך
 * הבא טוענים את הדף מחדש בכתובת היעד, ורק כשזה בטוח:
 * - אין שמירה בתהליך (אישור הזמנה, הפקת תעודות, שמירת הערה ב-blur…) — אחרת מחכים למעבר הבא.
 * - אין טיוטת הזמנה קבועה פתוחה — היא נשמרת רק בזיכרון ועוברת בין מסכים.
 * עריכה שלא נשמרה בתוך מסך (כמויות בעריכת הזמנה, טופס מוצר) הולכת לאיבוד ממילא כשעוזבים את
 * המסך, אז הרענון במעבר לא מוסיף סיכון. רענון אחד לכל גרסה בלשונית.
 */
export function VersionWatcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft } = useRecurringDraft();
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const newVersionRef = useRef<string | null>(null);

  useEffect(() => {
    // בפיתוח אין version.json, וכל שמירה של קובץ היא "גרסה" — הבדיקה רק בבנייה.
    if (!import.meta.env.PROD) return;

    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const body: unknown = await res.json();
        const version =
          typeof body === "object" && body !== null && "version" in body && typeof body.version === "string"
            ? body.version
            : null;
        if (!cancelled && version && version !== __APP_VERSION__) newVersionRef.current = version;
      } catch {
        // בלי רשת — ננסה בבדיקה הבאה.
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const unsubscribe = router.subscribe("onBeforeNavigate", (event) => {
      const version = newVersionRef.current;
      // רק מעבר למסך אחר — לא שינוי פרמטרים באותו מסך (למשל דפדוף בין ימים ברשימת ההזמנות).
      if (!version || !event.pathChanged) return;
      if (queryClient.isMutating() > 0 || draftRef.current) return;
      if (readSession(RELOADED_KEY) === version) return;
      writeSession(RELOADED_KEY, version);
      window.location.assign(event.toLocation.href);
    });

    // רשת ביטחון: קובץ קוד של מסך לא נמצא (הגרסה הישנה מבקשת קובץ שנמחק בפריסה) — טעינה מחדש
    // במקום מסך תקוע. Vite שולח את האירוע הזה בדיוק למקרה הזה.
    const onPreloadError = (event: Event) => {
      const last = Number(readSession(PRELOAD_RELOAD_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      writeSession(PRELOAD_RELOAD_KEY, String(Date.now()));
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreloadError);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
      window.removeEventListener("vite:preloadError", onPreloadError);
    };
  }, [router, queryClient]);

  return null;
}
