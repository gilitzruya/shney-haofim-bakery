import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Card } from "@/components/app/card";
import { Chip } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import type { Customer } from "@/data/admin-seed";

function roundsLabel(customer: Customer): string {
  if (customer.allowedRounds.length === 0) return "ללא סבבים";
  return customer.allowedRounds.map(roundLabel).join(" · ");
}

/** רשימת לקוחות: כרטיסים במובייל, טבלה בדסקטופ. */
export function AdminCustomerList({ customers }: { customers: Customer[] }) {
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {customers.map((c) => (
          <CustomerRowCard key={c.id} customer={c} />
        ))}
      </div>
      <div className="hidden md:block">
        <CustomersTable customers={customers} />
      </div>
    </>
  );
}

function CustomerRowCard({ customer }: { customer: Customer }) {
  const contact = customer.contacts[0];
  return (
    <Link to="/admin/customers/$customerId" params={{ customerId: customer.id }} className="no-underline">
      <Card className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-bold text-heading">{customer.name}</span>
            {customer.blocked ? <Chip tone="error">חסום</Chip> : null}
          </div>
          {customer.code ? (
            <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground" dir="ltr">
              קוד לקוח: {customer.code}
            </div>
          ) : null}
          <div className="mt-1 truncate text-[11.5px] text-muted-foreground">
            {contact ? `${contact.name} · ${contact.phone}` : customer.address}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{roundsLabel(customer)}</div>
        </div>
        <ChevronLeft className="size-4 shrink-0 text-primary" />
      </Card>
    </Link>
  );
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      <table className="w-full text-right text-[13px]">
        <thead>
          <tr className="border-b border-border bg-card-muted text-[11.5px] text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">קוד</th>
            <th className="px-4 py-2.5 font-semibold">לקוח</th>
            <th className="px-4 py-2.5 font-semibold">איש קשר</th>
            <th className="px-4 py-2.5 font-semibold">כתובת</th>
            <th className="px-4 py-2.5 font-semibold">סבבים</th>
            <th className="px-4 py-2.5 font-semibold">סטטוס</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                {c.code || "—"}
              </td>
              <td className="px-4 py-2.5 font-semibold text-heading">{c.name}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {c.contacts[0] ? `${c.contacts[0].name} · ${c.contacts[0].phone}` : "—"}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{c.address}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{roundsLabel(c)}</td>
              <td className="px-4 py-2.5">
                {c.blocked ? <Chip tone="error">חסום</Chip> : <Chip tone="muted">פעיל</Chip>}
              </td>
              <td className="px-4 py-2.5 text-start">
                <Link
                  to="/admin/customers/$customerId"
                  params={{ customerId: c.id }}
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
