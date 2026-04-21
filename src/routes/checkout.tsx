import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Checkout · RibbonSong" }],
  }),
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckoutPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);

  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState(q.buyer_name || "");
  const [email, setEmail] = useState(q.buyer_email || "");

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  const cardClean = card.replace(/\s/g, "");
  const cardValid = cardClean.length >= 13 && /^\d+$/.test(cardClean);
  const expValid = /^\d{2}\s*\/\s*\d{2}$/.test(exp);
  const cvcValid = /^\d{3,4}$/.test(cvc);
  const emailValid = emailRe.test(email);
  const nameValid = name.trim().length > 1;

  const canPay =
    cardValid && expValid && cvcValid && emailValid && nameValid && !processing;

  const total = useMemo(() => 39, []);

  const formatCard = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, "$1 ");
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  };

  const handlePay = () => {
    if (!canPay) return;
    setProcessing(true);
    q.set("buyer_name", name);
    q.set("buyer_email", email);
    setTimeout(() => {
      q.set("orderId", crypto.randomUUID());
      navigate({ to: "/upsell-1" });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[1.2fr_1fr]">
        {/* LEFT — form */}
        <section className="order-2 lg:order-1">
          <Link
            to="/almost-there"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">
            Checkout
          </h1>

          {/* Contact */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </h2>
            <div className="mt-3 space-y-3">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                valid={email.length === 0 || emailValid}
              />
              <Field
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Jane Doe"
                valid={name.length === 0 || nameValid}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Payment
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Encrypted
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center gap-2 border-b border-border bg-peach/40 px-4 py-3 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4" /> Credit / Debit card
              </div>
              <div className="space-y-3 p-4">
                <Field
                  label="Card number"
                  value={card}
                  onChange={(v) => setCard(formatCard(v))}
                  placeholder="1234 1234 1234 1234"
                  inputMode="numeric"
                  valid={card.length === 0 || cardValid}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Expires"
                    value={exp}
                    onChange={(v) => setExp(formatExp(v))}
                    placeholder="MM / YY"
                    inputMode="numeric"
                    valid={exp.length === 0 || expValid}
                  />
                  <Field
                    label="CVC"
                    value={cvc}
                    onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    valid={cvc.length === 0 || cvcValid}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Demo checkout · Real payments wire up next.
            </p>
          </div>

          <button
            onClick={handlePay}
            disabled={!canPay}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {processing ? "Processing…" : `Pay $${total} · Start my song`}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            256-bit SSL · 30-day money-back guarantee
          </div>
        </section>

        {/* RIGHT — order summary */}
        <aside className="order-1 lg:order-2">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Order summary
            </p>

            <div className="mt-5 flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-ribbon text-2xl">
                🎵
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Personalized RibbonSong
                </p>
                {q.recipient_name && (
                  <p className="text-sm text-muted-foreground">
                    For {q.recipient_name}
                    {q.relationship && ` · ${q.relationship}`}
                  </p>
                )}
                {q.genre && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {q.genre} · {q.tempo} · {q.voice}
                  </p>
                )}
              </div>
              <p className="font-medium text-foreground">${total}.00</p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-foreground">
              {[
                "Studio-quality custom song",
                "Full lyrics & MP3 download",
                "Delivered in 24–48 hours",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="my-5 border-t border-dashed border-peach" />

            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={`$${total}.00`} />
              <Row label="Taxes" value="Included" muted />
              <Row label="Shipping" value="Digital delivery" muted />
            </div>

            <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-display text-lg text-foreground">
                Total
              </span>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold text-foreground">
                  ${total}
                </p>
                <p className="text-xs text-muted-foreground">USD · one-time</p>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  valid = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "email";
  valid?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          valid ? "border-border" : "border-destructive"
        }`}
      />
    </label>
  );
}
