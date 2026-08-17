import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card, EmptyState } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { ProductPlaceholder } from "@/components/app/product-card";
import { fileToCompressedDataUrl } from "@/lib/image-upload";
import { productPhoto } from "@/data/product-images";
import { FormField, TextArea, TextInput } from "@/components/app/form-controls";
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
  const { catalog, hydrated, updateProduct, addProduct, removeProduct, renameCategory } = useStore();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const category = catalog.find((c) => c.id === categoryId);

  const products = useMemo(() => {
    const q = query.trim();
    const list = category?.products ?? [];
    return q ? list.filter((p) => p.name.includes(q)) : list;
  }, [category, query]);

  if (!hydrated) {
    return (
      <AdminShell>
        <Section className="pt-6 pb-10"> </Section>
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

        {renaming ? (
          <Card className="mt-2 flex flex-col gap-2">
            <div className="text-[12px] font-semibold text-primary">שינוי שם הקטגוריה</div>
            <TextInput
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              aria-label="שם הקטגוריה"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!categoryName.trim()}
                onClick={() => {
                  const name = categoryName.trim();
                  if (name) renameCategory(category.id, name);
                  setRenaming(false);
                }}
              >
                שמירה
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                ביטול
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-[19px] font-bold text-heading">{category.name}</h1>
              <button
                type="button"
                aria-label="שינוי שם הקטגוריה"
                onClick={() => {
                  setCategoryName(category.name);
                  setRenaming(true);
                }}
                className="rounded-md p-1 text-primary"
              >
                <Pencil className="size-4" />
              </button>
            </div>
            <Button size="sm" variant={adding ? "ghost" : "primary"} onClick={() => setAdding((a) => !a)}>
              <Plus className="size-4" />
              {adding ? "ביטול" : "מוצר חדש"}
            </Button>
          </div>
        )}

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-[12.5px] font-semibold text-heading">{value}</span>
    </div>
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? "");
  const [price, setPrice] = useState(product.price.toFixed(2));
  const [unit, setUnit] = useState<Unit>(product.unit);
  const [minQty, setMinQty] = useState(String(product.minQty ?? ""));
  const [weight, setWeight] = useState(product.weightGrams ? String(product.weightGrams) : "");
  const [note, setNote] = useState(product.note ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(productPhoto(product));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const photo = productPhoto(product);

  const startEdit = () => {
    setName(product.name);
    setSku(product.sku ?? "");
    setPrice(product.price.toFixed(2));
    setUnit(product.unit);
    setMinQty(String(product.minQty ?? ""));
    setWeight(product.weightGrams ? String(product.weightGrams) : "");
    setNote(product.note ?? "");
    setImageUrl(productPhoto(product));
    setError(null);
    setEditing(true);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await fileToCompressedDataUrl(file));
    } catch {
      setError("לא הצלחנו לטעון את התמונה");
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    const parsedPrice = Number(price);
    const parsedMin = minQty.trim() ? Number(minQty) : NaN;
    const parsedWeight = weight.trim() ? Number(weight) : NaN;

    if (!name.trim()) return setError("יש להזין שם מוצר");
    if (!sku.trim()) return setError("יש להזין קוד מוצר");
    if (!price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0)
      return setError("יש להזין מחיר תקין");
    if (minQty.trim() && (Number.isNaN(parsedMin) || parsedMin <= 0))
      return setError("כמות מינימום חייבת להיות מספר חיובי");
    if (weight.trim() && (Number.isNaN(parsedWeight) || parsedWeight <= 0))
      return setError("משקל חייב להיות מספר חיובי");

    setError(null);
    const patch: Partial<Omit<Product, "id">> = {
      name: name.trim(),
      sku: sku.trim(),
      unit,
      price: Math.round(parsedPrice * 100) / 100,
      minQty: Number.isNaN(parsedMin) ? (unit === "kg" ? 0.5 : 1) : parsedMin,
      step: unit === "kg" ? 0.5 : 1,
    };
    (patch as Record<string, unknown>)["weightGrams"] = Number.isNaN(parsedWeight)
      ? undefined
      : parsedWeight;
    (patch as Record<string, unknown>)["note"] = note.trim() ? note.trim() : undefined;
    (patch as Record<string, unknown>)["imageUrl"] = imageUrl ?? undefined;
    onUpdate(patch);

    setEditing(false);
  };

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2.5 text-start">
          {photo ? (
            <img
              src={photo}
              alt={product.name}
              className="size-11 shrink-0 rounded-[10px] border border-border object-contain"
            />
          ) : null}
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold text-heading">{product.name}</span>
              {product.available ? null : <Chip tone="error">לא זמין</Chip>}
            </span>
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onUpdate({ available: !product.available })}>
          {product.available ? "סימון כלא זמין" : "החזרה למלאי"}
        </Button>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-2 border-t border-border pt-2.5">
          <div className="grid gap-1.5 md:grid-cols-2">
            <DetailRow label="שם המוצר" value={product.name} />
            <DetailRow label="קוד מוצר" value={product.sku || "—"} />
            <DetailRow label="יחידת הזמנה" value={unitLabel(product.unit)} />
            <DetailRow label="מחיר ליחידה" value={formatPrice(product.price)} />
            <DetailRow label="כמות מינימום" value={String(product.minQty ?? "—")} />
            <DetailRow label="משקל" value={product.weightGrams ? `${product.weightGrams} גרם` : "—"} />
          </div>
          {product.note ? (
            <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-[12px] text-heading">
              <span className="text-muted-foreground">הערות: </span>
              {product.note}
            </div>
          ) : null}
          <div className="flex items-center gap-2 pt-0.5 md:justify-center">
            <Button size="sm" onClick={startEdit}>
              <Pencil className="size-4" />
              עריכת המוצר
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 className="size-4" />
              מחיקת מוצר
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-3">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="תמונת המוצר"
                className="size-[84px] shrink-0 rounded-[12px] border border-border object-contain"
              />
            ) : (
              <ProductPlaceholder />
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-muted-foreground">תמונת מוצר (רשות)</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="size-4" />
                  {uploading ? "מעלה…" : imageUrl ? "החלפת תמונה" : "העלאת תמונה"}
                </Button>
                {imageUrl ? (
                  <Button size="sm" variant="ghost" onClick={() => setImageUrl(undefined)}>
                    הסרה
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickImage(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="שם המוצר *">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="קוד מוצר *">
              <TextInput value={sku} onChange={(e) => setSku(e.target.value)} inputMode="numeric" />
            </FormField>
            <FormField label="יחידת הזמנה *">
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={unit === "unit" ? "primary" : "ghost"} onClick={() => setUnit("unit")}>
                  יחידה
                </Button>
                <Button size="sm" variant={unit === "kg" ? "primary" : "ghost"} onClick={() => setUnit("kg")}>
                  ק״ג
                </Button>
              </div>
            </FormField>
            <FormField label="מחיר ליחידה (₪) *">
              <TextInput value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </FormField>
            <FormField label="כמות מינימום להזמנה">
              <TextInput value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="decimal" />
            </FormField>
            <FormField label="משקל (גרם)">
              <TextInput value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label="הערות למוצר">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[68px]" />
          </FormField>

          {error ? (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button size="sm" onClick={save} className="flex-1 md:flex-initial md:w-auto">
              שמירת השינויים
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}
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
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<Unit>("unit");
  const [minQty, setMinQty] = useState("");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await fileToCompressedDataUrl(file));
    } catch {
      setError("לא הצלחנו לטעון את התמונה");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const parsedPrice = Number(price);
    const parsedMin = minQty.trim() ? Number(minQty) : NaN;
    const parsedWeight = weight.trim() ? Number(weight) : NaN;

    if (!name.trim()) return setError("יש להזין שם מוצר");
    if (!sku.trim()) return setError("יש להזין קוד מוצר");
    if (!price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0)
      return setError("יש להזין מחיר תקין");
    if (minQty.trim() && (Number.isNaN(parsedMin) || parsedMin <= 0))
      return setError("כמות מינימום חייבת להיות מספר חיובי");
    if (weight.trim() && (Number.isNaN(parsedWeight) || parsedWeight <= 0))
      return setError("משקל חייב להיות מספר חיובי");

    setError(null);
    const defaultMin = unit === "kg" ? 0.5 : 1;
    onCreate({
      name: name.trim(),
      sku: sku.trim(),
      unit,
      price: Math.round(parsedPrice * 100) / 100,
      minQty: Number.isNaN(parsedMin) ? defaultMin : parsedMin,
      step: unit === "kg" ? 0.5 : 1,
      quickAdd: unit === "kg" ? 1 : 5,
      available: true,
      ...(Number.isNaN(parsedWeight) ? {} : { weightGrams: parsedWeight }),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    });
  };

  return (
    <Card className="mt-3 flex flex-col gap-0 p-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-primary-soft px-3.5 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus className="size-4" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-heading">הוספת מוצר חדש</div>
          <div className="text-[11.5px] text-muted-foreground">שדות המסומנים ב-* הם חובה</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-3.5 py-4">
        {/* Image */}
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="תמונת המוצר"
              className="size-[84px] shrink-0 rounded-[12px] border border-border object-contain"
            />
          ) : (
            <ProductPlaceholder />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted-foreground">תמונת מוצר (רשות)</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-4" />
                {uploading ? "מעלה…" : imageUrl ? "החלפת תמונה" : "העלאת תמונה"}
              </Button>
              {imageUrl ? (
                <Button size="sm" variant="ghost" onClick={() => setImageUrl(null)}>
                  הסרה
                </Button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickImage(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* Required */}
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px] font-bold text-primary">פרטי חובה</div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="שם המוצר *">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: לחם כוסמין"
              />
            </FormField>
            <FormField label="קוד מוצר *">
              <TextInput
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="לדוגמה: 1048"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="יחידת הזמנה *">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={unit === "unit" ? "primary" : "ghost"}
                  onClick={() => setUnit("unit")}
                >
                  יחידה
                </Button>
                <Button size="sm" variant={unit === "kg" ? "primary" : "ghost"} onClick={() => setUnit("kg")}>
                  ק״ג
                </Button>
              </div>
            </FormField>
            <FormField label="מחיר ליחידה (₪) *">
              <TextInput
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </FormField>
          </div>
        </div>

        {/* Optional */}
        <div className="flex flex-col gap-3 border-t border-border pt-3.5">
          <div className="text-[11.5px] font-bold text-primary">פרטים נוספים (רשות)</div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="כמות מינימום להזמנה" hint={unit === "kg" ? "ברירת מחדל: 0.5 ק״ג" : "ברירת מחדל: יחידה אחת"}>
              <TextInput
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                inputMode="decimal"
                placeholder={unit === "kg" ? "0.5" : "1"}
              />
            </FormField>
            <FormField label="משקל (גרם)">
              <TextInput
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                inputMode="numeric"
                placeholder="לדוגמה: 500"
              />
            </FormField>
          </div>
          <FormField label="הערות למוצר">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="לדוגמה: מחמצת טבעית, זמן אפייה ארוך"
              className="min-h-[68px]"
            />
          </FormField>
        </div>

        {error ? (
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-border pt-3.5">
          <Button size="sm" onClick={submit} className="flex-1 md:flex-initial md:w-auto">
            שמירת המוצר
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            ביטול
          </Button>
        </div>
      </div>
    </Card>
  );
}

