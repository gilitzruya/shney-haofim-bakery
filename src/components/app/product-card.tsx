import { cn } from "@/lib/utils";
import type { Product } from "@/data/catalog";
import { productImage } from "@/data/product-images";
import {
  clampQty,
  formatPrice,
  formatQty,
  minQtyFor,
  priceExVat,
  priceLabel,
  stepFor,
  unitLabel,
  weightLabel,
} from "@/lib/format";
import { useEffect, useRef, useState } from "react";


export function ProductPlaceholder({ className }: { className?: string | undefined }) {
  return (
    <div
      className={cn(
        "product-placeholder flex size-[88px] shrink-0 items-center justify-center rounded-[12px]",
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
  onSetQty?: ((qty: number) => void) | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const step = stepFor(product);
  const min = minQtyFor(product);

  const applyQty = (next: number) => {
    const clamped = clampQty(product, next);
    if (clamped === qty) return;
    if (onSetQty) onSetQty(clamped);
    else onChange(clamped - qty);
  };
  const bump = (delta: number) => {
    if (delta > 0) applyQty(qty <= 0 ? Math.max(min, delta) : qty + delta);
    else applyQty(qty + delta < min ? 0 : qty + delta);
  };
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
        onSetQty?.(clampQty(product, parsed));
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
        aria-label="הוספה"
        disabled={disabled}
        onClick={() => bump(step)}
        className={btn}
      >
        +
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
        onClick={() => bump(-step)}
        className={btn}
      >
        −
      </button>
    </div>
  );
}


export function ProductCard({
  product,
  qty,
  onChange,
  onSetQty,
}: {
  product: Product;
  qty: number;
  onChange: (delta: number) => void;
  onSetQty?: ((qty: number) => void) | undefined;
}) {
  const selected = qty > 0;
  const unavailable = !product.available;
  const [pending, setPending] = useState(qty);
  useEffect(() => {
    setPending(qty);
  }, [qty]);

  const commitToCart = () => {
    if (onSetQty) onSetQty(pending);
    else onChange(pending - qty);
  };
  const dirty = pending !== qty;

  return (
    <div
      className={cn(
        "mb-2.5 flex items-start gap-2.5 overflow-hidden rounded-[16px] border-[1.5px] p-2 ps-2.5",
        selected && !unavailable ? "border-primary/35 bg-primary-soft" : "border-border bg-card",
        unavailable && "opacity-60",
      )}
    >
      {productImage(product.id) ? (
        <img
          src={productImage(product.id)}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="aspect-square size-[88px] shrink-0 rounded-[12px] object-contain"
        />
      ) : (
        <ProductPlaceholder />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch py-0.5">
        <div className="w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
            <span dir="ltr" className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {product.sku ?? product.id}
            </span>
          </div>
          <div className="mt-0.5 text-[11.5px] font-semibold text-primary">
            {priceLabel(product.price, product.unit)}
          </div>
          <div className="text-[10.5px] text-muted-foreground">
            {formatPrice(priceExVat(product.price))} לפני מע״מ
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
            {product.weightGrams ? <span>משקל: {weightLabel(product.weightGrams)}</span> : null}
            {minQtyFor(product) > (product.unit === "kg" ? 0.5 : 1) ? (
              <span>
                מינימום {formatQty(minQtyFor(product), product.unit)} {unitLabel(product.unit)}
              </span>
            ) : null}
          </div>
          {product.note ? (
            <div className="mt-1 rounded-[8px] bg-secondary px-2 py-1 text-[10.5px] leading-tight text-muted-foreground">
              {product.note}
            </div>
          ) : null}
          {unavailable ? (
            <div className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {product.unavailableReason ?? "לא זמין למועד שנבחר"}
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex w-full flex-wrap items-center justify-end gap-2">
          <QuantityStepper
            product={product}
            qty={pending}
            onChange={(delta) => setPending((p) => clampQty(product, p + delta))}
            onSetQty={(next) => setPending(next)}
            disabled={unavailable}
          />
          <button
            type="button"
            disabled={unavailable || (!dirty && pending === 0)}
            onClick={commitToCart}
            className="h-[30px] shrink-0 rounded-[9px] bg-primary px-3 text-[11.5px] font-bold text-primary-foreground disabled:opacity-40"
          >
            {selected && !dirty ? "בסל" : selected ? "עדכון הסל" : "הוספה לסל"}
          </button>
        </div>
      </div>
    </div>
  );
}
