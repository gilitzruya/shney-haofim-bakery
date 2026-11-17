import { STATUS_LABELS } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import type { Order } from "@/hooks/use-orders";
import { formatLongDate, formatPrice, formatQty, orderNumberLabel } from "@/lib/format";

/**
 * גיליון הזמנה ללקוח להדפסה / שמירה כ-PDF (מוסתר במסך, מוצג רק בהדפסה) —
 * באותו סגנון של גיליונות הניהול: רקע לבן, טבלה עם גבול שחור.
 */
export function OrderSheet({
  order,
  customerName,
  showRound,
}: {
  order: Order;
  customerName: string;
  /** סבב מוצג רק ללקוח שמורשה ליותר מסבב אחד — לאחרים הוא חסר משמעות. */
  showRound: boolean;
}) {
  const total = order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const cell = "border border-black px-2 py-1 text-[12px] tabular-nums";
  const head = "border border-black px-2 py-1 text-[12px] font-bold";

  return (
    <div
      className="order-sheet hidden print:block print:bg-white"
      dir="rtl"
      style={{ backgroundColor: "#fff" }}
    >
      <div className="mb-3 text-center text-black">
        <div className="text-[20px] font-bold">מאפיית שני האופים</div>
        <div className="text-[14px] font-bold">{orderNumberLabel(order.number)}</div>
      </div>

      <div className="mb-3 space-y-0.5 text-[13px] text-black">
        <div>
          <span className="font-bold">לקוח: </span>
          {customerName}
        </div>
        <div>
          <span className="font-bold">מועד אספקה: </span>
          {order.date ? formatLongDate(order.date) : "טרם נבחר"}
          {showRound ? ` · ${roundLabel(order.round)}` : null}
        </div>
        <div>
          <span className="font-bold">סטטוס: </span>
          {STATUS_LABELS[order.status]}
        </div>
      </div>

      <table className="w-full border-collapse text-black">
        <thead>
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th className={`${head} text-right`}>קוד</th>
            <th className={`${head} text-right`}>מוצר</th>
            <th className={`${head} text-center`}>כמות</th>
            <th className={`${head} text-center`}>מחיר ליחידה</th>
            <th className={`${head} text-center`}>סה״כ</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.productId}>
              <td className={cell}>{line.sku ?? ""}</td>
              <td className={cell}>{line.productName}</td>
              <td className={`${cell} text-center`}>{formatQty(line.qty, line.unit)}</td>
              <td className={`${cell} text-center`}>{formatPrice(line.unitPrice)}</td>
              <td className={`${cell} text-center`}>{formatPrice(line.unitPrice * line.qty)}</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: "#e8e8e8" }}>
            <th className={`${head} text-right`} colSpan={4}>
              סה״כ (לפני מע״מ)
            </th>
            <td className={`${cell} text-center font-bold`}>{formatPrice(total)}</td>
          </tr>
        </tbody>
      </table>

      {order.note ? (
        <div className="mt-3 text-[13px] text-black">
          <span className="font-bold">הערה למאפייה: </span>
          {order.note}
        </div>
      ) : null}
    </div>
  );
}
