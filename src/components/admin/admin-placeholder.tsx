import { Section } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/card";

/** מסך זמני למודולים שיפותחו בשלבים הבאים. */
export function AdminPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <Section className="pt-6 pb-10">
      <h1 className="mb-3 text-[19px] font-bold text-heading">{title}</h1>
      <EmptyState title="בשלב פיתוח" description={description} />
    </Section>
  );
}
