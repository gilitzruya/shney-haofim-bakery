import { catalogCategories, findProduct, type RoundId, type Unit } from "@/data/catalog";
import type { AdminOrderView } from "@/hooks/use-orders";

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
 * שנשמר בשורת ההזמנה (לא מהקטלוג החי) — קטגוריה ותמונה עדיין נגזרות מהקטלוג החי, כי
 * אלה לא נתונים שצריך "להקפיא" בזמן ההזמנה. */
export function buildProductionReport(views: AdminOrderView[]): ProductionGroup[] {
  const totals = new Map<string, ProductionRow>();

  for (const view of views) {
    for (const line of view.order.lines) {
      if (line.qty <= 0) continue;
      const catalogProduct = findProduct(line.productId);
      if (!catalogProduct) continue; // אין קטגוריה חיה לשבץ אליה
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
