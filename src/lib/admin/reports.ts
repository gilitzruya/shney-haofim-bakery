import { catalogCategories, findProduct, type Product, type RoundId } from "@/data/catalog";
import type { AdminOrderView } from "@/lib/admin/selectors";

export interface ProductionRow {
  product: Product;
  qty: number;
  byRound: Record<string, number>;
}

export interface ProductionGroup {
  categoryId: string;
  categoryName: string;
  rows: ProductionRow[];
  itemsCount: number;
}

/** סיכום כמויות הייצור ליום אספקה, מקובץ לפי קטגוריה. */
export function buildProductionReport(views: AdminOrderView[]): ProductionGroup[] {
  const totals = new Map<string, ProductionRow>();

  for (const view of views) {
    for (const line of view.order.lines) {
      if (line.qty <= 0) continue;
      const product = findProduct(line.productId);
      if (!product) continue;
      const row = totals.get(product.id) ?? { product, qty: 0, byRound: {} };
      row.qty += line.qty;
      row.byRound[view.order.round] = (row.byRound[view.order.round] ?? 0) + line.qty;
      totals.set(product.id, row);
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
  product: Product;
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
      const product = findProduct(line.productId);
      if (!product) continue;
      lines.push({ product, qty: line.qty });
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
