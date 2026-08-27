import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/bakery-logo.png";
import { AppShell, Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { FormField, TextInput } from "@/components/app/form-controls";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/api/client";

interface LoginSearch {
  redirect?: string;
  error?: "no-access";
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const result: LoginSearch = {};
    if (typeof search["redirect"] === "string" && search["redirect"].startsWith("/")) {
      result.redirect = search["redirect"];
    }
    if (search["error"] === "no-access") {
      result.error = "no-access";
    }
    return result;
  },
  head: () => ({
    meta: [{ title: "כניסה — מאפיית שני האופים" }],
  }),
  component: LoginPage,
});

/** מנקה מספר טלפון ישראלי לפורמט בינלאומי E.164, כמו שה-API של Supabase Auth מצפה. */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}

function LoginPage() {
  const search = Route.useSearch();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.error === "no-access") {
      toast.error("המספר הזה מחובר אך לא מקושר להרשאות במערכת — פנו למאפייה.");
    }
  }, [search.error]);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("מספר הטלפון לא תקין");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setLoading(false);
    if (error) {
      toast.error("שליחת הקוד נכשלה — ודאו שהמספר רשום במערכת ונסו שוב.");
      return;
    }
    setStep("otp");
    toast.success("קוד אימות נשלח ב-SMS");
  };

  const verifyCode = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: "sms",
    });
    if (error) {
      setLoading(false);
      setOtp("");
      toast.error("קוד שגוי — נסו שוב.");
      return;
    }
    window.location.href = search.redirect ?? "/";
  };

  return (
    <AppShell>
      <Section className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={logo} alt="לוגו מאפיית שני האופים" className="size-16 object-contain" />
          <div className="text-lg font-bold text-heading">מאפיית שני האופים</div>
          <div className="text-[12.5px] text-muted-foreground">מערכת הזמנות סיטונאיות</div>
        </div>

        <Card className="w-full max-w-[380px]">
          {step === "phone" ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
            >
              <FormField label="מספר טלפון" hint="נשלח אליכם קוד אימות ב-SMS">
                <TextInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  className="text-center"
                  placeholder="050-0000000"
                  autoFocus
                />
              </FormField>
              <Button type="submit" loading={loading} className="w-full justify-center">
                שליחת קוד
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verifyCode();
              }}
            >
              <FormField label="קוד האימות שנשלח אליכם" hint={phone}>
                <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center">
                  <InputOTPGroup dir="ltr">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </FormField>
              <Button type="submit" loading={loading} disabled={otp.length !== 6} className="w-full justify-center">
                אימות
              </Button>
              <div className="flex justify-between text-[12.5px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                  }}
                  className="text-muted-foreground"
                >
                  שינוי מספר
                </button>
                <button type="button" onClick={() => void sendCode()} className="text-primary">
                  שליחה חוזרת
                </button>
              </div>
            </form>
          )}
        </Card>
      </Section>
    </AppShell>
  );
}
