import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

import type { RoundId } from "@/data/catalog";
import { useStore } from "@/store/app-store";


export const Route = createFileRoute("/new-order")({
  head: () => ({
    meta: [
      { title: "הזמנה חדשה — מאפיית שני האופים" },
      { name: "description", content: "פתיחת הזמנה סיטונאית חדשה, עם אפשרות להעתיק מההזמנה הקודמת." },
      { property: "og:title", content: "הזמנה חדשה — מאפיית שני האופים" },
      { property: "og:description", content: "העתיקו מוצרים מההזמנה הקודמת או התחילו הזמנה חדשה." },
    ],
  }),
  component: NewOrderPage,
});

const ROUND: RoundId = "morning";

function NewOrderPage() {
  const navigate = useNavigate();
  const doneRef = useRef(false);
  const { startOrderDraft, orders, draft, hydrated } = useStore();

  /** ההזמנה האחרונה עם מוצרים */
  const lastOrder = useMemo(
    () =>
      orders
        .filter((o) => o.lines.length > 0 && o.status !== "cancelled" && o.status !== "draft")
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [orders],
  );

  /** נכנסים ישר לקטלוג; אם יש הזמנה קודמת — נשאל שם, מעל הקטלוג */
  useEffect(() => {
    if (!hydrated || doneRef.current) return;
    doneRef.current = true;
    if (!draft) startOrderDraft(undefined, ROUND);
    navigate({
      to: "/catalog",
      search: draft || !lastOrder ? {} : { copy: 1 },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draft, lastOrder]);

  // Pure redirect step — render nothing so no intermediate screen flashes.
  return null;

}
