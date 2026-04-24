import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Music2,
  Mail,
  Calendar,
  Sparkles,
  Headphones,
  Send,
  Heart,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { CheckoutProgress } from "@/components/CheckoutProgress";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/processing")({
  component: ThankYouPage,
  head: () => ({
    meta: [
      { title: "Thank you · Your order is confirmed · RibbonSong" },
      {
        name: "description",
        content:
          "Your personalized RibbonSong is being crafted. View your order summary and what happens next.",
      },
    ],
  }),
});

interface OrderRow {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  recipient_name: string;
  relationship: string | null;
  genre: string | null;
  tempo: string | null;
  voice: string | null;
  song_title_idea: string | null;
  amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  has_3rd_verse: boolean;
  is_rush: boolean;
  has_unlimited_edits: boolean;
  delivery_date: string | null;
  is_gift: boolean;
  recipient_email: string | null;
  created_at: string;
  product_config: Record<string, boolean> | null;
}

type DeliverySpeed = "24h" | "48h" | "standard";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Compute the delivery speed the user actually purchased.
 * `delivery_48h` and `rush_delivery` both flip `is_rush`, so we look at
 * `product_config` to disambiguate. Falls back to standard 5-day delivery.
 */
function getDeliverySpeed(order: OrderRow): DeliverySpeed {
  const cfg = order.product_config || {};
  if (cfg.rush_delivery) return "24h";
  if (cfg.delivery_48h) return "48h";
  // Legacy orders may only have is_rush set — treat as 24h for compatibility.
  if (order.is_rush) return "24h";
  return "standard";
}

function deliveryDaysFor(speed: DeliverySpeed): number {
  switch (speed) {
    case "24h":
      return 1;
    case "48h":
      return 2;
    case "standard":
    default:
      return 5;
  }
}

function deliveryLabelFor(speed: DeliverySpeed): string {
  switch (speed) {
    case "24h":
      return "Within 24 hours";
    case "48h":
      return "Within 48 hours";
    case "standard":
    default:
      return "Within 5 days";
  }
}

function formatDeliveryDate(orderDateIso: string, speed: DeliverySpeed) {
  const d = new Date(orderDateIso);
  d.setDate(d.getDate() + deliveryDaysFor(speed));
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function ThankYouPage() {
  const q = useQuizStore();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardCode, setRewardCode] = useState<string | null>(null);

  // Magic-link sender state — auto-emails the buyer a passwordless sign-in
  // link straight to /dashboard so they can land in their account in one tap.
  const [magicLinkStatus, setMagicLinkStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  const sendMagicLink = async (email: string) => {
    if (!email) {
      setMagicLinkError("We couldn't find an email on this order.");
      setMagicLinkStatus("error");
      return;
    }
    setMagicLinkStatus("sending");
    setMagicLinkError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setMagicLinkError(error.message);
      setMagicLinkStatus("error");
      return;
    }
    setMagicLinkStatus("sent");
  };

  // Try several lookup keys. We may have orderId from the store, or we may
  // need to fall back to the most recent order for this email.
  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      const orderId = q.orderId;
      const email = q.buyer_email?.trim().toLowerCase();

      let row: OrderRow | null = null;

      if (orderId) {
        const { data } = await supabase
          .from("orders")
          .select(
            "id, buyer_email, buyer_name, recipient_name, relationship, genre, tempo, voice, song_title_idea, amount_cents, amount_paid_cents, currency, has_3rd_verse, is_rush, has_unlimited_edits, delivery_date, is_gift, recipient_email, created_at, product_config"
          )
          .eq("id", orderId)
          .maybeSingle();
        row = (data as OrderRow | null) ?? null;
      }

      if (!row && email) {
        const { data } = await supabase
          .from("orders")
          .select(
            "id, buyer_email, buyer_name, recipient_name, relationship, genre, tempo, voice, song_title_idea, amount_cents, amount_paid_cents, currency, has_3rd_verse, is_rush, has_unlimited_edits, delivery_date, is_gift, recipient_email, created_at, product_config"
          )
          .eq("buyer_email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        row = (data as OrderRow | null) ?? null;
      }

      if (!cancelled) {
        setOrder(row);
        setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [q.orderId, q.buyer_email]);

  const recipient =
    order?.recipient_name || q.recipient_name || "your loved one";
  const buyerEmail = order?.buyer_email || q.buyer_email || "";
  const buyerName = order?.buyer_name || q.buyer_name || "";

  const deliverySpeed: DeliverySpeed = order
    ? getDeliverySpeed(order)
    : "standard";

  const deliveryDate = useMemo(() => {
    if (order?.delivery_date) return order.delivery_date;
    if (order) return formatDeliveryDate(order.created_at, deliverySpeed);
    return formatDeliveryDate(new Date().toISOString(), "standard");
  }, [order, deliverySpeed]);

  const deliveryWindow = deliveryLabelFor(deliverySpeed);

  const amountPaid = order
    ? formatMoney(order.amount_paid_cents || order.amount_cents, order.currency)
    : null;

  const orderRef = order ? order.id.slice(0, 8).toUpperCase() : null;

  const deliveryAddOnLabel: string | false =
    deliverySpeed === "24h"
      ? "24-hour delivery"
      : deliverySpeed === "48h"
        ? "48-hour delivery"
        : false;

  const upgrades = order
    ? ([
        order.has_3rd_verse && "Extra verse",
        deliveryAddOnLabel,
        order.has_unlimited_edits && "Unlimited edits",
      ].filter(Boolean) as string[])
    : [];

  return (
    <div className="min-h-screen bg-gradient-warm pb-16 sm:pb-24">
      {/* Themed progress: Payment ✓, Bonus ✓, Final confirmation (current) */}
      <CheckoutProgress current={3} />

      {/* Success bar — mirrors the warning bar on upsell pages */}
      <div className="w-full border-b border-success/40 bg-success/15">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-2.5 text-center">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <p className="text-xs font-semibold text-success md:text-sm">
            Your order is processed. We took your confirmation and sent it to
            production.
          </p>
        </div>
      </div>

      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Order confirmed
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-10">
        {/* Hero confirmation */}
        <section className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 ring-4 ring-success/5 sm:h-20 sm:w-20 sm:ring-8">
            <CheckCircle2 className="h-8 w-8 text-success sm:h-12 sm:w-12" />
          </div>
          <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-[1.05] text-foreground sm:mt-6 sm:text-4xl md:text-5xl">
            Thank you{buyerName ? `, ${buyerName.split(" ")[0]}` : ""}!
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-balance text-[15px] leading-relaxed text-muted-foreground sm:mt-4 sm:text-base md:text-lg">
            Your order is confirmed. We've started crafting{" "}
            <span className="font-semibold text-primary">{recipient}</span>'s
            personalized RibbonSong.
          </p>

          {orderRef && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-peach bg-card px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground sm:mt-4 sm:px-4 sm:py-1.5 sm:text-xs">
              ORDER #{orderRef}
            </p>
          )}
        </section>

        {/* Order summary */}
        <section className="mt-6 rounded-2xl border border-peach/70 bg-card p-4 shadow-card sm:mt-8 sm:rounded-3xl sm:p-6 md:p-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            <Music2 className="h-5 w-5 text-primary" /> Order summary
          </h2>

          {loading ? (
            <div className="mt-5 space-y-3 sm:mt-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-5 w-full animate-pulse rounded bg-peach/40"
                />
              ))}
            </div>
          ) : (
            <>
              <dl className="mt-5 space-y-2.5 text-[14px] sm:mt-6 sm:space-y-3 sm:text-[15px]">
                <Row label="Song for" value={recipient} highlight />
                {order?.relationship && (
                  <Row label="Relationship" value={order.relationship} />
                )}
                {order?.genre && <Row label="Genre" value={order.genre} />}
                {order?.tempo && <Row label="Tempo" value={order.tempo} />}
                {order?.voice && <Row label="Voice" value={order.voice} />}
                {order?.song_title_idea && (
                  <Row label="Title idea" value={order.song_title_idea} />
                )}
                {upgrades.length > 0 && (
                  <Row label="Add-ons" value={upgrades.join(" · ")} />
                )}
              </dl>

              <div className="my-4 border-t border-dashed border-peach sm:my-5" />

              <div className="space-y-2.5 text-[14px] sm:space-y-3 sm:text-[15px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" /> Confirmation sent to
                  </span>
                  <span className="break-all text-right font-semibold text-foreground">
                    {buyerEmail}
                  </span>
                </div>

                {order?.is_gift && order.recipient_email && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Send className="h-4 w-4 shrink-0" /> Gift delivery to
                    </span>
                    <span className="break-all text-right font-semibold text-foreground">
                      {order.recipient_email}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" /> Expected delivery
                  </span>
                  <span className="text-right font-semibold text-primary">
                    {deliveryDate}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 shrink-0" /> Delivery speed
                  </span>
                  <span className="text-right font-semibold text-foreground">
                    {deliveryWindow}
                  </span>
                </div>
              </div>

              {amountPaid && (
                <>
                  <div className="my-4 border-t border-dashed border-peach sm:my-5" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-foreground">
                      Total paid
                    </span>
                    <span className="font-display text-xl font-bold text-primary sm:text-2xl">
                      {amountPaid}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* Gold guarantee box — single adaptive safety net based on upsells.
            Customers who bought "Unlimited edits" get the re-recordings angle.
            Everyone else (and especially higher-spend orders) sees the refund
            angle, since that's the strongest reassurance for a bigger purchase. */}
        {(() => {
          const hasUnlimitedEdits = !!order?.has_unlimited_edits;

          // Headline / icon / body adapt to what the customer actually bought.
          const safetyNet = hasUnlimitedEdits
            ? {
                badge: "Unlimited edits is active",
                title: "Unlimited re-writes — until it's perfect",
                Icon: Music2,
                lead: (
                  <>
                    You upgraded to unlimited edits, so we'll keep refining{" "}
                    <span className="font-semibold text-amber-950">
                      {recipient}
                    </span>
                    's song — voice, lyrics, vibe, tempo — as many times as you
                    need, at no extra cost.
                  </>
                ),
                bullet: "Every revision is free. No limits, no surprise fees.",
                footer:
                  "We don't stop until you'd happily hit play in front of them.",
              }
            : {
                badge: "Our promise to you",
                title: "Love it — or your money back",
                Icon: ShieldCheck,
                lead: (
                  <>
                    If{" "}
                    <span className="font-semibold text-amber-950">
                      {recipient}
                    </span>
                    's song isn't the gift you imagined, you're covered by our
                    30-day money-back guarantee.
                  </>
                ),
                bullet:
                  "Request a full refund within 30 days from your dashboard — no questions, no hassle.",
                footer:
                  "That's how confident we are. Your gift will land — or your money comes back.",
              };

          const Icon = safetyNet.Icon;

          return (
            <section className="relative mt-5 overflow-hidden rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/80 p-5 shadow-[0_8px_30px_-10px_rgba(217,164,6,0.45)] sm:mt-6 sm:rounded-3xl sm:p-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-yellow-300/30 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 sm:text-[11px]">
                  <Sparkles className="h-3 w-3" /> {safetyNet.badge}
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-amber-950 sm:text-2xl">
                  {safetyNet.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80 sm:text-sm">
                  {safetyNet.lead}
                </p>

                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-400/40 bg-white/40 p-3 text-[13px] sm:p-4 sm:text-sm">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/40">
                    <Icon className="h-4 w-4 text-amber-800" />
                  </div>
                  <p className="text-amber-900/90">{safetyNet.bullet}</p>
                </div>

                <p className="mt-4 border-t border-amber-400/40 pt-3 text-[12px] italic text-amber-900/70 sm:text-[13px]">
                  {safetyNet.footer}
                </p>
              </div>
            </section>
          );
        })()}

        <section className="mt-5 rounded-2xl border border-peach/70 bg-card p-4 shadow-soft sm:mt-6 sm:rounded-3xl sm:p-6 md:p-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            <Sparkles className="h-5 w-5 text-primary" /> What happens next
          </h2>

          <ol className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            <Step
              icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="We're writing the lyrics now"
              description="Our team is turning your story into a heartfelt song concept and lyric draft."
              eta="Today"
              active
            />
            <Step
              icon={<Music2 className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Recording your song"
              description={`We bring it to life in the ${order?.genre ?? "style"} you chose, with the voice and tempo you picked.`}
              eta={deliveryWindow}
            />
            <Step
              icon={<Headphones className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Quality check"
              description="A real human listens to every song before it goes out. No shortcuts."
              eta="Before delivery"
            />
            <Step
              icon={<Send className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Delivered to your inbox"
              description={`We'll email ${buyerEmail || "you"} a private link to listen, share, and download.`}
              eta={deliveryDate}
              last
            />
          </ol>
        </section>

        {/* Reassurance */}
        <section className="mt-5 rounded-2xl border border-peach/70 bg-card p-4 shadow-soft sm:mt-6 sm:rounded-3xl sm:p-6 md:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground sm:text-xl">
            <Heart className="h-5 w-5 text-primary" /> You're in good hands
          </h3>
          <ul className="mt-3 space-y-2.5 text-[13px] text-muted-foreground sm:mt-4 sm:space-y-3 sm:text-sm">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold text-foreground">
                  30-day money-back guarantee.
                </span>{" "}
                If you're not happy, we'll refund you, no questions asked.
              </span>
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold text-foreground">
                  Need to add or change something?
                </span>{" "}
                Just reply to your confirmation email. We read every one.
              </span>
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold text-foreground">
                  Track your order anytime
                </span>{" "}
                from your dashboard.
              </span>
            </li>
          </ul>

          {magicLinkStatus === "sent" ? (
            <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-center sm:mt-6 sm:rounded-2xl sm:p-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                <Mail className="h-5 w-5 text-success" />
              </div>
              <p className="mt-2.5 font-display text-base font-bold text-foreground sm:text-lg">
                Check your inbox
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                We just sent a one-tap sign-in link to{" "}
                <span className="break-all font-semibold text-foreground">
                  {buyerEmail}
                </span>
                . Open it on this device to land in your dashboard instantly.
              </p>
            </div>
          ) : (
            <DashboardCta
              buyerEmail={buyerEmail}
              fallbackSendMagicLink={() => sendMagicLink(buyerEmail)}
              magicLinkStatus={magicLinkStatus}
            />
          )}
          {magicLinkStatus === "error" && magicLinkError && (
            <p className="mt-2 text-center text-xs font-medium text-destructive">
              {magicLinkError}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * If the buyer was auto-signed-in at /checkout/return, this button is a
 * direct link to /dashboard. If auto-login failed (e.g. cookies blocked),
 * we fall back to sending a magic-link email — same UX as before.
 */
function DashboardCta({
  buyerEmail,
  fallbackSendMagicLink,
  magicLinkStatus,
}: {
  buyerEmail: string;
  fallbackSendMagicLink: () => void;
  magicLinkStatus: "idle" | "sending" | "sent" | "error";
}) {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(!!data.session);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasSession) {
    return (
      <a
        href="/dashboard"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[15px] font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] sm:mt-6 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
      >
        Go to my dashboard <ArrowRight className="h-4 w-4" />
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={fallbackSendMagicLink}
        disabled={magicLinkStatus === "sending" || !buyerEmail}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[15px] font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:mt-6 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
      >
        {magicLinkStatus === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending sign in link…
          </>
        ) : (
          <>
            Email me a sign in link <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      {buyerEmail && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-xs">
          We'll email a one tap sign in link to{" "}
          <span className="font-semibold text-foreground">{buyerEmail}</span>.
          No password needed.
        </p>
      )}
    </>
  );
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function Row({ label, value, highlight }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? "text-right font-semibold text-primary"
            : "text-right font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

interface StepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  eta: string;
  active?: boolean;
  last?: boolean;
}

function Step({ icon, title, description, eta, active, last }: StepProps) {
  return (
    <li className="relative flex gap-4">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-5 top-12 h-[calc(100%-12px)] w-px bg-peach"
        />
      )}
      <span
        className={
          active
            ? "relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
            : "relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-peach bg-background text-muted-foreground"
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          <span
            className={
              active
                ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary"
                : "text-xs font-medium text-muted-foreground"
            }
          >
            {eta}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </li>
  );
}
