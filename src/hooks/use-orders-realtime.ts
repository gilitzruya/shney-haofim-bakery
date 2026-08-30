import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** מזרים עדכוני `orders` בזמן אמת לפיד "הזמנות שנכנסו היום" בדף הבית של הניהול
 * (PRD §4.1/§8.2, החלטה 21) — לא polling על טיימר. בנוסף לאירועי ה-Realtime עצמם:
 * רענון חד-פעמי כשהטאב חוזר לפוקוס, וכשהחיבור מתחבר מחדש אחרי ניתוק — תופס בדיוק את
 * מקרי הכשל (טלפון נרדם, ניתוק רשת זמני) בלי לירות בקשות מיותרות ברקע ללא הפסקה. */
export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    setLastUpdatedAt(nowHHMM());
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { refresh, lastUpdatedAt };
}
