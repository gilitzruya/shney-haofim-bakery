import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/chip";
import { FormField, TextInput } from "@/components/app/form-controls";
import type { Product, Unit } from "@/data/catalog";
import { formatPrice, unitLabel } from "@/lib/format";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/admin/products/$categoryId")({
  head: () => ({
    meta: [
      { title: "מוצרי קטגוריה — ניהול המאפייה" },
      { name: "description", content: "עריכת מוצרי הקטגוריה: מחיר, זמינות והוספת מוצר חדש." },
      { property: "og:title", content: "מוצרי קטגוריה — ניהול המאפייה" },
      { property: "og:description", content: "עריכת מוצרי הקטגוריה: מחיר, זמינות והוספת מוצר חדש." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCategoryPage,
});

function AdminCategoryPage() {
  const { categoryId } = Route.useParams();
  const { catalog, hydrated, updateProduct, addProduct, removeProduct } = useStore();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const category = catalog.find((c) => c.id === categoryId);

  const products = useMemo(() => {
    const q = query.trim();
    const list = category?.products ?? [];
    return q ? list.filter((p) => p.name.includes(q)) : list;
  }, [category, query]);

  if (!hydrated) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10" />
      </AdminShell>
    );
  }

  if (!category) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10">
          <EmptyState title="הקטגוריה לא נמצאה" description="ייתכן שהקטגוריה נמחקה." />
        </Section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary no-underline"
        >
          <ChevronRight className="size-4" />
          חזרה לקטגוריות
        </Link>

        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="text-[19px] font-bold text-heading">{category.name}</h1>
          <Button size="sm" variant={adding ? "ghost" : "primary"} onClick={() => setAdding((a) => !a)}>
            <Plus className="size-4" />
            {adding ? "ביטול" : "מוצר חדש"}
          </Button>
        </div>

        {adding ? (
          <NewProductForm
            onCancel={() => setAdding(false)}
            onCreate={(product) => {
              addProduct(category.id, product);
              setAdding(false);
            }}
          />
        ) : null}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר בקטגוריה"
            aria-label="חיפוש מוצר"
            className="pe-9"
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {products.length === 0 ? (
            <EmptyState title="אין מוצרים להצגה" description="אפשר להוסיף מוצר חדש לקטגוריה." />
          ) : (
            products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onUpdate={(patch) => updateProduct(p.id, patch)}
                onRemove={() => removeProduct(p.id)}
              />
            ))
          )}
        </div>
      </Section>
    </AdminShell>
  );
}

function ProductRow({
  product,
  onUpdate,
  onRemove,
}: {
  product: Product;
  onUpdate: (patch: Partial<Omit<Product, "id">>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price.toFixed(2));

  const save = () => {
    const parsed = Number(price);
    const patch: Partial<Omit<Product, "id">> = {};
    if (name.trim()) patch.name = name.trim();
    if (!Number.isNaN(parsed) && parsed > 0) patch.price = Math.round(parsed * 100) / 100;
    onUpdate(patch);
    setOpen(false);
  };

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 text-start">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-heading">{product.name}</span>
            {product.available ? null : <Chip tone="error">לא זמין</Chip>}
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {formatPrice(product.price)} ₪ ל{unitLabel(product.unit)}
          </div>
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onUpdate({ available: !product.available })}
        >
          {product.available ? "סימון כלא זמין" : "החזרה למלאי"}
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2.5 border-t border-border pt-2.5">
          <div className="grid gap-2.5 md:grid-cols-2">
            <FormField label="שם המוצר">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="מחיר בסיס (₪)">
              <TextInput
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
              />
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save}>
              שמירה
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 className="size-4" />
              מחיקת מוצר
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function NewProductForm({
  onCreate,
  onCancel,
}: {
  onCreate: (product: Omit<Product, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<Unit>("unit");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = Number(price);
    if (!name.trim()) return setError("יש להזין שם מוצר");
    if (Number.isNaN(parsed) || parsed <= 0) return setError("יש להזין מחיר תקין");
    setError(null);
    onCreate({
      name: name.trim(),
      unit,
      price: Math.round(parsed * 100) / 100,
      minQty: unit === "kg" ? 0.5 : 1,
      step: unit === "kg" ? 0.5 : 1,
      quickAdd: unit === "kg" ? 1 : 5,
      available: true,
    });
  };

  return (
    <Card className="mt-3 flex flex-col gap-2.5">
      <div className="text-[12px] font-semibold text-muted-foreground">מוצר חדש</div>
      <div className="grid gap-2.5 md:grid-cols-3">
        <FormField label="שם המוצר">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: לחם כוסמין" />
        </FormField>
        <FormField label="מחיר (₪)">
          <TextInput value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
        </FormField>
        <FormField label="יחידת מכירה">
          <div className="flex gap-2">
            <Button size="sm" variant={unit === "unit" ? "primary" : "ghost"} onClick={() => setUnit("unit")}>
              יחידה
            </Button>
            <Button size="sm" variant={unit === "kg" ? "primary" : "ghost"} onClick={() => setUnit("kg")}>
              ק״ג
            </Button>
          </div>
        </FormField>
      </div>
      {error ? <div className="text-[12px] font-semibold text-error">{error}</div> : null}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit}>
          הוספת מוצר
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </Card>
  );
}
