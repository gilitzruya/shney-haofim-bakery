import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { WhatsAppIcon } from "@/components/app/whatsapp-icon";
import { BAKERY_CONTACT } from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "יצירת קשר — מאפיית שני האופים" },
      { name: "description", content: "טלפון, וואטסאפ, דוא״ל ושעות פעילות של מאפיית שני האופים." },
      { property: "og:title", content: "יצירת קשר — מאפיית שני האופים" },
      { property: "og:description", content: "דברו איתנו על הזמנות, אספקות ומוצרים מיוחדים." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="יצירת קשר" backTo="/" />
      </AppHeader>
      <Section className="pb-10">
        <div className="flex flex-col gap-2.5">
          <ContactRow icon={<Phone className="size-4" />} label="טלפון" value={BAKERY_CONTACT.phone} href={`tel:${BAKERY_CONTACT.phone}`} />
          <ContactRow
            icon={<WhatsAppIcon className="size-4 text-white" />}
            iconClassName="bg-[#25D366]"
            label="וואטסאפ"
            value={BAKERY_CONTACT.whatsapp}
            href={`https://wa.me/972${BAKERY_CONTACT.whatsapp.replace(/[^0-9]/g, "").slice(1)}`}
          />
          <ContactRow icon={<Mail className="size-4" />} label="דוא״ל" value={BAKERY_CONTACT.email} href={`mailto:${BAKERY_CONTACT.email}`} />
          <ContactRow icon={<MapPin className="size-4" />} label="כתובת" value={BAKERY_CONTACT.address} />
        </div>

        <Card className="mt-3.5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-[13.5px] font-semibold text-foreground">שעות פעילות</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {BAKERY_CONTACT.hours.map((h) => (
              <div key={h.day} className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted-foreground">{h.day}</span>
                <span className="font-semibold text-foreground">{h.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-5 overflow-hidden p-0">
          <div className="relative aspect-[16/10] w-full">
            <iframe
              title="מיקום מאפיית שני האופים"
              src="https://www.openstreetmap.org/export/embed.html?bbox=35.208%2C31.848%2C35.228%2C31.860&layer=mapnik&marker=31.854111%2C35.218306"
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MapPin className="size-4" />
              </span>
              <div>
                <div className="text-[11px] text-muted-foreground">המיקום שלנו</div>
                <div className="text-[13.5px] font-semibold text-foreground">{BAKERY_CONTACT.address}</div>
              </div>
            </div>
            <a
              href="https://waze.com/ul?ll=31.854111,35.218306&navigate=yes"
              target="_blank"
              rel="noreferrer"
              className="no-underline"
            >
              <Button size="lg" variant="outline" className="w-full gap-2">
                <Navigation className="size-4" />
                ניווט לעסק ב-Waze
              </Button>
            </a>
          </div>
        </Card>

      </Section>
    </AppShell>
  );
}

function ContactRow({
  icon,
  iconClassName,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Card className="flex items-center gap-2.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary", iconClassName)}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate text-[13px] font-semibold text-foreground">{value}</div>
      </div>
    </Card>
  );
  return href ? (
    <a href={href} className="no-underline" target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}
