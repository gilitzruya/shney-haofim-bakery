import { ROUNDS } from "@/data/catalog";
import type { ProductionGroup } from "@/lib/admin/reports";
import { formatDate, formatWeekday } from "@/lib/format";

/**
 * גיליון "דוח אפייה" להדפסה / שמירה כ-PDF —
 * טבלה בסגנון הדוח הידני של המאפייה: שם מוצר + עמודה לכל סבב.
 */
export function BakingSheet({ date, groups }: { date: string; groups: ProductionGroup[] }) {
  const rows = groups.flatMap((g) => g.rows);

  return (
    <div
      className="baking-sheet hidden print:fixed print:inset-0 print:z-[999] print:block print:bg-white print:p-4"
      dir="rtl"
      style={{ backgroundColor: "#fff" }}
    >
      <div className="mb-3 text-center">
        <div className="text-[20px] font-bold text-black">דוח אפייה</div>
        <div className="text-[13px] text-black">
          מאפיית שני האופים · {formatWeekday(date)}, {formatDate(date)}
        </div>
      </div>

      <table className="w-full border-collapse text-black">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1.5 text-right text-[14px] font-bold">מוצר</th>
            {ROUNDS.map((r, i) => (
              <th key={r.id} className="border border-black px-2 py-1.5 text-center text-[14px] font-bold">
                {`סבב${i + 1}`}
              </th>
            ))}
            <th className="border border-black px-2 py-1.5 text-center text-[14px] font-bold">סה״כ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product.id}>
              <th className="border border-black px-2 py-1.5 text-right text-[14px] font-bold">
                {row.product.name}
              </th>
              {ROUNDS.map((r) => (
                <td key={r.id} className="border border-black px-2 py-1.5 text-center text-[14px] tabular-nums">
                  {row.byRound[r.id] ? row.byRound[r.id] : ""}
                </td>
              ))}
              <td className="border border-black px-2 py-1.5 text-center text-[14px] font-bold tabular-nums">
                {row.qty}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
