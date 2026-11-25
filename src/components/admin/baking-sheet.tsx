import { ROUNDS, roundLabel, type RoundId } from "@/data/catalog";
import { isFriday, type DepartmentReport, type ProductionGroup } from "@/lib/admin/reports";
import { formatDate, formatWeekday } from "@/lib/format";

type RoundFilter = RoundId | "all";

interface SheetPage {
  key: string;
  title: string;
  groups: ProductionGroup[];
  /** סבב יחיד ← עמודת כמות אחת; "all" ← עמודה לכל סבב + סה״כ. */
  round: RoundFilter;
}

const qty = (n: number | undefined) =>
  !n ? "" : Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

/**
 * גיליון "דוח ייצור" להדפסה / שמירה כ-PDF — דף נפרד לכל מחלקה (PRD §4.10), כדי לחלק לכל מחלקה
 * רק את הדפים שלה. יום רגיל: דף אחד למחלקה עם עמודה לכל סבב. שישי: דף לכל סבב בכל מחלקה, כי
 * סבב ראשון נאפה בחמישי בלילה וסבב שני בשישי בבוקר.
 */
export function BakingSheet({
  date,
  reports,
  round,
}: {
  date: string;
  reports: DepartmentReport[];
  round: RoundFilter;
}) {
  const pages: SheetPage[] = reports.flatMap((report): SheetPage[] => {
    if (round !== "all") {
      return [
        {
          key: report.department,
          title: `${report.title} — ${roundLabel(round)}`,
          groups: report.groups,
          round,
        },
      ];
    }
    if (!isFriday(date))
      return [{ key: report.department, title: report.title, groups: report.groups, round }];
    return ROUNDS.map((r) => ({
      key: `${report.department}-${r.id}`,
      title: `${report.title} — שישי ${r.label}`,
      groups: report.groups
        .map((g) => ({ ...g, rows: g.rows.filter((row) => (row.byRound[r.id] ?? 0) > 0) }))
        .filter((g) => g.rows.length > 0),
      round: r.id,
    })).filter((p) => p.groups.length > 0);
  });

  const cell = "border border-black px-2 py-1 text-center text-[13px] tabular-nums";

  return (
    <div
      className="baking-sheet hidden print:block print:bg-white"
      dir="rtl"
      style={{ backgroundColor: "#fff" }}
    >
      {pages.map((page) => {
        const columns = page.round === "all" ? ROUNDS.length + 1 : 1;
        const rowsCount = page.groups.reduce((sum, g) => sum + g.rows.length, 0);
        return (
          <section key={page.key} className="break-after-page last:break-after-auto">
            <div className="mb-2 flex items-end justify-between border-b-2 border-black pb-1.5">
              <div className="text-[20px] font-bold text-black">{page.title}</div>
              <div className="text-[13px] text-black">
                מאפיית שני האופים · {formatWeekday(date)}, {formatDate(date)}
              </div>
            </div>

            <table className="w-full border-collapse text-black">
              <thead>
                <tr>
                  <th
                    className="border border-black px-2 py-1 text-right text-[13px] font-bold"
                    style={{ backgroundColor: "#e6e6e6" }}
                  >
                    מוצר (קוד)
                  </th>
                  {page.round === "all" ? (
                    <>
                      {ROUNDS.map((r) => (
                        <th
                          key={r.id}
                          className={`${cell} w-[70px] font-bold`}
                          style={{ backgroundColor: "#e6e6e6" }}
                        >
                          {r.label}
                        </th>
                      ))}
                      <th
                        className={`${cell} w-[70px] font-bold`}
                        style={{ backgroundColor: "#e6e6e6" }}
                      >
                        סה״כ
                      </th>
                    </>
                  ) : (
                    <th
                      className={`${cell} w-[90px] font-bold`}
                      style={{ backgroundColor: "#e6e6e6" }}
                    >
                      כמות
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {page.groups.map((group) => [
                  // כותרת קטגוריה: פס כהה עם טקסט לבן, כדי שלא תיראה כעוד שורת מוצר. המוצרים
                  // שמתחתיה מוזזים פנימה, כך שרואים מה שייך לאיזו קטגוריה.
                  <tr key={group.categoryId} className="break-inside-avoid break-after-avoid">
                    <td
                      colSpan={columns + 1}
                      className="border border-black px-2 pt-1.5 pb-1 text-right text-[14px] font-extrabold text-white"
                      style={{ backgroundColor: "#3a3a3a" }}
                    >
                      ▼ {group.categoryName}
                      <span className="ms-2 text-[11px] font-normal">
                        ({group.rows.length} מוצרים)
                      </span>
                    </td>
                  </tr>,
                  ...group.rows.map((row) => (
                    <tr key={row.productId} className="break-inside-avoid">
                      <td className="border border-black py-1 ps-5 pe-2 text-right text-[13px] font-bold">
                        {row.productName}
                        {row.sku ? (
                          <span className="ms-1 text-[11px] font-normal">({row.sku})</span>
                        ) : null}
                        {row.unit === "kg" ? (
                          <span className="ms-1 text-[11px] font-normal">ק״ג</span>
                        ) : null}
                      </td>
                      {page.round === "all" ? (
                        <>
                          {ROUNDS.map((r) => (
                            <td key={r.id} className={cell}>
                              {qty(row.byRound[r.id])}
                            </td>
                          ))}
                          <td className={`${cell} font-bold`}>{qty(row.qty)}</td>
                        </>
                      ) : (
                        <td className={`${cell} font-bold`}>{qty(row.byRound[page.round])}</td>
                      )}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
            <div className="mt-1 text-[11px] text-black">{rowsCount} מוצרים</div>
          </section>
        );
      })}
    </div>
  );
}
