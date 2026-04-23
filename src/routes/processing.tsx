import { createFileRoute, Link } from "@tanstack/react-router";
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
    <div className="min-h-screen bg-gradient-warm pb-24">
      {/* Themed progress: Payment ✓ → Bonus ✓ → Log in (current) */}
      <CheckoutProgress current={3} />

      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Order confirmed
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">
        {/* Hero confirmation */}
        <section className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 ring-8 ring-success/5">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] text-foreground md:text-5xl">
            Thank you{buyerName ? `, ${buyerName.split(" ")[0]}` : ""}!
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Your order is confirmed. We've started crafting{" "}
            <span className="font-semibold text-primary">{recipient}</span>'s
            personalized RibbonSong.
          </p>

          {orderRef && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-peach bg-card px-4 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground">
              ORDER #{orderRef}
            </p>
          )}
        </section>

        {/* Order summary */}
        <section className="mt-8 rounded-3xl border border-peach/70 bg-card p-6 shadow-card md:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Music2 className="h-5 w-5 text-primary" /> Order Summary
          </h2>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-5 w-full animate-pulse rounded bg-peach/40"
                />
              ))}
            </div>
          ) : (
            <>
              <dl className="mt-6 space-y-3 text-[15px]">
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

              <div className="my-5 border-t border-dashed border-peach" />

              <div className="space-y-3 text-[15px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> Confirmation sent to
                  </span>
                  <span className="text-right font-semibold text-foreground">
                    {buyerEmail}
                  </span>
                </div>

                {order?.is_gift && order.recipient_email && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Send className="h-4 w-4" /> Gift delivery to
                    </span>
                    <span className="text-right font-semibold text-foreground">
                      {order.recipient_email}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Expected delivery
                  </span>
                  <span className="text-right font-semibold text-primary">
                    {deliveryLabel}
                  </span>
                </div>
              </div>

              {amountPaid && (
                <>
                  <div className="my-5 border-t border-dashed border-peach" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-foreground">
                      Total paid
                    </span>
                    <span className="font-display text-2xl font-bold text-primary">
                      {amountPaid}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {/* What happens next */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" /> What Happens Next
          </h2>

          <ol className="mt-6 space-y-5">
            <Step
              icon={<Sparkles className="h-5 w-5" />}
              title="We're writing the lyrics now"
              description="Our team is turning your story into a heartfelt song concept and lyric draft."
              eta="Today"
              active
            />
            <Step
              icon={<Music2 className="h-5 w-5" />}
              title="Recording your song"
              description={`We bring it to life in the ${order?.genre ?? "style"} you chose, with the voice and tempo you picked.`}
              eta="Within 48 hours"
            />
            <Step
              icon={<Headphones className="h-5 w-5" />}
              title="Quality check"
              description="A real human listens to every song before it goes out — no shortcuts."
              eta="Before delivery"
            />
            <Step
              icon={<Send className="h-5 w-5" />}
              title="Delivered to your inbox"
              description={`We'll email ${buyerEmail || "you"} a private link to listen, share, and download.`}
              eta={deliveryLabel}
              last
            />
          </ol>
        </section>

        {/* Reassurance */}
        <section className="mt-6 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-8">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Heart className="h-5 w-5 text-primary" /> You're in good hands
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold text-foreground">
                  30-day money-back guarantee
                </span>{" "}
                — if you're not happy, we'll refund you, no questions asked.
              </span>
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold text-foreground">
                  Need to add or change something?
                </span>{" "}
                Just reply to your confirmation email — we read every one.
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

          <Link
            to="/dashboard"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:brightness-95 active:scale-[0.99]"
          >
            Go to my dashboard
          </Link>
        </section>
      </main>
    </div>
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
