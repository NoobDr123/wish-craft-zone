import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Gift,
  Lock,
  Music2,
  Pencil,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Almost There · RibbonSong" }],
  }),
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAMPLES = [
  {
    title: "Sent to Me from God",
    by: "Pamela S.",
    quote:
      "Absolutely beautiful, you captured such special moments… we both were crying.",
  },
  {
    title: "Saving Grace",
    by: "Wendy B.",
    quote:
      "This is absolutely breathtaking. I can't believe it… I am going to have a hard time keeping this a secret until Sunday.",
  },
  {
    title: "Stronger Now",
    by: "Markeeta B.",
    quote: "Very very wonderful song. I absolutely loved it and so did Dave!",
  },
];

function formatDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [email, setEmail] = useState(q.buyer_email || "");
  const [name, setName] = useState(q.buyer_name || "");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  const cardClean = card.replace(/\s/g, "");
  const emailValid = emailRe.test(email);
  const nameValid = name.trim().length > 1;
  const cardValid = cardClean.length >= 13 && /^\d+$/.test(cardClean);
  const expValid = /^\d{2}\s*\/\s*\d{2}$/.test(exp);
  const cvcValid = /^\d{3,4}$/.test(cvc);

  const canPay =
    emailValid && nameValid && cardValid && expValid && cvcValid && !processing;
  const deliveryDate = useMemo(() => formatDeliveryDate(), []);
  const recipient = q.recipient_name || "your loved one";

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
    q.set("buyer_email", email);
    q.set("buyer_name", name);
    setTimeout(() => {
      q.set("orderId", crypto.randomUUID());
      navigate({ to: "/upsell-1" });
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-32 lg:pb-16">
      {/* Header */}
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/almost-there"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">
        {/* HERO — Almost There */}
        <section className="text-center">
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] text-foreground md:text-5xl">
            Almost There! Complete Your Order
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            You're just one click away from creating a beautiful, personalized
            song for{" "}
            <span className="font-semibold text-ribbon">{recipient}</span>.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-ribbon px-5 py-2.5 text-sm font-semibold text-ribbon-foreground shadow-soft">
            Expected song delivery date:{" "}
            <span className="font-bold">{deliveryDate}</span>
          </div>
        </section>

        {/* Contact + Payment card */}
        <section className="mt-8 rounded-3xl border border-peach/70 bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Contact
          </h2>
          <div className="mt-4 space-y-3">
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              valid={email.length === 0 || emailValid}
            />
            <Field
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Jane Doe"
              valid={name.length === 0 || nameValid}
            />
          </div>

          <div className="my-6 border-t border-dashed border-peach" />

          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
              <CreditCard className="h-5 w-5 text-ribbon" /> Payment
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" /> Encrypted
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <Field
              label="Card Number"
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

          <button
            onClick={handlePay}
            disabled={!canPay}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-ribbon px-6 py-5 text-base font-bold text-ribbon-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none md:text-lg"
          >
            {processing ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-ribbon-foreground/30 border-t-ribbon-foreground" />
                Processing…
              </>
            ) : (
              <>
                <Gift className="h-5 w-5" /> Create My Song · $99
              </>
            )}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> 30-Day Money Back Guarantee
          </p>
        </section>

        {/* Order summary */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Music2 className="h-5 w-5 text-ribbon" /> Your Custom Song Order
          </h2>

          <dl className="mt-5 space-y-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Song for:</dt>
              <dd className="font-semibold text-ribbon">{recipient}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery:</dt>
              <dd className="font-semibold text-foreground">{deliveryDate}</dd>
            </div>
          </dl>

          <div className="my-5 border-t border-dashed border-peach" />

          <h3 className="font-display text-2xl font-semibold text-foreground">
            Custom Song
          </h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border-2 border-ribbon/40 bg-ribbon/5 px-3 py-1 text-xs font-bold tracking-wider text-ribbon">
              50% OFF
            </span>
            <p className="flex items-baseline gap-2">
              <span className="text-base font-medium text-muted-foreground line-through">
                $199
              </span>
              <span className="font-display text-3xl font-bold text-ribbon">
                $99
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                USD
              </span>
            </p>
          </div>

          <button
            onClick={() => navigate({ to: "/create" })}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ribbon/40 bg-ribbon/5 px-4 py-3 text-sm font-semibold text-ribbon transition-colors hover:bg-ribbon/10"
          >
            <Pencil className="h-4 w-4" /> Review or Edit Survey
          </button>
        </section>

        {/* Limited time offer */}
        <section className="mt-6 rounded-3xl border-2 border-ribbon/30 bg-ribbon/5 p-6 md:p-7">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-ribbon">
            🎁 Limited Time Offer
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">
            Our songs typically cost{" "}
            <span className="font-semibold line-through">$199</span>, but for a
            limited time, you can get the same professional quality for just{" "}
            <span className="font-bold text-ribbon">$99 USD</span>.
          </p>
        </section>

        {/* Samples */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Music2 className="h-5 w-5 text-ribbon" /> Hear Other RibbonSongs We
            Made
          </h2>
          <div className="mt-5 space-y-4">
            {SAMPLES.map((s) => (
              <article
                key={s.title}
                className="rounded-2xl border border-peach/60 bg-background/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    aria-label={`Play ${s.title}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ribbon text-ribbon-foreground transition-transform hover:scale-105"
                  >
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {s.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Ordered by {s.by}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    0:00
                  </span>
                </div>
                <p className="mt-3 text-sm italic leading-relaxed text-foreground/80">
                  &ldquo;{s.quote}&rdquo; — {s.by}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Money-back guarantee */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" /> 100% Money Back
            Guarantee
          </h3>
          <ul className="mt-5 space-y-4">
            {[
              {
                t: "Not satisfied? Get a full refund",
                d: "No questions asked, no hassle",
              },
              {
                t: "30-day guarantee",
                d: "Plenty of time to listen and decide",
              },
              {
                t: "Risk-free purchase",
                d: "Your satisfaction is our priority",
              },
            ].map((item) => (
              <li key={item.t} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-success" />
                <div>
                  <p className="font-semibold text-foreground">{item.t}</p>
                  <p className="text-sm text-muted-foreground">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Secondary CTA */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <button
            onClick={handlePay}
            disabled={!canPay}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-ribbon px-6 py-5 text-base font-bold text-ribbon-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none md:text-lg"
          >
            <Gift className="h-5 w-5" /> Create My Song
          </button>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Ready to create something special for{" "}
            <span className="font-semibold text-foreground">{recipient}</span>?
          </p>
        </section>

        {/* What you'll get */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Gift className="h-5 w-5 text-ribbon" /> What You'll Get
          </h3>
          <ul className="mt-5 space-y-4">
            {[
              {
                t: "Radio-Quality Song",
                d: "Studio-quality RibbonSong, ready to share",
              },
              {
                t: "Personalized Lyrics",
                d: `Custom written just for ${recipient}`,
              },
              {
                t: "7-Day Delivery",
                d: "Perfect for last-minute gifts",
              },
            ].map((item) => (
              <li key={item.t} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ribbon" />
                <div>
                  <p className="font-semibold text-foreground">{item.t}</p>
                  <p className="text-sm text-muted-foreground">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Why choose */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Star className="h-5 w-5 fill-ribbon text-ribbon" /> Why Choose
            RibbonSong?
          </h3>
          <ul className="mt-5 space-y-3">
            {[
              "Over 1,000 satisfied families",
              "100% satisfaction guarantee",
              "Secure payment processing",
              "Delivered in just 7 days",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-3 text-[15px] text-foreground"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-peach/70 bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
        <button
          onClick={handlePay}
          disabled={!canPay}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ribbon px-6 py-4 text-base font-bold text-ribbon-foreground shadow-glow transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {processing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ribbon-foreground/30 border-t-ribbon-foreground" />
              Processing…
            </>
          ) : (
            <>
              <Gift className="h-5 w-5" /> Create My Song · $99
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          30-day money back · Secure checkout
        </p>
      </div>
    </div>
  );
}
