import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock,
  Lock,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Checkout · RibbonSong" }],
  }),
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRUST = [
  {
    name: "Sarah M.",
    quote:
      "Most meaningful gift my mom received during treatment. Worth every cent.",
  },
  {
    name: "David R.",
    quote: "Played it at my wife's last chemo session. The room was in tears.",
  },
];

const HAPPY_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=faces",
];

function CheckoutPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [processing, setProcessing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  // Prefill from quiz store
  const [email, setEmail] = useState(q.buyer_email || "");
  const [name, setName] = useState(q.buyer_name || "");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

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
    <div className="min-h-screen bg-background pb-32 lg:pb-0">
      {/* Header with trust strip */}
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <Link
              to="/almost-there"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
          </div>

          {/* Happy customers strip */}
          <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-peach/40 px-3 py-1.5">
            <div className="flex -space-x-1.5">
              {HAPPY_AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-5 w-5 rounded-full border border-card object-cover"
                />
              ))}
            </div>
            <p className="text-xs font-bold tracking-wide text-foreground">
              1,000+ HAPPY FAMILIES
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground sm:gap-6 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> 24–48h delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> 30-day guarantee
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Secure checkout
            </span>
          </div>
        </div>
      </header>

      {/* Collapsible Order summary — at the START, above the form */}
      <div className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto max-w-5xl px-5">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex w-full items-center justify-between py-4 text-sm"
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              Order summary
              {summaryOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <span className="font-display text-2xl font-semibold text-foreground">
              ${total}.00
            </span>
          </button>
          {summaryOpen && (
            <div className="pb-5">
              <OrderSummary total={total} q={q} />
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 py-8 lg:py-10">
        <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
          Checkout
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Almost done. Your song starts the moment you order.
        </p>

        {/* Contact */}
        <section className="mt-7">
          <h2 className="font-display text-lg font-semibold text-foreground">
            1. Contact
          </h2>
          <p className="text-xs text-muted-foreground">
            We'll send your song to this email.
          </p>
          <div className="mt-4 space-y-3">
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
        </section>

        {/* Payment */}
        <section className="mt-9">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              2. Payment
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Encrypted
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border bg-peach/40 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4" /> Credit / Debit card
              </span>
              <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground">
                <Brand>VISA</Brand>
                <Brand>MC</Brand>
                <Brand>AMEX</Brand>
              </div>
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
        </section>

        {/* Stars + CTA (desktop) */}
        <div className="mt-8 hidden lg:block">
          <StarRow />
          <CompleteButton
            processing={processing}
            canPay={canPay}
            onClick={handlePay}
          />
          <Legal />
        </div>

        {/* Guaranteed safe & secure card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 shrink-0 text-foreground" />
            <p className="text-sm font-medium text-foreground">
              Guaranteed <span className="font-bold">safe & secure</span>{" "}
              checkout
            </p>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {["VISA", "MASTERCARD", "AMEX", "DISCOVER", "APPLE PAY"].map(
                (b) => (
                  <Brand key={b}>{b}</Brand>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Inline social proof */}
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Why families trust us
          </p>
          {TRUST.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-1 text-ribbon">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-2 text-sm leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3 w-3" /> Verified buyer
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              30-day money-back guarantee
            </p>
            <p className="text-xs text-muted-foreground">
              Don't love it? Email us for a full refund. No questions asked.
            </p>
          </div>
        </div>

        {/* Delivery note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5" /> Digital delivery · No shipping fees
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-5 py-3 backdrop-blur lg:hidden">
        <StarRow compact />
        <CompleteButton
          processing={processing}
          canPay={canPay}
          onClick={handlePay}
        />
        <Legal compact />
      </div>
    </div>
  );
}

function StarRow({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 ${compact ? "mb-2" : "mb-3"}`}
    >
      <div className="flex items-center gap-0.5 text-success">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <span className="text-sm font-bold text-foreground">1,000+</span>
    </div>
  );
}

function CompleteButton({
  processing,
  canPay,
  onClick,
}: {
  processing: boolean;
  canPay: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canPay}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-8 py-4 text-base font-bold text-success-foreground shadow-soft transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {processing ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
          Processing…
        </>
      ) : (
        <>Complete my order</>
      )}
    </button>
  );
}

function Legal({ compact }: { compact?: boolean }) {
  return (
    <p
      className={`text-center text-muted-foreground ${compact ? "mt-2 text-[10px]" : "mt-3 text-xs"}`}
    >
      By clicking complete order, you agree to our{" "}
      <a className="underline hover:text-foreground" href="#">
        Terms of Service
      </a>{" "}
      and{" "}
      <a className="underline hover:text-foreground" href="#">
        Privacy Policy
      </a>
      .
    </p>
  );
}

function Brand({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-foreground/70">
      {children}
    </span>
  );
}

type QuizState = ReturnType<typeof useQuizStore.getState>;

function OrderSummary({ total, q }: { total: number; q: QuizState }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-ribbon text-2xl">
          🎵
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Personalized RibbonSong</p>
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

      <ul className="mt-4 space-y-2 text-sm text-foreground">
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

      <div className="my-4 border-t border-dashed border-peach" />

      <div className="space-y-1.5 text-sm">
        <Row label="Subtotal" value={`$${total}.00`} />
        <Row label="Taxes" value="Included" muted />
        <Row label="Delivery" value="Digital · email" muted />
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-display text-base text-foreground">Total</span>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-foreground">
            ${total}.00
          </p>
          <p className="text-[11px] text-muted-foreground">USD · one-time</p>
        </div>
      </div>
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
