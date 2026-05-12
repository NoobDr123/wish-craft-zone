import { createFileRoute, useNavigate, Link, Outlet, useMatches } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeCustomCheckout } from "@/components/StripeCustomCheckout";
import { ReviewSurveyModal } from "@/components/ReviewSurveyModal";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";
import { buildOrderPatchForQuiz, ensureOrderForQuiz } from "@/lib/checkoutPrefetch";
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

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [{ title: "Almost There · PawPrint Song" }],
  }),
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CheckoutPage() {
  // CRITICAL: When the user lands on /checkout/return (a child route of
  // /checkout), TanStack Router renders this parent component too. Without
  // this guard, the checkout payment UI would mount on top of the return
  // page and the buyer would never get redirected to the upsell flow.
  // Render the child route via <Outlet /> instead and bail out of all the
  // checkout logic below.
  const matches = useMatches();
  const isOnReturn = matches.some((m) => m.routeId === "/checkout/return");
  if (isOnReturn) {
    return <Outlet />;
  }

  const navigate = useNavigate();
  const q = useQuizStore();
  const [hydrated, setHydrated] = useState(() => useQuizStore.persist.hasHydrated());
  const [email, setEmail] = useState(q.buyer_email || "");
  const [name, setName] = useState(q.buyer_name || "");
  const [orderId, setOrderId] = useState<string | null>(q.orderId || null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [amountVersion, setAmountVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoApplied, setPromoApplied] = useState<{
    discount_pct: number;
    discount_cents: number;
    final_amount_cents: number;
    free: boolean;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = useQuizStore.persist.onFinishHydration(() => setHydrated(true));
    if (useQuizStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setEmail(q.buyer_email || "");
    setName(q.buyer_name || "");
    setOrderId(q.orderId || null);
  }, [hydrated, q.buyer_email, q.buyer_name, q.orderId]);

  // Note: we no longer block with "Checkout session not found" — the order
  // is created on-the-fly by `ensureOrderForQuiz` / `create-payment-intent`
  // even when the local quiz store is empty (e.g. returning buyer).

  // Track checkout page view once hydrated + fire Meta Pixel InitiateCheckout
  useEffect(() => {
    if (!hydrated) return;
    void import("@/lib/tracking").then(({ track, attachSessionIdentity }) => {
      void track({
        type: "checkout_view",
        buyerEmail: q.buyer_email || undefined,
      });
      if (q.buyer_email) {
        void attachSessionIdentity({ buyerEmail: q.buyer_email });
      }
    });
    void import("@/lib/metaPixel").then(({ pixelTrack }) => {
      pixelTrack("InitiateCheckout", {
        content_category: "personalized_song",
        currency: "USD",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const emailValid = emailRe.test(email);
  const nameValid = name.trim().length > 1;
  const ready = emailValid && nameValid;
  const hasSongDetails = Boolean(q.dog_name || q.orderId || orderId);

  // Compute delivery date only on client to avoid SSR/CSR hydration mismatch
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  useEffect(() => {
    setDeliveryDate(formatDeliveryDate());
  }, []);
  const recipient = q.dog_name || "your dog";

  const quizPatch = hydrated
    ? buildOrderPatchForQuiz({ buyerEmail: email, buyerName: name })
    : undefined;

  // Free-song redemption short-circuit: if the user arrived with a valid
  // reward code (set on /create), insert a $0 order and route directly to
  // /processing — no Stripe involvement.
  const freeRedemptionRef = useRef(false);
  const [redeemingFree, setRedeemingFree] = useState(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!q.reward_code) return;
    if (freeRedemptionRef.current) return;
    freeRedemptionRef.current = true;
    setRedeemingFree(true);
    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id ?? null;
        const userEmail = authData.user?.email?.toLowerCase() ?? null;
        if (!userId || !userEmail) {
          setError("Please log in to redeem your free song.");
          setRedeemingFree(false);
          return;
        }

        const newOrderId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const patch = buildOrderPatchForQuiz({
          buyerEmail: userEmail,
          buyerName: q.buyer_name || undefined,
        });

        const { error: insertError } = await supabase.from("orders").insert({
          ...patch,
          user_id: userId,
          buyer_email: userEmail,
          amount_cents: 0,
          currency: "USD",
          status: "pending_payment",
          payment_status: "pending",
          priority: "standard",
        });
        if (insertError) {
          console.error("[free redemption] order insert failed:", insertError);
          setError("Could not create your free order. Please try again.");
          setRedeemingFree(false);
          return;
        }
        // We need the orderId for the next step. Look it up by buyer_email + most recent.
        const { data: createdOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("buyer_email", userEmail)
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const finalOrderId = createdOrder?.id ?? newOrderId;
        q.set("orderId", finalOrderId);

        const { data, error: fnError } = await supabase.functions.invoke(
          "create-checkout",
          { body: { orderId: newOrderId, rewardCode: q.reward_code } },
        );
        if (fnError || !data?.ok) {
          console.error("[free redemption] create-checkout failed:", fnError, data);
          setError(data?.error || fnError?.message || "Redemption failed.");
          setRedeemingFree(false);
          return;
        }
        // Clear the reward code from the store so it can't be reused after.
        q.set("reward_code", undefined);
        navigate({ to: "/processing" });
      } catch (e) {
        console.error("[free redemption] unexpected:", e);
        setError("Something went wrong. Please try again.");
        setRedeemingFree(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, q.reward_code]);

  // Ensure an order row exists so the payment form can request a PaymentIntent.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (q.reward_code) return; // free path handles it
    if (startedRef.current) return;
    if (orderId) return;
    if (!q.dog_name && !q.orderId) return;
    startedRef.current = true;

    setCreatingOrder(true);
    void ensureOrderForQuiz()
      .then((id) => {
        if (!id) {
          setError("Could not start payment. Please go back and try again.");
          startedRef.current = false;
          return;
        }
        setOrderId(id);
      })
      .catch((e) => {
        console.error("[checkout] ensureOrderForQuiz failed:", e);
        setError("Could not start payment. Please try again.");
        startedRef.current = false;
      })
      .finally(() => setCreatingOrder(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, q.dog_name, q.reward_code, orderId]);

  // Persist buyer email/name and the latest quiz payload to the order as they type (debounced).
  useEffect(() => {
    if (!orderId || !ready) return;
    const t = setTimeout(async () => {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      q.set("buyer_email", trimmedEmail);
      q.set("buyer_name", trimmedName);
      await supabase
        .from("orders")
        .update(buildOrderPatchForQuiz({ buyerEmail: trimmedEmail, buyerName: trimmedName }))
        .eq("id", orderId);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, name, ready, orderId]);

  // Apply promo code: validates server-side, applies discount, and if the
  // discount brings the total to $0 we short-circuit straight to processing.
  async function handleApplyPromo() {
    setPromoError(null);
    if (!orderId) {
      setPromoError("Please wait, order is initializing.");
      return;
    }
    const code = promoCode.trim();
    if (!code) {
      setPromoError("Enter a code first.");
      return;
    }
    if (!ready) {
      setPromoError("Enter your email and name above first.");
      return;
    }

    setPromoApplying(true);
    try {
      // Make sure latest email/name are saved before we mark order paid
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      q.set("buyer_email", trimmedEmail);
      q.set("buyer_name", trimmedName);
      await supabase
        .from("orders")
        .update(buildOrderPatchForQuiz({ buyerEmail: trimmedEmail, buyerName: trimmedName }))
        .eq("id", orderId);

      const { stripeEnvironment } = await import("@/lib/stripe");
      const { data, error: fnError } = await supabase.functions.invoke(
        "apply-promo-code",
        { body: { orderId, code, environment: stripeEnvironment } },
      );

      if (fnError || !data?.ok) {
        const errCode = data?.error || fnError?.message || "invalid_code";
        const friendly: Record<string, string> = {
          invalid_code: "That code isn't valid.",
          inactive_code: "That code is no longer active.",
          expired_code: "That code has expired.",
          max_uses_reached: "That code has already been fully used.",
          order_already_paid: "This order is already paid.",
          missing_code: "Enter a code first.",
          missing_order_id: "Order not ready yet, try again in a moment.",
          order_not_found: "Order not found. Please refresh.",
          internal_error: "Something went wrong. Please try again.",
        };
        setPromoError(friendly[errCode] || friendly.internal_error);
        return;
      }

      setPromoApplied({
        discount_pct: data.discount_pct,
        discount_cents: data.discount_cents,
        final_amount_cents: data.final_amount_cents,
        free: data.free,
      });
      // Force the embedded checkout to re-fetch a session with the new amount.
      setAmountVersion((v) => v + 1);

      if (data.free) {
        // Skip Stripe entirely — order is already marked paid + queued
        navigate({ to: "/processing" });
      }
    } catch (e) {
      console.error("apply promo failed:", e);
      setPromoError("Something went wrong. Please try again.");
    } finally {
      setPromoApplying(false);
    }
  }


  if (redeemingFree) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-warm px-6 text-center">
        <Logo />
        <h1 className="font-display text-2xl font-semibold">Redeeming your free song…</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Applying your reward code and queuing your song. This usually takes just a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm pb-32 lg:pb-16">
      <PaymentTestModeBanner />

      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/almost-there"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Logo />
            <span className="w-10 sm:w-16" aria-hidden />
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
            <ShieldCheck className="h-3 w-3 text-success sm:h-3.5 sm:w-3.5" />
            Secure payment · Encrypted &amp; processed by Stripe
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
        <section className="text-center">
          <h1 className="text-balance font-display text-[28px] font-bold leading-[1.1] text-foreground sm:text-4xl md:text-5xl">
            Almost There! Complete Your Order
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-base md:text-lg">
            You're just one click away from creating a beautiful, personalized
            song for{" "}
            <span className="font-semibold text-primary">{recipient}</span>.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-soft sm:mt-6 sm:px-5 sm:py-2.5 sm:text-sm">
            Expected delivery: <span className="font-bold">{deliveryDate}</span>
          </div>
        </section>

        {/* Order summary — always visible */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-5 shadow-soft sm:mt-8 sm:p-6 md:p-7">
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
              {promoApplied ? `${promoApplied.discount_pct}% OFF` : "50% OFF · TODAY ONLY"}
            </span>
            <p className="flex items-baseline gap-2">
              {/* Compare-at is 2× our price so the deal reads cleanly: $59.99 → $29.99. */}
              <span className="text-base font-medium text-muted-foreground line-through">
                $59.99
              </span>
              <span className="font-display text-3xl font-bold text-primary">
                {promoApplied
                  ? `$${(promoApplied.final_amount_cents / 100).toFixed(2)}`
                  : "$29.99"}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                USD
              </span>
            </p>
          </div>

          {/* Promo code input */}
          <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 sm:p-4">
            {promoApplied ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-primary">
                    Promo applied: {promoCode.toUpperCase()}
                  </p>
                  <p className="text-muted-foreground">
                    {promoApplied.free
                      ? "Your order is free. Redirecting…"
                      : `You saved $${(promoApplied.discount_cents / 100).toFixed(2)}.`}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              </div>
            ) : (
              <>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Have a promo code?
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setPromoError(null);
                    }}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-xl border-2 border-peach bg-background px-3 py-2.5 text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    maxLength={32}
                    disabled={promoApplying}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoApplying || !promoCode.trim()}
                    className="shrink-0 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                  >
                    {promoApplying ? "Applying…" : "Apply"}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-xs text-destructive">{promoError}</p>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setReviewOpen(true)}
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

          {/* Custom on-page payment: Apple/Google Pay/Link buttons up top,
              card form below, branded "Pay" button. We collect email/name
              ourselves above, so we wait for them to be valid before mounting
              the form (Stripe needs them for billing details + receipts). */}
          <div className="mt-6 border-t border-peach/70">
            {orderId ? (
              <StripeCustomCheckout
                orderId={orderId}
                amountVersion={amountVersion}
                returnUrl={`${window.location.origin}/checkout/return`}
                email={email}
                name={name}
                quizPatch={quizPatch}
                quizSnapshot={quizPatch}
                onError={(msg: string) => setError(msg)}
              />
            ) : hasSongDetails ? (
              <div className="space-y-4 p-4 md:p-6">
                {creatingOrder && (
                  <p className="text-center text-sm text-muted-foreground">
                    Preparing your secure checkout…
                  </p>
                )}
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
            ) : (
              <div className="p-4 md:p-6">
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
                  <p className="font-display text-lg font-semibold text-foreground">
                    Add your dog details first
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tell us who the doggy song is for, then your secure payment form will load here.
                  </p>
                  <Link
                    to="/create"
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    Finish song details
                  </Link>
                </div>
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

      <ReviewSurveyModal open={reviewOpen} onClose={() => setReviewOpen(false)} />
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
          <a href="mailto:hello@getpawprintsong.com" className="hover:text-foreground hover:underline">Contact Support</a>
        </nav>

        {/* Compliance copy */}
        <div className="mt-6 space-y-3 text-center text-xs leading-relaxed text-muted-foreground/80">
          <p>
            By completing this purchase, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            Your card will be charged <span className="font-semibold text-foreground">$29.99 USD</span>{" "}
            today as a one-time payment to PawPrint Song. No subscription, no recurring charges.
          </p>
          <p>
            Your payment information is encrypted and processed securely by Stripe.
            PawPrint Song never stores your card details. All transactions are billed in U.S. Dollars.
          </p>
          <p>
            Need help? Email{" "}
            <a href="mailto:hello@getpawprintsong.com" className="underline hover:text-foreground">
              hello@getpawprintsong.com
            </a>{" "}
            and we'll respond within 24 hours.
          </p>
        </div>

        {/* Legal address + copyright */}
        <div className="mt-6 border-t border-peach/60 pt-5 text-center text-[11px] text-muted-foreground/70">
          <p>© {year} PawPrint Song. All rights reserved.</p>
          <p className="mt-1">PawPrint Song is a registered trademark. Songs are created for personal, non-commercial use.</p>
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
