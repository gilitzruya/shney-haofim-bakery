import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AppShell, PageTitleBar, Section } from "@/components/app/app-shell";
import { Card } from "@/components/app/card";
import { BAKERY_CONTACT } from "@/data/catalog";

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
  const { business } = useStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return (
    <AppShell>
      <AppHeader>
        <PageTitleBar title="יצירת קשר" backTo="/" />
      </AppHeader>
      <Section className="pb-10">
        <div className="flex flex-col gap-2.5">
          <ContactRow icon={<Phone className="size-4" />} label="טלפון" value={BAKERY_CONTACT.phone} href={`tel:${BAKERY_CONTACT.phone}`} />
          <ContactRow
            icon={<MessageCircle className="size-4" />}
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

        <h2 className="mt-5 mb-2 text-[15px] font-bold text-foreground">שליחת הודעה</h2>
        <div className="flex flex-col gap-3.5">
          <FormField label="נושא">
            <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="נושא ההודעה" />
          </FormField>
          <FormField label="תוכן ההודעה" hint={`ההודעה תישלח בשם ${business.name}`}>
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="במה נוכל לעזור?" />
          </FormField>
          <Button
            size="lg"
            disabled={!subject.trim() || !message.trim()}
            onClick={() => {
              setSubject("");
              setMessage("");
              toast.success("ההודעה נשלחה למאפייה");
            }}
          >
            שליחה
          </Button>
        </div>
      </Section>
    </AppShell>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Card className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
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
