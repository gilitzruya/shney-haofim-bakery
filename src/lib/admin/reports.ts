import {
  catalogCategories,
  DEPARTMENTS,
  findProduct,
  ROUNDS,
  type DepartmentId,
  type RoundId,
  type Unit,
} from "@/data/catalog";
import type { AdminOrderView } from "@/hooks/use-orders";
import { parseDate } from "@/lib/format";

/** שישי: הייצור לשני הסבבים נעשה בזמנים שונים, ולכן דף נפרד לכל סבב (PRD §4.10). */
export function isFriday(iso: string): boolean {
  return parseDate(iso).getDay() === 5;
}

export interface ProductionRow {
  productId: string;
  productName: string;
  sku: string | null;
  unit: Unit;
  imageUrl: string | undefined;
  qty: number;
  byRound: Record<string, number>;
}

export interface ProductionGroup {
  categoryId: string;
  categoryName: string;
  rows: ProductionRow[];
  itemsCount: number;
}

/** סיכום כמויות הייצור ליום אספקה, מקובץ לפי קטגוריה. שם/קוד/יחידה מגיעים מה-snapshot
 * שנשמר בשורת ההזמנה (לא מהקטלוג החי) — קטגוריה, מחלקה ותמונה עדיין נגזרות מהקטלוג החי, כי
 * אלה לא נתונים שצריך "להקפיא" בזמן ההזמנה. רק מוצרים שהוזמנו נכנסים לדוח.
 * `department` — רק מוצרי המחלקה הזו (דוח מחלקה); בלעדיו — כל המוצרים. */
function buildProductionReport(
  views: AdminOrderView[],
  department?: DepartmentId | undefined,
): ProductionGroup[] {
  const totals = new Map<string, ProductionRow>();

  for (const view of views) {
    for (const line of view.order.lines) {
      if (line.qty <= 0) continue;
      const catalogProduct = findProduct(line.productId);
      if (!catalogProduct) continue; // אין קטגוריה חיה לשבץ אליה
      if (department && catalogProduct.department !== department) continue;
      const row =
        totals.get(line.productId) ??
        ({
          productId: line.productId,
          productName: line.productName,
          sku: line.sku,
          unit: line.unit,
          imageUrl: catalogProduct.imageUrl,
          qty: 0,
          byRound: {},
        } satisfies ProductionRow);
      row.qty += line.qty;
      row.byRound[view.order.round] = (row.byRound[view.order.round] ?? 0) + line.qty;
      totals.set(line.productId, row);
    }
  }

  return catalogCategories()
    .map((category) => {
      const rows = category.products
        .map((p) => totals.get(p.id))
        .filter((r): r is ProductionRow => Boolean(r));
      return {
        categoryId: category.id,
        categoryName: category.name,
        rows,
        itemsCount: rows.length,
      };
    })
    .filter((g) => g.rows.length > 0);
}

export interface DepartmentReport {
  department: DepartmentId;
  title: string;
  groups: ProductionGroup[];
}

/** דוח ייצור לכל מחלקה שיש בה מה לייצר — בלי `none` (מוצרים מוכנים לא מיוצרים). */
export function buildDepartmentReports(views: AdminOrderView[]): DepartmentReport[] {
  return DEPARTMENTS.filter((d) => d.id !== "none")
    .map((d) => ({ department: d.id, title: d.reportTitle, groups: buildProductionReport(views, d.id) }))
    .filter((r) => r.groups.length > 0);
}

export interface DistributionLine {
  productId: string;
  productName: string;
  sku: string | null;
  unit: Unit;
  imageUrl: string | undefined;
  qty: number;
}

export interface DistributionStop {
  view: AdminOrderView;
  lines: DistributionLine[];
}

export interface DistributionGroup {
  round: RoundId | string;
  stops: DistributionStop[];
  itemsCount: number;
  total: number;
}

/** דוח חלוקה: תחנות לפי סבב, לפי סדר א״ב של שם הלקוח. */
export function buildDistributionReport(views: AdminOrderView[]): DistributionGroup[] {
  const byRound = new Map<string, DistributionStop[]>();

  for (const view of views) {
    const lines: DistributionLine[] = [];
    for (const line of view.order.lines) {
      if (line.qty <= 0) continue;
      lines.push({
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        unit: line.unit,
        imageUrl: findProduct(line.productId)?.imageUrl,
        qty: line.qty,
      });
    }
    if (!lines.length) continue;
    const stops = byRound.get(view.order.round) ?? [];
    stops.push({ view, lines });
    byRound.set(view.order.round, stops);
  }

  return [...byRound.entries()].map(([round, stops]) => {
    stops.sort((a, b) => a.view.customerName.localeCompare(b.view.customerName, "he"));
    return {
      round,
      stops,
      itemsCount: stops.reduce((sum, s) => sum + s.lines.length, 0),
      total: stops.reduce((sum, s) => sum + s.view.total, 0),
    };
  });
}

/** כמות בדף הליקוט: שלם כמו שהוא, משקל עם ספרה אחת אחרי הנקודה ו"ק״ג". */
export function pickingQty(qty: number, unit: "unit" | "kg"): string {
  const n = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 10) / 10);
  return unit === "kg" ? `${n} ק״ג` : n;
}

export interface PickingLine {
  key: string;
  customerCode: string | null;
  customerName: string;
  branchName: string | null;
  note: string | null;
  qty: number;
}

export interface PickingProduct {
  productId: string;
  productName: string;
  sku: string | null;
  unit: Unit;
  categoryName: string;
  department: DepartmentId;
  total: number;
  lines: PickingLine[];
}

export interface PickingRound {
  round: RoundId;
  products: PickingProduct[];
  customersCount: number;
}

/**
 * דף ליקוט להעמסה (PRD §4.11): לכל סבב — מוצר אחרי מוצר, ובכל מוצר הלקוחות שהזמינו אותו.
 * המוצרים לפי מחלקה (סדר DEPARTMENTS) ואז לפי סדר הקטלוג; הלקוחות לפי קוד לקוח — אותו סדר
 * בכל המוצרים, כדי שהארגזים יעמדו באותו סדר. שתי הזמנות של אותו לקוח ואותו סניף מתאחדות לשורה.
 * מוצר שנמחק מהקטלוג אחרי שהוזמן עדיין צריך להיות מועמס — הוא בסוף, תחת "אחר".
 */
export function buildPickingReport(views: AdminOrderView[]): PickingRound[] {
  const catalogOrder = new Map<string, { index: number; categoryName: string }>();
  let index = 0;
  for (const category of catalogCategories()) {
    for (const p of category.products) catalogOrder.set(p.id, { index: index++, categoryName: category.name });
  }
  const departmentRank = (id: DepartmentId) => DEPARTMENTS.findIndex((d) => d.id === id);

  const byRound = new Map<RoundId, Map<string, PickingProduct>>();
  const customersByRound = new Map<RoundId, Set<string>>();
  for (const view of views) {
    const round = view.order.round;
    const products = byRound.get(round) ?? new Map<string, PickingProduct>();
    byRound.set(round, products);
    const key = `${view.order.customerId}|${view.order.branch?.id ?? ""}`;
    for (const line of view.order.lines) {
      if (line.qty <= 0) continue;
      const catalogProduct = findProduct(line.productId);
      const product =
        products.get(line.productId) ??
        ({
          productId: line.productId,
          productName: line.productName,
          sku: line.sku,
          unit: line.unit,
          categoryName: catalogOrder.get(line.productId)?.categoryName ?? "אחר",
          department: catalogProduct?.department ?? "none",
          total: 0,
          lines: [],
        } satisfies PickingProduct);
      products.set(line.productId, product);
      product.total += line.qty;
      const existing = product.lines.find((l) => l.key === key);
      if (existing) {
        existing.qty += line.qty;
        if (view.order.note && existing.note !== view.order.note)
          existing.note = existing.note ? `${existing.note} · ${view.order.note}` : view.order.note;
      } else {
        product.lines.push({
          key,
          customerCode: view.customerCode,
          customerName: view.customerName,
          branchName: view.order.branch?.name ?? null,
          note: view.order.note,
          qty: line.qty,
        });
      }
      const customers = customersByRound.get(round) ?? new Set<string>();
      customers.add(key);
      customersByRound.set(round, customers);
    }
  }

  const codeOf = (l: PickingLine) => Number(l.customerCode ?? Number.MAX_SAFE_INTEGER);
  const order = (p: PickingProduct) => catalogOrder.get(p.productId)?.index ?? Number.MAX_SAFE_INTEGER;

  return [...byRound.entries()]
    .filter(([, products]) => products.size > 0)
    .sort(([a], [b]) => ROUNDS.findIndex((r) => r.id === a) - ROUNDS.findIndex((r) => r.id === b))
    .map(([round, products]) => {
      const list = [...products.values()].sort((a, b) => {
        // מוצר שנמחק מהקטלוג (אין לו סדר) — בסוף, אחרי כל המחלקות.
        const aKnown = catalogOrder.has(a.productId) ? 0 : 1;
        const bKnown = catalogOrder.has(b.productId) ? 0 : 1;
        return (
          aKnown - bKnown ||
          departmentRank(a.department) - departmentRank(b.department) ||
          order(a) - order(b) ||
          a.productName.localeCompare(b.productName, "he")
        );
      });
      for (const p of list)
        p.lines.sort((a, b) => codeOf(a) - codeOf(b) || a.customerName.localeCompare(b.customerName, "he"));
      return {
        round,
        products: list,
        customersCount: customersByRound.get(round)?.size ?? 0,
      };
    });
}
