import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CustomPaymentForm } from "@/components/CustomPaymentForm";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import {
  prefetchCheckout,
  getPrefetchedCheckout,
  type PrefetchedCheckout,
} from "@/lib/checkoutPrefetch";
import {
  ArrowLeft,
  CheckCircle2,
  Music2,
  Pencil,
  ShieldCheck,
} from "lucide-react";

// Code-split the samples block so the SDK and AudioPlayer don't enter the
// critical path. Mounted only when scrolled into view.
const SamplesSection = lazy(() => import("@/components/CheckoutSamples"));

interface SampleSong {
  id: string;
  title: string;
  for_text: string | null;
  quote: string | null;
  audio_url: string | null;
  recipient_name: string;
}

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Almost There · RibbonSong" }],
  }),
  // Samples are no longer fetched in the SSR loader — they were blocking the
  // critical path. They now load lazily after the payment form is ready.
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const q = useQuizStore();
  const [email, setEmail] = useState(q.buyer_email || "");
  const [name, setName] = useState(q.buyer_name || "");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(q.orderId || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.recipient_name) navigate({ to: "/create" });
  }, [q.recipient_name, navigate]);

  const emailValid = emailRe.test(email);
  const nameValid = name.trim().length > 1;
  const ready = emailValid && nameValid;

  // Compute delivery date only on client to avoid SSR/CSR hydration mismatch
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  useEffect(() => {
    setDeliveryDate(formatDeliveryDate());
  }, []);
  const recipient = q.recipient_name || "your loved one";

  // Single-shot kick: use the prefetched checkout from /scratch if it exists,
  // otherwise prefetchCheckout() runs the full flow now. Either way the form
  // mounts as soon as the clientSecret resolves.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!q.recipient_name) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const apply = (pf: PrefetchedCheckout | null) => {
      if (!pf) {
        setError("Could not start payment. Please try again.");
        return;
      }
      q.set("orderId", pf.orderId);
      setOrderId(pf.orderId);
      setClientSecret(pf.clientSecret);
      setPaymentIntentId(pf.paymentIntentId);
    };

    const cached = getPrefetchedCheckout();
    if (cached) {
      apply(cached);
    } else {
      prefetchCheckout().then(apply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.recipient_name]);

  // Persist buyer email/name to the order as they type (debounced).
  useEffect(() => {
    if (!orderId || !ready) return;
    const t = setTimeout(async () => {
      const trimmedEmail = email.trim().toLowerCase();
      q.set("buyer_email", trimmedEmail);
      q.set("buyer_name", name);
      await supabase
        .from("orders")
        .update({ buyer_email: trimmedEmail, buyer_name: name })
        .eq("id", orderId);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, name, ready, orderId]);

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
                $99.99
              </span>
              <span className="font-display text-3xl font-bold text-primary">
                $49.99
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                USD
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Pencil className="h-4 w-4" /> Review or Edit Survey
          </button>
        </section>

        {/* Payment form — mounts immediately. Express checkout (Apple/Google Pay/Link) shows up top, card form below. */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-peach/70 bg-card shadow-card">
          <div className="px-6 pt-6 md:px-8 md:pt-7">
            <h2 className="font-display text-xl font-bold text-foreground">Contact &amp; Payment</h2>
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
          </div>

          {/* Inline payment form — mounted as soon as the PaymentIntent is ready */}
          <div className="mt-6 border-t border-peach/70">
            {clientSecret && paymentIntentId ? (
              <CustomPaymentForm
                key={paymentIntentId}
                clientSecret={clientSecret}
                email={email.trim().toLowerCase()}
                amountLabel="$49.99"
                returnUrl={`${window.location.origin}/checkout/return?payment_intent_id=${paymentIntentId}`}
                onError={(msg) => setError(msg)}
                disabled={!ready}
                disabledReason="Enter your email and name above to continue"
              />
            ) : (
              <div className="space-y-4 p-4 md:p-6">
                {/* Skeleton matching the real form footprint to avoid layout shift */}
                <div className="h-12 animate-pulse rounded-2xl bg-foreground/10" />
                <div className="flex gap-2">
                  <div className="h-12 flex-1 animate-pulse rounded-2xl bg-foreground/10" />
                  <div className="h-12 flex-1 animate-pulse rounded-2xl bg-foreground/10" />
                </div>
                <div className="my-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                    Or pay with card
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="h-32 animate-pulse rounded-xl bg-foreground/5" />
                <div className="h-14 animate-pulse rounded-2xl bg-primary/30" />
              </div>
            )}
          </div>
        </section>

        {/* Samples — lazy-loaded below the fold */}
        <Suspense fallback={null}>
          <SamplesSection />
        </Suspense>

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

      <CheckoutFooter />
    </div>
  );
}

function CheckoutFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-peach/70 bg-background/60 backdrop-blur">
      <div className="mx-auto max-w-2xl px-5 py-8 text-sm text-muted-foreground">
        {/* Policy links */}
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
          <Link to="/terms" hash="refunds" className="hover:text-foreground hover:underline">Refund Policy</Link>
          <a href="mailto:hello@ribbonsong.com" className="hover:text-foreground hover:underline">Contact Support</a>
        </nav>

        {/* Compliance copy */}
        <div className="mt-6 space-y-3 text-center text-xs leading-relaxed text-muted-foreground/80">
          <p>
            By completing this purchase, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            Your card will be charged <span className="font-semibold text-foreground">$49.99 USD</span>{" "}
            today as a one-time payment to RibbonSong. No subscription, no recurring charges.
          </p>
          <p>
            Your payment information is encrypted and processed securely by Stripe.
            RibbonSong never stores your card details. All transactions are billed in U.S. Dollars.
          </p>
          <p>
            Need help? Email{" "}
            <a href="mailto:hello@ribbonsong.com" className="underline hover:text-foreground">
              hello@ribbonsong.com
            </a>{" "}
            and we'll respond within 24 hours.
          </p>
        </div>

        {/* Legal address + copyright */}
        <div className="mt-6 border-t border-peach/60 pt-5 text-center text-[11px] text-muted-foreground/70">
          <p>© {year} RibbonSong. All rights reserved.</p>
          <p className="mt-1">RibbonSong is a registered trademark. Songs are created for personal, non-commercial use.</p>
        </div>
      </div>
    </footer>
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
