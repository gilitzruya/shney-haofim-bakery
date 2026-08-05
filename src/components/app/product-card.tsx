import { cn } from "@/lib/utils";
import type { Product } from "@/data/catalog";
import { formatQty, priceLabel, quickStepFor, stepFor, unitLabel } from "@/lib/format";
import { useEffect, useRef, useState } from "react";


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
  onSetQty,
  disabled = false,
  compact = false,
}: {
  product: Product;
  qty: number;
  onChange: (delta: number) => void;
  onSetQty?: (qty: number) => void | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const step = stepFor(product.unit);
  const quick = quickStepFor(product.unit);
  const size = compact ? "h-[28px] min-w-[28px]" : "h-[30px] min-w-[30px]";
  const btn = cn(
    "flex items-center justify-center rounded-[9px] border border-border bg-card px-1.5 text-[12px] font-bold text-foreground disabled:opacity-40",
    size,
  );
  const editable = !!onSetQty && !disabled;

  const startEdit = () => {
    if (!editable) return;
    setInputValue(formatQty(qty, product.unit));
    setEditing(true);
  };

  const commit = () => {
    const raw = inputValue.trim();
    if (raw === "" || raw === ".") {
      onSetQty?.(0);
    } else {
      const parsed = product.unit === "kg" ? parseFloat(raw) : parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        onSetQty?.(Math.max(0, parsed));
      }
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (product.unit === "kg") {
      if (/^\d*\.?\d{0,1}$/.test(value)) setInputValue(value);
    } else {
      if (/^\d*$/.test(value)) setInputValue(value);
    }
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode={product.unit === "kg" ? "decimal" : "numeric"}
            dir="ltr"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex items-center justify-center rounded-[9px] px-1.5 text-center text-[13px] font-bold outline-none",
              size,
              qty > 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground",
            )}
          />
        ) : (
          <button
            type="button"
            dir="ltr"
            disabled={!editable}
            onClick={startEdit}
            className={cn(
              "flex items-center justify-center rounded-[9px] px-1.5 text-[13px] font-bold",
              editable && "cursor-text",
              size,
              qty > 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground",
            )}
          >
            {formatQty(qty, product.unit)}
          </button>
        )}
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
