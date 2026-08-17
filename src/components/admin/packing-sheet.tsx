import { roundLabel } from "@/data/catalog";
import type { DistributionGroup } from "@/lib/admin/reports";
import { formatDate, formatWeekday } from "@/lib/format";

/**
 * גיליון "דוח חלוקה / אריזה" להדפסה — מטריצה בסגנון הגיליון הידני:
 * שורה לכל לקוח, עמודה לכל מוצר, ושורת סה״כ בתחתית.
 */
export function PackingSheet({ date, groups }: { date: string; groups: DistributionGroup[] }) {
  return (
    <div
      className="packing-sheet hidden print:block print:bg-white"
      dir="rtl"
      style={{ backgroundColor: "#fff" }}
    >
      <div className="mb-2 text-center">
        <div className="text-[18px] font-bold text-black">דוח חלוקה / אריזה</div>
        <div className="text-[12px] text-black">
          מאפיית שני האופים · {formatWeekday(date)}, {formatDate(date)}
        </div>
      </div>

      {groups.map((group) => (
        <RoundMatrix key={group.round} group={group} />
      ))}
    </div>
  );
}

function RoundMatrix({ group }: { group: DistributionGroup }) {
  // עמודות = כל המוצרים שמופיעים בסבב, לפי סדר הופעה בקטלוג
  const productMap = new Map<string, { name: string; code?: string | undefined }>();
  for (const stop of group.stops) {
    for (const line of stop.lines) {
      if (!productMap.has(line.product.id)) {
        productMap.set(line.product.id, { name: line.product.name, code: line.product.sku });
      }
    }
  }
  const products = [...productMap.entries()].map(([id, p]) => ({ id, ...p }));

  const qtyOf = (stopIndex: number, productId: string) => {
    const stop = group.stops[stopIndex];
    if (!stop) return 0;
    return stop.lines.find((l) => l.product.id === productId)?.qty ?? 0;
  };

  const columnTotals = products.map((p) =>
    group.stops.reduce(
      (sum, stop) => sum + (stop.lines.find((l) => l.product.id === p.id)?.qty ?? 0),
      0,
    ),
  );

  const cell = "border border-black px-1.5 py-1 text-center text-[11px] tabular-nums";
  const head = "border border-black px-1.5 py-1 text-center text-[11px] font-bold";

  return (
    <section className="mb-4 break-inside-avoid">
      <div className="mb-1 text-[13px] font-bold text-black">
        {roundLabel(group.round)} · {group.stops.length} לקוחות
      </div>
      <table className="w-full border-collapse text-black">
        <thead>
          <tr>
            <th className={`${head} text-right`} colSpan={2} style={{ backgroundColor: "#d8d8d8" }}>
              קוד מוצר
            </th>
            {products.map((p) => (
              <th key={p.id} className={head} style={{ backgroundColor: "#d8d8d8" }}>
                {p.code ?? ""}
              </th>
            ))}
          </tr>
          <tr>
            <th className={`${head} text-right`} style={{ backgroundColor: "#e8e8e8" }}>
              קוד
            </th>
            <th className={`${head} text-right`} style={{ backgroundColor: "#e8e8e8" }}>
              לקוח
            </th>
            {products.map((p) => (
              <th key={p.id} className={head} style={{ backgroundColor: "#e8e8e8" }}>
                <span className="block leading-tight">{p.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.stops.map((stop, i) => {
            return (
              <tr key={stop.view.order.id}>
                <td className={`${cell} font-bold`}>{stop.view.customer?.code ?? ""}</td>
                <th className={`${head} text-right`}>{stop.view.customerName}</th>
                {products.map((p) => {
                  const qty = qtyOf(i, p.id);
                  return (
                    <td key={p.id} className={cell}>
                      {qty ? qty : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <th className={`${head} text-right`} colSpan={2} style={{ backgroundColor: "#fbd9ef" }}>
              סה״כ
            </th>
            {columnTotals.map((total, i) => (
              <td
                key={products[i]?.id ?? i}
                className={`${cell} font-bold`}
                style={{ backgroundColor: "#fbd9ef" }}
              >
                {total ? total : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}
