// Admin debug panel: latest Stripe webhook events + orders stuck in
// `checkout_started` whose Stripe webhook never arrived. Read-only.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type StripeEvent = {
  event_id: string;
  event_type: string | null;
  processed: boolean;
  received_at: string;
  payload: any;
};

type StuckOrder = {
  id: string;
  buyer_email: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_env: string | null;
  created_at: string;
};

// "Stuck" = order created more than this many minutes ago, still in
// checkout_started, with a payment intent recorded but no matching webhook.
const STUCK_THRESHOLD_MIN = 10;
const STUCK_LOOKBACK_HOURS = 72;

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
  }).format(cents / 100);
}

export function WebhookDebugPanel() {
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [stuck, setStuck] = useState<StuckOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(
        Date.now() - STUCK_LOOKBACK_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const [{ data: evRows, error: evErr }, { data: orderRows, error: orderErr }] =
        await Promise.all([
          supabase
            .from("stripe_events")
            .select("event_id, event_type, processed, received_at, payload")
            .order("received_at", { ascending: false })
            .limit(50),
          supabase
            .from("orders")
            .select(
              "id, buyer_email, amount_cents, currency, status, payment_status, stripe_payment_intent_id, stripe_checkout_session_id, stripe_env, created_at",
            )
            .eq("status", "checkout_started")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      if (evErr) throw evErr;
      if (orderErr) throw orderErr;

      setEvents((evRows || []) as StripeEvent[]);

      // Filter to "really stuck": created > threshold ago AND has a
      // payment_intent / session id we'd expect a webhook for.
      const cutoff = Date.now() - STUCK_THRESHOLD_MIN * 60 * 1000;
      const filtered = (orderRows || []).filter((o: any) => {
        const created = new Date(o.created_at).getTime();
        if (created > cutoff) return false; // too fresh — webhook may still arrive
        return Boolean(o.stripe_payment_intent_id || o.stripe_checkout_session_id);
      }) as StuckOrder[];
      setStuck(filtered);

      setLastLoaded(new Date());
    } catch (e: any) {
      console.error("WebhookDebugPanel load failed", e);
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, []);

  // Cross-reference: for each stuck order, is there a webhook in stripe_events
  // whose payload references its payment_intent_id? Helps distinguish
  // "webhook never came" from "webhook came but processing failed".
  const stuckWithWebhookFlag = useMemo(() => {
    return stuck.map((o) => {
      const pi = o.stripe_payment_intent_id;
      const sid = o.stripe_checkout_session_id;
      const matchingEvent = pi || sid
        ? events.find((ev) => {
            const blob = JSON.stringify(ev.payload || {});
            return (pi && blob.includes(pi)) || (sid && blob.includes(sid));
          })
        : undefined;
      return { order: o, matchingEvent };
    });
  }, [stuck, events]);

  const recentEventStats = useMemo(() => {
    const total = events.length;
    const processed = events.filter((e) => e.processed).length;
    const failed = total - processed;
    const oldestIso = events[events.length - 1]?.received_at;
    const newestIso = events[0]?.received_at;
    return { total, processed, failed, oldestIso, newestIso };
  }, [events]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Webhook debug</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Latest Stripe events + orders stuck in <code className="text-xs bg-muted px-1 py-0.5 rounded">checkout_started</code>.
            Auto-refreshes every 30s.
          </p>
          {lastLoaded && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated {formatTimeAgo(lastLoaded.toISOString())}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Webhook events (last 50)" value={recentEventStats.total} />
        <StatCard
          label="Processed"
          value={recentEventStats.processed}
          tone="ok"
        />
        <StatCard
          label="Unprocessed"
          value={recentEventStats.failed}
          tone={recentEventStats.failed > 0 ? "warn" : "neutral"}
        />
        <StatCard
          label="Stuck orders"
          value={stuck.length}
          tone={stuck.length > 0 ? "danger" : "ok"}
        />
      </div>

      {/* Stuck orders */}
      <section>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Stuck in checkout_started
          <Badge variant="outline" className="ml-1 text-[10px]">
            &gt;{STUCK_THRESHOLD_MIN}m old · last {STUCK_LOOKBACK_HOURS}h
          </Badge>
        </h3>
        {loading && stuck.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : stuck.length === 0 ? (
          <div className="rounded-md border border-border bg-card/50 px-4 py-6 text-sm text-muted-foreground text-center">
            <CheckCircle2 className="h-5 w-5 inline mr-2 text-emerald-500" />
            No stuck orders. Webhook pipeline looks healthy.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Order</th>
                  <th className="text-left px-3 py-2 font-medium">Buyer</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Env</th>
                  <th className="text-left px-3 py-2 font-medium">Payment intent</th>
                  <th className="text-left px-3 py-2 font-medium">Webhook seen?</th>
                  <th className="text-left px-3 py-2 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                {stuckWithWebhookFlag.map(({ order, matchingEvent }) => (
                  <tr
                    key={order.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-2">{order.buyer_email}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(order.amount_cents, order.currency)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          order.stripe_env === "live"
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {order.stripe_env || "?"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {order.stripe_payment_intent_id?.slice(0, 18) || "—"}
                      {order.stripe_payment_intent_id && order.stripe_payment_intent_id.length > 18 && "…"}
                    </td>
                    <td className="px-3 py-2">
                      {matchingEvent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          received, not processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="h-3 w-3" />
                          missing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatTimeAgo(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Latest events */}
      <section>
        <h3 className="font-display text-lg font-semibold mb-3">
          Latest Stripe webhook events
        </h3>
        {loading && events.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : events.length === 0 ? (
          <div className="rounded-md border border-border bg-card/50 px-4 py-6 text-sm text-muted-foreground text-center">
            <XCircle className="h-5 w-5 inline mr-2 text-destructive" />
            No Stripe webhook events recorded yet. Check that the webhook
            endpoint and signing secret are configured in Stripe.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Received</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Event ID</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr
                    key={ev.event_id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(ev.received_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {ev.event_type || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {ev.processed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {ev.event_id.slice(0, 28)}
                      {ev.event_id.length > 28 && "…"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card/50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
