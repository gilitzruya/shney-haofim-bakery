import { departmentLabel, roundLabel, type DepartmentId, type RoundId } from "@/data/catalog";
import {
  pickingQty,
  type PickingLine,
  type PickingProduct,
  type PickingRound,
} from "@/lib/admin/reports";
import { formatDate, formatWeekday } from "@/lib/format";

/** שם לקוח קצר לדף צפוף — בלי סיומת "בע״מ", שלא עוזרת לזהות את הארגז. */
function shortName(name: string): string {
  return name
    .replace(/\s*בע["״]?מ\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface PickingPage {
  key: string;
  round: RoundId;
  /** כותרת משנה לדף העוגות; null בדף הראשי של הסבב. */
  subtitle: string | null;
  products: PickingProduct[];
}

/**
 * גיליון "דף ליקוט להעמסה" להדפסה (PRD §4.11) — לרוחב, 4 טורים, כדי שסבב שלם ייכנס בדף אחד.
 * הפועל עובר מוצר אחרי מוצר ומחלק לכל לקוח את הכמות שלו; ☐ לסימון מה שהוכן. דף נפרד לכל סבב,
 * ובתוך הסבב מוצרי "עוגות ומאפים" בדף משלהם — מחלקת העוגות מכינה אותם בנפרד.
 * הכיוון לרוחב מוגדר ב-styles.css (`@page picking`) — רק לגיליון הזה, שאר ההדפסות נשארות לאורך.
 */
export function PickingSheet({ date, rounds }: { date: string; rounds: PickingRound[] }) {
  const pages: PickingPage[] = rounds.flatMap((round): PickingPage[] => {
    const main = round.products.filter((p) => p.department !== "cakes");
    const cakes = round.products.filter((p) => p.department === "cakes");
    const all: PickingPage[] = [
      { key: `${round.round}-main`, round: round.round, subtitle: null, products: main },
      {
        key: `${round.round}-cakes`,
        round: round.round,
        subtitle: departmentLabel("cakes"),
        products: cakes,
      },
    ];
    return all.filter((page) => page.products.length > 0);
  });

  return (
    <div
      className="picking-sheet hidden print:block print:bg-white"
      dir="rtl"
      style={{ backgroundColor: "#fff" }}
    >
      {pages.map((page) => {
        let department: DepartmentId | null = null;
        let category: string | null = null;
        const customersCount = new Set(page.products.flatMap((p) => p.lines.map((l) => l.key)))
          .size;
        const linesCount = page.products.reduce((sum, p) => sum + p.lines.length, 0);
        return (
          <section key={page.key} className="break-after-page text-black last:break-after-auto">
            <div className="mb-1 flex items-center justify-between border-b-2 border-black pb-0.5">
              <div className="flex items-baseline gap-3">
                <span className="text-[16px] font-bold">
                  דף ליקוט להעמסה{page.subtitle ? ` — ${page.subtitle}` : ""}
                </span>
                <span className="text-[11.5px] font-bold">
                  {formatWeekday(date)}, {formatDate(date)} · {roundLabel(page.round)}
                </span>
              </div>
              <div className="flex items-center gap-3.5 text-[10px]">
                <span>
                  {page.products.length} מוצרים · {customersCount} לקוחות · {linesCount} שורות
                </span>
                <span className="flex items-center gap-1">
                  <CheckBox /> = הוכן
                </span>
              </div>
            </div>

            <div className="columns-4 gap-[9px]" style={{ columnRule: "1px solid #ccc" }}>
              {page.products.map((product) => {
                // כותרת מחלקה כשהמחלקה מתחלפת (אותה קטגוריה יכולה להופיע בשתי מחלקות, למשל בגט),
                // וכותרת קטגוריה כשהקטגוריה מתחלפת בתוך המחלקה.
                const newDepartment = product.department !== department;
                const departmentHeader = newDepartment ? (
                  <div className="mb-0.5 border-b-2 border-black text-[11.5px] font-extrabold">
                    {product.department === "none"
                      ? "מוצרים מוכנים"
                      : departmentLabel(product.department)}
                  </div>
                ) : null;
                const categoryHeader =
                  newDepartment || product.categoryName !== category ? (
                    <div
                      className="mb-0.5 px-1 text-[10.5px] font-bold text-white"
                      style={{ backgroundColor: "#444" }}
                    >
                      {product.categoryName}
                    </div>
                  ) : null;
                department = product.department;
                category = product.categoryName;
                return (
                  <div key={product.productId} className="break-inside-avoid">
                    {departmentHeader}
                    {categoryHeader}
                    <div className="mb-[3px] border border-[#777]">
                      <div
                        className="flex justify-between gap-1 border-b border-[#777] px-1 text-[11px] leading-[1.3] font-bold"
                        style={{ backgroundColor: "#e4e4e4" }}
                      >
                        <span className="whitespace-nowrap">
                          {product.productName}
                          {product.sku ? (
                            <span
                              className="ms-1 text-[9.5px] font-normal"
                              style={{ color: "#555" }}
                            >
                              ({product.sku})
                            </span>
                          ) : null}
                        </span>
                        <span className="whitespace-nowrap">
                          {pickingQty(product.total, product.unit)}
                          {product.lines.length > 1 ? (
                            <span className="text-[9.5px] font-normal" style={{ color: "#555" }}>
                              {" "}
                              · {product.lines.length} לק׳
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <table className="w-full table-fixed border-collapse">
                        <tbody>
                          {product.lines.map((line) => (
                            <PickingRow key={line.key} line={line} unit={product.unit} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PickingRow({ line, unit }: { line: PickingLine; unit: "unit" | "kg" }) {
  const cell =
    "overflow-hidden px-[3px] text-[10.5px] leading-[1.25] text-ellipsis whitespace-nowrap";
  return (
    <>
      <tr className="border-t border-[#e2e2e2] first:border-t-0">
        <td className={`${cell} w-[14px] pe-0`}>
          <CheckBox />
        </td>
        <td className={`${cell} w-[32px] text-[9.5px]`} style={{ color: "#555" }}>
          {line.customerCode ?? ""}
        </td>
        <td className={cell}>
          {line.branchName ? <b>{line.branchName} · </b> : null}
          {shortName(line.customerName)}
        </td>
        <td className={`${cell} w-[50px] text-center font-bold`}>{pickingQty(line.qty, unit)}</td>
      </tr>
      {line.note ? (
        <tr>
          <td />
          <td
            colSpan={3}
            className="px-[3px] pb-0.5 text-[9.5px] leading-[1.2]"
            style={{ color: "#7a5200" }}
          >
            הערה: {line.note}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CheckBox() {
  return <span className="inline-block size-[9px] border-[1.2px] border-black align-[-1px]" />;
}
