import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Logo } from "@/components/Logo";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, stripeEnvironment } from "@/lib/stripe";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Music2,
  Pencil,
  Play,
  ShieldCheck,
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
  const [stage, setStage] = useState<"contact" | "payment">("contact");
  const [creating, setCreating] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  const emailValid = emailRe.test(email);
  const nameValid = name.trim().length > 1;
  const canContinue = emailValid && nameValid && !creating;

  const deliveryDate = useMemo(() => formatDeliveryDate(), []);
  const recipient = q.recipient_name || "your loved one";

  const handleStartCheckout = async () => {
    if (!canContinue) return;
    setCreating(true);
    setError(null);
    q.set("buyer_email", email);
    q.set("buyer_name", name);

    try {
      // 1. Create the order row in our DB first so we have an orderId for Stripe metadata
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const { data: order, error: insertError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          buyer_email: email.trim().toLowerCase(),
          buyer_name: name,
          recipient_name: q.recipient_name,
          relationship: q.relationship ?? null,
          genre: q.genre ?? null,
          tempo: q.tempo ?? null,
          voice: q.voice ?? null,
          song_title_idea: q.song_title_idea || null,
          is_gift: q.is_gift,
          recipient_email: q.recipient_email || null,
          delivery_date: q.delivery_date || null,
          personal_note: q.personal_note || null,
          amount_cents: 9999,
          currency: "USD",
          status: "pending_payment",
          payment_status: "pending",
          quiz_payload: {
            stage: q.stage,
            cancer_type: q.cancer_type,
            message: q.message,
            fighting_for: q.fighting_for,
            signature_strength: q.signature_strength,
            hardest_moment: q.hardest_moment,
            what_helps_most: q.what_helps_most,
            qualities: q.qualities,
            inside_joke: q.inside_joke,
            shared_memory: q.shared_memory,
            little_things: q.little_things,
            faith_or_beliefs: q.faith_or_beliefs,
            personal_words: q.personal_words,
            hope_for_them: q.hope_for_them,
          },
        })
        .select("id")
        .single();

      if (insertError || !order) {
        console.error("Order insert failed:", insertError);
        setError("Could not start your order. Please try again.");
        setCreating(false);
        return;
      }

      q.set("orderId", order.id);

      // 2. Ask the edge function to create the embedded checkout session
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
        body: {
          orderId: order.id,
          email: email.trim().toLowerCase(),
          environment: stripeEnvironment,
        },
      });

      if (fnError || !data?.clientSecret) {
        console.error("create-checkout failed:", fnError, data);
        setError(data?.error || "Could not start payment. Please try again.");
        setCreating(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setStage("payment");
    } catch (e) {
      console.error("Checkout error:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const checkoutOptions = useMemo(
    () => (clientSecret ? { clientSecret } : null),
    [clientSecret],
  );

  return (
    <div className="min-h-screen bg-gradient-warm pb-32 lg:pb-16">
      <PaymentTestModeBanner />

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
        <section className="text-center">
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] text-foreground md:text-5xl">
            Almost There! Complete Your Order
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            You're just one click away from creating a beautiful, personalized
            song for{" "}
            <span className="font-semibold text-primary">{recipient}</span>.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
            Expected delivery: <span className="font-bold">{deliveryDate}</span>
          </div>
        </section>

        {/* Order summary — always visible */}
        <section className="mt-8 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Music2 className="h-5 w-5 text-primary" /> Your Custom Song
          </h2>

          <dl className="mt-5 space-y-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Song for:</dt>
              <dd className="font-semibold text-primary">{recipient}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery:</dt>
              <dd className="font-semibold text-foreground">{deliveryDate}</dd>
            </div>
          </dl>

          <div className="my-5 border-t border-dashed border-peach" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border-2 border-primary/40 bg-primary/5 px-3 py-1 text-xs font-bold tracking-wider text-primary">
              50% OFF
            </span>
            <p className="flex items-baseline gap-2">
              <span className="text-base font-medium text-muted-foreground line-through">
                $199
              </span>
              <span className="font-display text-3xl font-bold text-primary">
                $99.99
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                USD
              </span>
            </p>
          </div>

          <button
            onClick={() => navigate({ to: "/create" })}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Pencil className="h-4 w-4" /> Review or Edit Survey
          </button>
        </section>

        {/* Contact form OR Stripe embedded checkout */}
        {stage === "contact" ? (
          <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-card md:p-8">
            <h2 className="font-display text-xl font-bold text-foreground">Contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll send your song here when it's ready.
            </p>
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

            {error && (
              <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={handleStartCheckout}
              disabled={!canContinue}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none md:text-lg"
            >
              {creating ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Preparing checkout…
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" /> Continue to Payment · $99.99
                </>
              )}
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> 30-Day Money Back Guarantee
            </p>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-2 shadow-card md:p-3">
            {checkoutOptions && (
              <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </section>
        )}

        {/* Samples */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Music2 className="h-5 w-5 text-primary" /> Hear Other RibbonSongs We Made
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
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
                  >
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">Ordered by {s.by}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">0:00</span>
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
            <CheckCircle2 className="h-5 w-5 text-success" /> 100% Money Back Guarantee
          </h3>
          <ul className="mt-5 space-y-4">
            {[
              { t: "Not satisfied? Get a full refund", d: "No questions asked, no hassle" },
              { t: "30-day guarantee", d: "Plenty of time to listen and decide" },
              { t: "Risk-free purchase", d: "Your satisfaction is our priority" },
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
      </main>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "email";
  valid?: boolean;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  valid = true,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border-2 bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          valid ? "border-peach focus:border-primary" : "border-destructive/60"
        }`}
      />
    </label>
  );
}
