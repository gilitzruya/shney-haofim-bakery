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
  const size = compact ? "h-[28px] min-w-[28px]" : "h-[30px] min-w-[30px]";
  const btn = cn(
    "flex items-center justify-center rounded-[9px] border border-border bg-card px-1.5 text-[12px] font-bold text-foreground disabled:opacity-40",
    size,
  );

  return (
    <div className="flex shrink-0 items-start gap-1.5">
      <button
        type="button"
        dir="ltr"
        disabled={disabled}
        onClick={() => onChange(quick)}
        className={cn(
          "flex items-center justify-center rounded-[9px] bg-accent px-2.5 text-[12px] font-bold text-accent-foreground disabled:opacity-40",
          size,
        )}
      >
        +{product.unit === "kg" ? quick.toFixed(1) : quick}
      </button>
      <button
        type="button"
        dir="ltr"
        aria-label="הוספה"
        disabled={disabled}
        onClick={() => onChange(step)}
        className={btn}
      >
        +{product.unit === "kg" ? step.toFixed(1) : step}
      </button>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-[9px] px-1.5 text-[13px] font-bold",
            size,
            qty > 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground",
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
        dir="ltr"
        aria-label="הפחתה"
        disabled={disabled || qty <= 0}
        onClick={() => onChange(-step)}
        className={btn}
      >
        -{product.unit === "kg" ? step.toFixed(1) : step}
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
        "mb-2.5 flex items-center gap-2.5 rounded-[16px] border-[1.5px] p-2.5",
        selected && !unavailable ? "border-primary/35 bg-primary-soft" : "border-border bg-card",
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
