import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [summaryOpen, setSummaryOpen] = useState(false);

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
      {/* Header */}
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/almost-there"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Secure
          </span>
        </div>
      </header>

      {/* Collapsible Order summary — collapsed by default */}
      <div className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto max-w-2xl px-5">
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex w-full items-center justify-between py-4 text-sm"
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              {summaryOpen ? "Hide order summary" : "Show order summary"}
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

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Checkout
        </h1>

        {/* Single combined form card */}
        <div className="mt-6 space-y-3">
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

        {/* Desktop CTA */}
        <div className="mt-7 hidden lg:block">
          <CompleteButton
            processing={processing}
            canPay={canPay}
            onClick={handlePay}
          />
          <Legal />
        </div>

        {/* Compact trust row */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> 30-day refund
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> SSL encrypted
          </span>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-5 py-3 backdrop-blur lg:hidden">
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
