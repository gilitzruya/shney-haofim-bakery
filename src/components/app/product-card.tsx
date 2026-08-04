import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Product } from "@/data/catalog";
import { formatQty, priceLabel, quickStepFor, stepFor, unitLabel } from "@/lib/format";

export function ProductPlaceholder({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cn(
        "product-placeholder flex size-14 shrink-0 items-center justify-center rounded-[10px]",
        className,
      )}
    >
      <span className="text-center font-mono text-[7px] leading-tight text-muted-foreground">
        תמונת
        <br />
        מוצר
      </span>
    </div>
  );
}

export function QuantityStepper({
  product,
  qty,
  onChange,
  disabled = false,
  compact = false,
}: {
  product: Product;
  qty: number;
  onChange: (delta: number) => void;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  const step = stepFor(product.unit);
  const quick = quickStepFor(product.unit);
  const btn =
    "flex items-center justify-center rounded-[10px] border border-border bg-card text-[13px] font-bold text-foreground disabled:opacity-50";
  const size = compact ? "size-[28px]" : "size-[30px]";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        aria-label="הפחתה"
        disabled={disabled || qty <= 0}
        onClick={() => onChange(-step)}
        className={cn(btn, size)}
      >
        <Minus className="size-3.5" />
      </button>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex min-w-[30px] items-center justify-center rounded-[10px] px-1.5 py-1 text-[13px] font-bold",
            qty > 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground",
          )}
        >
          {formatQty(qty, product.unit)}
        </div>
        {!compact ? (
          <span className="mt-0.5 text-[9px] text-muted-foreground">{unitLabel(product.unit)}</span>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="הוספה"
        disabled={disabled}
        onClick={() => onChange(step)}
        className={cn(btn, size)}
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(quick)}
        className={cn(
          "flex h-[30px] items-center justify-center rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground disabled:opacity-50",
          compact && "h-[28px]",
        )}
      >
        +{product.unit === "kg" ? quick.toFixed(1) : quick}
      </button>
    </div>
  );
}

export function ProductCard({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (delta: number) => void;
}) {
  const selected = qty > 0;
  const unavailable = !product.available;

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2.5 rounded-[14px] border-[1.5px] p-2.5",
        selected && !unavailable ? "border-primary bg-primary-soft" : "border-border bg-card",
        unavailable && "opacity-60",
      )}
    >
      <ProductPlaceholder />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
        <div className="mt-0.5 text-[11.5px] font-semibold text-primary">
          {priceLabel(product.price, product.unit)}
        </div>
        {unavailable ? (
          <div className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {product.unavailableReason ?? "לא זמין למועד שנבחר"}
          </div>
        ) : null}
      </div>
      <QuantityStepper product={product} qty={qty} onChange={onChange} disabled={unavailable} />
    </div>
  );
}
