import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Card } from "@/components/app/card";
import { DocumentStatusChip } from "@/components/admin/document-status-chip";
import type { AdminDocument } from "@/lib/admin/accounting";
import { StatusChip } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import { intakeTime } from "@/lib/admin/dates";
import type { AdminOrderView } from "@/lib/admin/selectors";
import { formatPrice } from "@/lib/format";

export interface OrderSelection {
  selected: string[];
  onToggle: (orderId: string) => void;
}

/** רשימת הזמנות: כרטיסים במובייל, טבלה בדסקטופ. */
export function AdminOrderList({
  views,
  selection,
  documentFor,
}: {
  views: AdminOrderView[];
  selection?: OrderSelection | undefined;
  documentFor?: ((orderId: string) => AdminDocument | undefined) | undefined;
}) {
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {views.map((v) => (
          <OrderRowCard
            key={v.order.id}
            view={v}
            selection={selection}
            document={documentFor?.(v.order.id)}
          />
        ))}
      </div>
      <div className="hidden md:block">
        <OrdersTable views={views} selection={selection} documentFor={documentFor} />
      </div>
    </>
  );
}

function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="size-4 shrink-0 accent-[var(--color-primary,#a4553b)]"
    />
  );
}

function OrderRowCard({
  view,
  selection,
  document,
}: {
  view: AdminOrderView;
  selection?: OrderSelection | undefined;
  document?: AdminDocument | undefined;
}) {
  const unitsCount = view.order.lines.reduce((sum, l) => sum + l.qty, 0);
  const card = (
    <Link
      to="/admin/orders/$orderId"
      params={{ orderId: view.order.id }}
      className="block no-underline"
    >
      <Card className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-bold text-heading">{view.customerName}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{roundLabel(view.order.round)}</div>
            </div>
            <StatusChip status={view.order.status} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-[11.5px] text-muted-foreground">
              {view.itemsCount} מוצרים · {Math.round(unitsCount)} יח׳
            </div>
            <div className="text-end">
              <div className="text-[15px] font-bold text-heading">{formatPrice(view.total)}</div>
              <div className="text-[11px] text-muted-foreground">{intakeTime(view.order.id)}</div>
            </div>
          </div>
          <div className="mt-1.5 text-[11.5px] font-semibold text-primary">פירוט הזמנה</div>
        </div>
        <ChevronLeft className="mt-0.5 size-4 shrink-0 text-primary" />
      </Card>
    </Link>
  );


  if (!selection && !document) return card;

  return (
    <div className="flex items-center gap-2">
      {selection ? (
        <SelectBox
          checked={selection.selected.includes(view.order.id)}
          onChange={() => selection.onToggle(view.order.id)}
          label={`בחירת ההזמנה של ${view.customerName}`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        {card}
        {document !== undefined || selection ? (
          <div className="mt-1 pe-1">
            <DocumentStatusChip document={document} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrdersTable({
  views,
  selection,
  documentFor,
}: {
  views: AdminOrderView[];
  selection?: OrderSelection | undefined;
  documentFor?: ((orderId: string) => AdminDocument | undefined) | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      <table className="w-full text-right text-[13px]">
        <thead>
          <tr className="border-b border-border bg-card-muted text-[11.5px] text-muted-foreground">
            {selection ? <th className="px-4 py-2.5" /> : null}
            <th className="px-4 py-2.5 font-semibold">לקוח</th>
            <th className="px-4 py-2.5 font-semibold">סבב</th>
            <th className="px-4 py-2.5 font-semibold">פריטים</th>
            <th className="px-4 py-2.5 font-semibold">סה״כ</th>
            <th className="px-4 py-2.5 font-semibold">סטטוס</th>
            {documentFor ? <th className="px-4 py-2.5 font-semibold">מסמך</th> : null}
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {views.map((v) => (
            <tr key={v.order.id} className="border-b border-border last:border-b-0">
              {selection ? (
                <td className="px-4 py-3">
                  <SelectBox
                    checked={selection.selected.includes(v.order.id)}
                    onChange={() => selection.onToggle(v.order.id)}
                    label={`בחירת ההזמנה של ${v.customerName}`}
                  />
                </td>
              ) : null}
              <td className="px-4 py-3 font-semibold text-heading">{v.customerName}</td>
              <td className="px-4 py-3 text-muted-foreground">{roundLabel(v.order.round)}</td>
              <td className="px-4 py-3 text-muted-foreground">{v.itemsCount}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{formatPrice(v.total)}</td>
              <td className="px-4 py-3">
                <StatusChip status={v.order.status} />
              </td>
              {documentFor ? (
                <td className="px-4 py-3">
                  <DocumentStatusChip document={documentFor(v.order.id)} />
                </td>
              ) : null}
              <td className="px-4 py-3 text-left">
                <Link
                  to="/admin/orders/$orderId"
                  params={{ orderId: v.order.id }}
                  className="text-[12.5px] font-semibold text-primary no-underline"
                >
                  פירוט
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
