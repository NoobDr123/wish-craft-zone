// Admin console — rebuilt with sidebar nav, dashboard-first layout.
// Sections: Dashboard, Funnel, CRM, Orders, Upsells, Emails, Samples,
// Refunds, Reactions, Revisions, IPs.
//
// Gated by:
//   1. Login (Supabase auth)
//   2. Admin role (user_roles table)
//   3. TOTP 2FA, re-prompted every 12 hours

import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShoppingBag,
  Sparkles,
  Mail,
  Music2,
  RotateCcw,
  Video,
  Pencil,
  Inbox,
  Activity,
  Search,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { AdminMfaEnroll } from "@/components/admin/AdminMfaEnroll";
import { AdminMfaChallenge } from "@/components/admin/AdminMfaChallenge";
import { WebhookDebugPanel } from "@/components/admin/WebhookDebugPanel";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

// Hosts that count as "real" production traffic for admin analytics.
// Sessions from preview/lovable.app domains are excluded so the admin
// panel only shows quiz responses captured on the live site.
const ALLOWED_HOSTS = ["getpawprintsong.com", "www.getpawprintsong.com"];

/** Fetch session_ids for sessions originating from allowed (production) hosts. */
async function fetchAllowedSessionIds(sinceIso?: string): Promise<Set<string>> {
  let q = supabase
    .from("page_sessions")
    .select("session_id")
    .in("host", ALLOWED_HOSTS)
    .limit(50000);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data } = await q;
  return new Set((data ?? []).map((r) => r.session_id));
}

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: "Staff · PawPrint Song" },
      { name: "robots", content: "noindex,nofollow,noarchive,nosnippet" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

function AdminRoute() {
  const location = useLocation();
  if (location.pathname === "/admin/login") return <Outlet />;
  return <StaffPage />;
}

type Tab =
  | "dashboard"
  | "funnel"
  | "crm"
  | "customers"
  | "orders"
  | "upsells"
  | "emails"
  | "samples"
  | "refunds"
  | "reactions"
  | "revisions"
  | "support"
  | "webhooks";

const NAV: Array<{ key: Tab; label: string; icon: any; group: string }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "funnel", label: "Funnel", icon: TrendingUp, group: "Overview" },
  { key: "crm", label: "CRM", icon: Users, group: "Overview" },
  { key: "customers", label: "Customer explorer", icon: Search, group: "Overview" },
  { key: "orders", label: "Orders", icon: ShoppingBag, group: "Operations" },
  { key: "upsells", label: "Upsells", icon: Sparkles, group: "Operations" },
  { key: "emails", label: "Emails", icon: Mail, group: "Operations" },
  { key: "samples", label: "Samples", icon: Music2, group: "Content" },
  { key: "support", label: "Support inbox", icon: Inbox, group: "Support" },
  { key: "refunds", label: "Refunds", icon: RotateCcw, group: "Support" },
  { key: "reactions", label: "Reactions", icon: Video, group: "Support" },
  { key: "revisions", label: "Revisions", icon: Pencil, group: "Support" },
  { key: "webhooks", label: "Webhook debug", icon: Activity, group: "Debug" },
];

function StaffPage() {
  const { state, user, refresh } = useAdminGuard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (state === "anonymous") navigate({ to: "/admin/login" });
  }, [state, navigate]);

  if (state === "loading" || state === "anonymous") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (state === "not_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Logo />
          <h1 className="mt-6 font-display text-3xl font-semibold">Not found</h1>
          <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
          <Link to="/" className="mt-6 inline-block text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (state === "needs_enrollment" && user) {
    return <AdminMfaEnroll email={user.email ?? "admin"} userId={user.id} onEnrolled={refresh} />;
  }

  if (state === "needs_verification" && user) {
    return <AdminMfaChallenge userId={user.id} onVerified={refresh} />;
  }

  // Group nav items
  const groups: Record<string, typeof NAV> = {};
  for (const item of NAV) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Logo />
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-sm">Staff</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">2FA</Badge>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              LIVE
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-4">
              <div className="px-5 mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {group}
              </div>
              {items.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                    tab === key
                      ? "bg-primary/10 text-foreground font-medium border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-card hover:text-foreground border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
          >
            Exit to site
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-auto">
        <div className="px-8 py-8 max-w-[1400px]">
          {tab === "dashboard" && <DashboardPanel />}
          {tab === "funnel" && <FunnelPanel />}
          {tab === "crm" && <CrmPanel />}
          {tab === "customers" && <CustomerExplorerPanel />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "upsells" && <UpsellsPanel />}
          {tab === "emails" && <EmailsPanel />}
          {tab === "samples" && <SamplesPanel />}
          {tab === "refunds" && <RefundsPanel />}
          {tab === "reactions" && <ReactionsPanel />}
          {tab === "revisions" && <RevisionsPanel />}
          {tab === "support" && <SupportPanel />}
          {tab === "webhooks" && <WebhookDebugPanel />}
          
        </div>
      </main>
    </div>
  );
}

/* =====================================================================
   Shared helpers
   ===================================================================== */

// All admin date math is anchored to America/New_York (Eastern Time).
// "Today" and "Yesterday" mean the EST/EDT calendar day, not rolling 24h.
const ADMIN_TZ = "America/New_York";

type Range = "today" | "yesterday" | "24h" | "7d" | "30d" | "90d" | "mtd" | "ytd" | "all";
const RANGES: Range[] = ["today", "yesterday", "24h", "7d", "30d", "90d", "mtd", "ytd", "all"];

const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "24h": "Last 24h",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  mtd: "Month to date",
  ytd: "Year to date",
  all: "All time",
};

/** Get the Y/M/D parts for `now` as observed in the admin (EST) timezone. */
function estParts(now: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** Returns the UTC instant corresponding to midnight EST on the given EST y/m/d (offset days back). */
function estMidnightUtc(daysBackFromToday: number = 0): Date {
  const { year, month, day } = estParts();
  // Anchor at noon UTC of that EST day so DST shifts can't bump us a day.
  const anchor = new Date(Date.UTC(year, month - 1, day - daysBackFromToday, 12, 0, 0));
  // Compute EST offset for that anchor and subtract to land on EST midnight.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TZ,
    hour: "2-digit",
    hour12: false,
  });
  const estHour = Number(
    fmt.formatToParts(anchor).find((p) => p.type === "hour")?.value ?? "12",
  );
  const offsetHours = 12 - estHour; // hours to subtract from anchor to get EST midnight in UTC
  return new Date(anchor.getTime() - offsetHours * 60 * 60 * 1000);
}

function rangeStart(r: Range): Date | null {
  if (r === "all") return null;
  if (r === "24h") {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d;
  }
  if (r === "today") return estMidnightUtc(0);
  if (r === "yesterday") return estMidnightUtc(1);
  if (r === "7d") return estMidnightUtc(6);
  if (r === "30d") return estMidnightUtc(29);
  if (r === "90d") return estMidnightUtc(89);
  if (r === "mtd") {
    const { year, month } = estParts();
    return estMidnightUtcFor(year, month, 1);
  }
  if (r === "ytd") {
    const { year } = estParts();
    return estMidnightUtcFor(year, 1, 1);
  }
  return null;
}

/** Like estMidnightUtc but for an arbitrary EST y/m/d. */
function estMidnightUtcFor(year: number, month: number, day: number): Date {
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TZ,
    hour: "2-digit",
    hour12: false,
  });
  const estHour = Number(
    fmt.formatToParts(anchor).find((p) => p.type === "hour")?.value ?? "12",
  );
  const offsetHours = 12 - estHour;
  return new Date(anchor.getTime() - offsetHours * 60 * 60 * 1000);
}

/** Optional end-of-range cap (used only for "yesterday" — needs an upper bound). */
function rangeEnd(r: Range): Date | null {
  if (r === "yesterday") return estMidnightUtc(0);
  return null;
}

/** Format a UTC ISO timestamp as a YYYY-MM-DD string in EST. Used for daily grouping. */
function estDateKey(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(iso));
}

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
            value === r
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          {RANGE_LABELS[r]}
        </button>
      ))}
      <span className="ml-2 self-center text-[10px] uppercase tracking-wider text-muted-foreground">
        EST
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "success" | "warn" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-destructive"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtPct(num: number, denom: number) {
  if (denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function fmtMs(ms: number | null | undefined) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

/* =====================================================================
   Dashboard
   ===================================================================== */

interface DashboardData {
  revenueCents: number;
  orderCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  aovCents: number;
  upsellCounts: { extra_verse: number; rush_delivery: number; unlimited_edits: number };
  dailySales: { date: string; cents: number; orders: number }[];
  // Funnel/conversion (within selected range, production hosts only)
  uniqueVisitors: number;
  quizStarts: number;
  quizCompletes: number;
  checkoutViews: number;
  cardStarted: number;
  quizCompletionPct: number;
  conversionPct: number; // paid / uniqueVisitors
  checkoutToPaidPct: number; // paid / cardStarted
  // Lifetime customer metrics (all-time, ignores range)
  lifetimeCustomerCount: number;
  lifetimeRevenueCents: number;
  lifetimeLtvCents: number;
  lifetimeRepeatPct: number;
  // Recent orders (paid only, latest 10 in range)
  recentOrders: Array<{
    id: string;
    created_at: string;
    buyer_email: string;
    buyer_name: string | null;
    amount_paid_cents: number;
    payment_status: string;
    status: string;
  }>;
}

function DashboardPanel() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveVisitors, setLiveVisitors] = useState<number>(0);
  const [liveCardEntering, setLiveCardEntering] = useState<number>(0);

  const load = async (signal?: { active: boolean }) => {
    setLoading(true);
    const start = rangeStart(range);
    const end = rangeEnd(range);

    // ---- Orders in range
    let ordersQ = supabase
      .from("orders")
      .select("id, buyer_email, buyer_name, customer_name, amount_paid_cents, amount_cents, payment_status, status, has_3rd_verse, is_rush, has_unlimited_edits, created_at")
      .not("buyer_email", "like", "pending+%@getpawprintsong.com")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (start) ordersQ = ordersQ.gte("created_at", start.toISOString());
    if (end) ordersQ = ordersQ.lt("created_at", end.toISOString());

    // ---- Quiz events in range (for conversion + completion rate)
    let quizQ = supabase
      .from("quiz_events")
      .select("session_id, event_type, created_at")
      .in("event_type", ["lander_view", "quiz_start", "quiz_complete", "checkout_view", "checkout_card_started"])
      .order("created_at", { ascending: false })
      .limit(20000);
    if (start) quizQ = quizQ.gte("created_at", start.toISOString());
    if (end) quizQ = quizQ.lt("created_at", end.toISOString());

    // ---- Lifetime customer rollup (all-time, paid orders only)
    const lifetimeQ = supabase
      .from("orders")
      .select("buyer_email, amount_paid_cents, payment_status")
      .not("buyer_email", "like", "pending+%@getpawprintsong.com")
      .in("payment_status", ["paid", "succeeded"])
      .limit(20000);

    const allowedSessions = await fetchAllowedSessionIds(start?.toISOString());

    const [{ data: rows }, { data: quizEvents }, { data: lifetimeRows }] = await Promise.all([
      ordersQ,
      quizQ,
      lifetimeQ,
    ]);
    if (signal && !signal.active) return;

    const orders = rows ?? [];
    const paid = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "succeeded");
    const failed = orders.filter((o) => o.payment_status === "failed");
    const pending = orders.filter((o) => o.payment_status === "pending");
    const revenueCents = paid.reduce((s, o) => s + (o.amount_paid_cents ?? 0), 0);
    const aovCents = paid.length > 0 ? Math.round(revenueCents / paid.length) : 0;

    // Daily sales grouped by EST date
    const byDay: Record<string, { cents: number; orders: number }> = {};
    for (const o of paid) {
      const d = estDateKey(o.created_at);
      if (!byDay[d]) byDay[d] = { cents: 0, orders: 0 };
      byDay[d].cents += o.amount_paid_cents ?? 0;
      byDay[d].orders += 1;
    }
    const dailySales = Object.entries(byDay)
      .map(([date, v]) => ({ date, cents: v.cents, orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Funnel from quiz events (production sessions only)
    const evts = (quizEvents ?? []).filter((e) => allowedSessions.has(e.session_id));
    const landers = new Set<string>();
    const starts = new Set<string>();
    const completes = new Set<string>();
    const checkoutViews = new Set<string>();
    const cardStarteds = new Set<string>();
    for (const e of evts) {
      if (e.event_type === "lander_view") landers.add(e.session_id);
      if (e.event_type === "quiz_start") starts.add(e.session_id);
      if (e.event_type === "quiz_complete") completes.add(e.session_id);
      if (e.event_type === "checkout_view") checkoutViews.add(e.session_id);
      if (e.event_type === "checkout_card_started") cardStarteds.add(e.session_id);
    }
    const uniqueVisitors = landers.size;
    const quizStarts = starts.size;
    const quizCompletes = completes.size;
    const quizCompletionPct = quizStarts > 0 ? (quizCompletes / quizStarts) * 100 : 0;
    const conversionPct = uniqueVisitors > 0 ? (paid.length / uniqueVisitors) * 100 : 0;
    const checkoutToPaidPct = cardStarteds.size > 0 ? (paid.length / cardStarteds.size) * 100 : 0;

    // Lifetime customer/LTV (all-time)
    const ltvByEmail: Record<string, { cents: number; orders: number }> = {};
    for (const o of lifetimeRows ?? []) {
      const email = (o.buyer_email ?? "").toLowerCase();
      if (!email) continue;
      if (!ltvByEmail[email]) ltvByEmail[email] = { cents: 0, orders: 0 };
      ltvByEmail[email].cents += o.amount_paid_cents ?? 0;
      ltvByEmail[email].orders += 1;
    }
    const lifetimeCustomerCount = Object.keys(ltvByEmail).length;
    const lifetimeRevenueCents = Object.values(ltvByEmail).reduce((s, v) => s + v.cents, 0);
    const lifetimeLtvCents = lifetimeCustomerCount > 0 ? Math.round(lifetimeRevenueCents / lifetimeCustomerCount) : 0;
    const repeatBuyers = Object.values(ltvByEmail).filter((v) => v.orders > 1).length;
    const lifetimeRepeatPct = lifetimeCustomerCount > 0 ? (repeatBuyers / lifetimeCustomerCount) * 100 : 0;

    const recentOrders = paid.slice(0, 10).map((o) => ({
      id: o.id,
      created_at: o.created_at,
      buyer_email: o.buyer_email,
      buyer_name: o.buyer_name ?? o.customer_name ?? null,
      amount_paid_cents: o.amount_paid_cents ?? 0,
      payment_status: o.payment_status,
      status: o.status,
    }));

    setData({
      revenueCents,
      orderCount: orders.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      aovCents,
      upsellCounts: {
        extra_verse: paid.filter((o) => o.has_3rd_verse).length,
        rush_delivery: paid.filter((o) => o.is_rush).length,
        unlimited_edits: paid.filter((o) => o.has_unlimited_edits).length,
      },
      dailySales,
      uniqueVisitors,
      quizStarts,
      quizCompletes,
      checkoutViews: checkoutViews.size,
      cardStarted: cardStarteds.size,
      quizCompletionPct,
      conversionPct,
      checkoutToPaidPct,
      lifetimeCustomerCount,
      lifetimeRevenueCents,
      lifetimeLtvCents,
      lifetimeRepeatPct,
      recentOrders,
    });
    setLoading(false);
  };

  // Live visitors: distinct sessions on a production host active in the last 5 min.
  const loadLive = async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const [{ data: rows }, { data: cardEvts }] = await Promise.all([
      supabase
        .from("page_sessions")
        .select("session_id")
        .in("host", ALLOWED_HOSTS)
        .gte("last_seen_at", fiveMinAgo)
        .limit(2000),
      supabase
        .from("quiz_events")
        .select("session_id")
        .eq("event_type", "checkout_card_started")
        .gte("created_at", fiveMinAgo)
        .limit(500),
    ]);
    const unique = new Set((rows ?? []).map((r) => r.session_id));
    setLiveVisitors(unique.size);
    const liveCards = new Set((cardEvts ?? []).map((r) => r.session_id));
    setLiveCardEntering(liveCards.size);
  };

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => { signal.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Refresh "live" count every 20s.
  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 20_000);
    return () => clearInterval(t);
  }, []);

  useRealtimeRefresh("orders", () => load());
  useRealtimeRefresh("quiz_events", () => load(), { debounceMs: 2000 });

  if (loading || !data) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="text-muted-foreground">Loading…</div>
      </>
    );
  }

  const maxCents = Math.max(1, ...data.dailySales.map((d) => d.cents));

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Revenue, conversion, customers, and live activity. All times in Eastern Time (EST/EDT).</p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Live + headline KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Live on site
          </div>
          <div className="mt-2 font-display text-3xl font-semibold text-emerald-700">{liveVisitors}</div>
          <div className="mt-1 text-xs text-muted-foreground">active in the last 5 min</div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 ${liveCardEntering > 0 ? "animate-ping" : ""}`}></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            Entering card now
          </div>
          <div className="mt-2 font-display text-3xl font-semibold text-amber-700">{liveCardEntering}</div>
          <div className="mt-1 text-xs text-muted-foreground">started typing card in last 5 min</div>
        </div>
        <StatCard label="Revenue" value={fmtMoney(data.revenueCents)} sub={`${data.paidCount} paid orders`} tone="success" />
        <StatCard label="AOV" value={fmtMoney(data.aovCents)} sub="avg order value" />
      </div>

      {/* Conversion + funnel rates */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Visitors"
          value={data.uniqueVisitors}
          sub="unique landers (prod)"
        />
        <StatCard
          label="Reached checkout"
          value={data.checkoutViews}
          sub={`${data.cardStarted} started entering card`}
        />
        <StatCard
          label="Conversion rate"
          value={data.uniqueVisitors > 0 ? `${data.conversionPct.toFixed(2)}%` : "—"}
          sub={`${data.paidCount} paid / ${data.uniqueVisitors} visitors`}
          tone={data.conversionPct > 0 ? "success" : "muted"}
        />
        <StatCard
          label="Card → paid"
          value={data.cardStarted > 0 ? `${data.checkoutToPaidPct.toFixed(1)}%` : "—"}
          sub={`${data.paidCount} paid / ${data.cardStarted} entered card`}
          tone={data.checkoutToPaidPct > 0 ? "success" : "muted"}
        />
      </div>

      {/* Quiz + failure rates */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Orders" value={data.orderCount} sub={`${data.paidCount} paid · ${data.pendingCount} pending`} />
        <StatCard
          label="Quiz completion"
          value={data.quizStarts > 0 ? `${data.quizCompletionPct.toFixed(1)}%` : "—"}
          sub={`${data.quizCompletes} of ${data.quizStarts} starts`}
        />
        <StatCard
          label="Failed payments"
          value={data.failedCount}
          tone={data.failedCount > 0 ? "danger" : "muted"}
        />
        <StatCard
          label="Abandoned at card"
          value={Math.max(0, data.cardStarted - data.paidCount)}
          sub="started card, never paid"
          tone={data.cardStarted - data.paidCount > 0 ? "danger" : "muted"}
        />
      </div>

      {/* Lifetime customer / LTV */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-1">Customers (all-time)</h2>
        <p className="text-sm text-muted-foreground mb-4">Lifetime value across every paying customer, regardless of the date range above.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Customers" value={data.lifetimeCustomerCount} sub="unique paying emails" />
          <StatCard label="Lifetime revenue" value={fmtMoney(data.lifetimeRevenueCents)} tone="success" />
          <StatCard label="LTV" value={fmtMoney(data.lifetimeLtvCents)} sub="avg revenue per customer" />
          <StatCard label="Repeat buyers" value={`${data.lifetimeRepeatPct.toFixed(1)}%`} sub="ordered more than once" />
        </div>
      </div>

      {/* Daily sales chart */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Daily sales</h2>
        <p className="text-sm text-muted-foreground">Revenue per day in the selected range (EST).</p>
        {data.dailySales.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No sales in this range.</p>
        ) : (
          <div className="mt-6 flex items-end gap-2 h-48">
            {data.dailySales.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
                  {fmtMoney(d.cents)}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${(d.cents / maxCents) * 100}%`, minHeight: "4px" }}
                  title={`${d.date}: ${fmtMoney(d.cents)} (${d.orders} orders)`}
                />
                <div className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap mt-2">
                  {d.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent paid orders</h2>
            <p className="text-sm text-muted-foreground">Latest sales in the selected range.</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{data.recentOrders.length} shown</Badge>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground">No paid orders in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-3">When (EST)</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-border/40">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: ADMIN_TZ,
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(o.created_at))}
                  </td>
                  <td className="p-3 font-medium">{o.buyer_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{o.buyer_email}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {o.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium text-emerald-600">
                    {fmtMoney(o.amount_paid_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upsell take rates */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-4">Upsell take rates</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UpsellCard label="Extra verse" count={data.upsellCounts.extra_verse} total={data.paidCount} priceCents={1999} />
          <UpsellCard label="Rush delivery (24h or 90min)" count={data.upsellCounts.rush_delivery} total={data.paidCount} priceCents={3999} />
          <UpsellCard label="Unlimited edits" count={data.upsellCounts.unlimited_edits} total={data.paidCount} priceCents={3299} />
        </div>
      </div>

      {/* Payment success */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-4">Payment performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Success rate" value={fmtPct(data.paidCount, data.paidCount + data.failedCount)} tone="success" />
          <StatCard label="Failed" value={data.failedCount} tone="danger" />
          <StatCard label="Pending" value={data.pendingCount} tone="warn" />
        </div>
      </div>
    </>
  );
}

function UpsellCard({
  label,
  count,
  total,
  priceCents,
}: {
  label: string;
  count: number;
  total: number;
  priceCents: number;
}) {
  const rate = total > 0 ? (count / total) * 100 : 0;
  const revenue = count * priceCents;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline">{fmtMoney(priceCents)}</Badge>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{rate.toFixed(1)}%</div>
      <div className="text-xs text-muted-foreground">{count} of {total} orders</div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${rate}%` }} />
      </div>
      <div className="mt-2 text-xs text-emerald-600 font-medium">+{fmtMoney(revenue)} revenue</div>
    </div>
  );
}

/* =====================================================================
   Funnel
   ===================================================================== */

interface FunnelData {
  landerViews: number;
  uniqueLanderSessions: number;
  quizStarts: number;
  quizCompletes: number;
  checkoutViews: number;
  paymentSuccesses: number;
  paymentFailures: number;
  questionStats: Array<{
    stepIndex: number;
    views: number;
    answers: number;
    avgTimeMs: number;
    dropoffPct: number;
  }>;
  avgQuizTimeMs: number;
}

const QUESTION_LABELS = [
  "1. Relationship + name",
  "2. Journey stage",
  "3. Their fight",
  "4. Their qualities",
  "5. Shared memory",
  "6. Theme",
  "7. Personal letter",
  "8. Sound",
  "9. Email/name",
  "10. Gift toggle",
];

function FunnelPanel() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (signal?: { active: boolean }) => {
    setLoading(true);
    const start = rangeStart(range);
    const end = rangeEnd(range);
    const allowed = await fetchAllowedSessionIds(start?.toISOString());
    let q = supabase
      .from("quiz_events")
      .select("session_id, event_type, step_index, time_on_step_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (start) q = q.gte("created_at", start.toISOString());
    if (end) q = q.lt("created_at", end.toISOString());
    const { data: events } = await q;
    if (signal && !signal.active) return;
    // Filter to only events from production-host sessions (getpawprintsong.com).
    const evts = (events ?? []).filter((e) => allowed.has(e.session_id));

    const sessionsByType: Record<string, Set<string>> = {};
    const totalByType: Record<string, number> = {};
    for (const e of evts) {
      if (!sessionsByType[e.event_type]) sessionsByType[e.event_type] = new Set();
      sessionsByType[e.event_type].add(e.session_id);
      totalByType[e.event_type] = (totalByType[e.event_type] ?? 0) + 1;
    }

    const questionStats: FunnelData["questionStats"] = [];
    for (let i = 0; i < QUESTION_LABELS.length; i++) {
      const views = evts.filter((e) => e.event_type === "question_view" && e.step_index === i);
      const answers = evts.filter((e) => e.event_type === "question_answer" && e.step_index === i);
      const times = answers.map((a) => a.time_on_step_ms ?? 0).filter((t) => t > 0);
      const avgTimeMs = times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0;
      const nextViews = evts.filter((e) => e.event_type === "question_view" && e.step_index === i + 1);
      const dropoffPct = views.length > 0 ? Math.max(0, ((views.length - nextViews.length) / views.length) * 100) : 0;
      questionStats.push({
        stepIndex: i,
        views: views.length,
        answers: answers.length,
        avgTimeMs,
        dropoffPct: i === QUESTION_LABELS.length - 1 ? 0 : dropoffPct,
      });
    }

    const completes = evts.filter((e) => e.event_type === "quiz_complete" && (e.time_on_step_ms ?? 0) > 0);
    const avgQuizTimeMs =
      completes.length > 0
        ? completes.reduce((s, e) => s + (e.time_on_step_ms ?? 0), 0) / completes.length
        : 0;

    setData({
      landerViews: totalByType["lander_view"] ?? 0,
      uniqueLanderSessions: sessionsByType["lander_view"]?.size ?? 0,
      quizStarts: sessionsByType["quiz_start"]?.size ?? 0,
      quizCompletes: sessionsByType["quiz_complete"]?.size ?? 0,
      checkoutViews: sessionsByType["checkout_view"]?.size ?? 0,
      paymentSuccesses: sessionsByType["payment_success"]?.size ?? 0,
      paymentFailures: sessionsByType["payment_failed"]?.size ?? 0,
      questionStats,
      avgQuizTimeMs,
    });
    setLoading(false);
  };

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => { signal.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useRealtimeRefresh("quiz_events", () => load(), { debounceMs: 1500 });

  if (loading || !data) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">Funnel</h1>
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="text-muted-foreground">Loading…</div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Lander → Quiz → Checkout → Paid. Question-level retention and drop-off.
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Top funnel */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Lander views" value={data.uniqueLanderSessions} sub={`${data.landerViews} total`} />
        <StatCard
          label="Quiz starts"
          value={data.quizStarts}
          sub={`CTR: ${fmtPct(data.quizStarts, data.uniqueLanderSessions)}`}
          tone="success"
        />
        <StatCard
          label="Quiz completes"
          value={data.quizCompletes}
          sub={`${fmtPct(data.quizCompletes, data.quizStarts)} of starts`}
        />
        <StatCard
          label="Checkout views"
          value={data.checkoutViews}
          sub={`${fmtPct(data.checkoutViews, data.quizCompletes)} of completes`}
        />
        <StatCard
          label="Paid"
          value={data.paymentSuccesses}
          sub={`${fmtPct(data.paymentSuccesses, data.checkoutViews)} checkout conv.`}
          tone="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Avg quiz time" value={fmtMs(data.avgQuizTimeMs)} />
        <StatCard label="Lander → Paid" value={fmtPct(data.paymentSuccesses, data.uniqueLanderSessions)} tone="success" />
        <StatCard label="Payment failures" value={data.paymentFailures} tone={data.paymentFailures > 0 ? "danger" : "muted"} />
      </div>

      {/* Per-question table */}
      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display text-xl font-semibold">Per-question retention</h2>
          <p className="text-sm text-muted-foreground">
            How many users viewed each step, how long they spent, and how many dropped off.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="p-3">Question</th>
              <th className="p-3 text-right">Views</th>
              <th className="p-3 text-right">Answered</th>
              <th className="p-3 text-right">Conv.</th>
              <th className="p-3 text-right">Avg time</th>
              <th className="p-3 text-right">Drop-off</th>
              <th className="p-3 w-[200px]">Funnel</th>
            </tr>
          </thead>
          <tbody>
            {data.questionStats.map((s, i) => {
              const maxViews = Math.max(1, ...data.questionStats.map((q) => q.views));
              const widthPct = (s.views / maxViews) * 100;
              return (
                <tr key={i} className="border-t border-border/40">
                  <td className="p-3 font-medium">{QUESTION_LABELS[i]}</td>
                  <td className="p-3 text-right">{s.views}</td>
                  <td className="p-3 text-right">{s.answers}</td>
                  <td className="p-3 text-right">{fmtPct(s.answers, s.views)}</td>
                  <td className="p-3 text-right text-muted-foreground">{fmtMs(s.avgTimeMs)}</td>
                  <td className={`p-3 text-right font-medium ${s.dropoffPct > 30 ? "text-destructive" : s.dropoffPct > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                    {s.dropoffPct.toFixed(1)}%
                  </td>
                  <td className="p-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${widthPct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =====================================================================
   CRM
   ===================================================================== */

interface CrmCustomer {
  email: string;
  totalSpentCents: number;
  orderCount: number;
  lastOrderAt: string;
  firstOrderAt: string;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  hasUpsells: boolean;
  isGift: boolean;
  buyerName: string | null;
  orders: any[];
  emails: any[];
}

function CrmPanel() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<Record<string, any[]>>({});
  const [quizEvents, setQuizEvents] = useState<Record<string, any[]>>({});

  const load = async (signal?: { active: boolean }) => {
    setLoading(true);
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .not("buyer_email", "like", "pending+%@getpawprintsong.com")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (signal && !signal.active) return;

    const map: Record<string, CrmCustomer> = {};
    for (const o of orders ?? []) {
      const email = (o.buyer_email ?? "").toLowerCase();
      if (!email) continue;
      if (!map[email]) {
        map[email] = {
          email,
          totalSpentCents: 0,
          orderCount: 0,
          lastOrderAt: o.created_at,
          firstOrderAt: o.created_at,
          paidCount: 0,
          pendingCount: 0,
          failedCount: 0,
          hasUpsells: false,
          isGift: false,
          buyerName: o.buyer_name ?? o.customer_name ?? null,
          orders: [],
          emails: [],
        };
      }
      const c = map[email];
      c.orders.push(o);
      c.orderCount += 1;
      if (o.payment_status === "paid" || o.payment_status === "succeeded") {
        c.paidCount += 1;
        c.totalSpentCents += o.amount_paid_cents ?? 0;
      } else if (o.payment_status === "failed") {
        c.failedCount += 1;
      } else {
        c.pendingCount += 1;
      }
      if (o.has_3rd_verse || o.is_rush || o.has_unlimited_edits) c.hasUpsells = true;
      if (o.is_gift) c.isGift = true;
      if (o.created_at > c.lastOrderAt) c.lastOrderAt = o.created_at;
      if (o.created_at < c.firstOrderAt) c.firstOrderAt = o.created_at;
      if (!c.buyerName && (o.buyer_name || o.customer_name)) {
        c.buyerName = o.buyer_name ?? o.customer_name;
      }
    }

    setCustomers(
      Object.values(map).sort((a, b) => b.totalSpentCents - a.totalSpentCents),
    );
    setLoading(false);
  };

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => { signal.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtimeRefresh("orders", () => load());

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.email.includes(s) || (c.buyerName ?? "").toLowerCase().includes(s);
  });

  const toggleExpand = async (email: string) => {
    if (expanded === email) {
      setExpanded(null);
      return;
    }
    setExpanded(email);
    if (!emailLogs[email]) {
      const { data: logs } = await supabase
        .from("email_send_log")
        .select("template_name, status, error_message, created_at, message_id")
        .eq("recipient_email", email)
        .order("created_at", { ascending: false })
        .limit(50);
      setEmailLogs((m) => ({ ...m, [email]: logs ?? [] }));
    }
    if (!quizEvents[email]) {
      const { data: evts } = await supabase
        .from("quiz_events")
        .select("event_type, step_index, time_on_step_ms, created_at")
        .eq("buyer_email", email)
        .order("created_at", { ascending: true })
        .limit(200);
      setQuizEvents((m) => ({ ...m, [email]: evts ?? [] }));
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading customers…</div>;

  const totalLifetimeRevenue = customers.reduce((s, c) => s + c.totalSpentCents, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Every customer who's interacted. Click a row to see all their orders, emails, and quiz path.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Total customers" value={customers.length} />
        <StatCard label="Lifetime revenue" value={fmtMoney(totalLifetimeRevenue)} tone="success" />
        <StatCard label="With paid orders" value={customers.filter((c) => c.paidCount > 0).length} />
        <StatCard label="Repeat buyers" value={customers.filter((c) => c.paidCount > 1).length} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or name…"
        className="w-full mb-4 rounded-md border border-border bg-card px-4 py-2 text-sm"
      />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">Spent</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last order</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <>
                <tr
                  key={c.email}
                  onClick={() => toggleExpand(c.email)}
                  className="border-t border-border/40 cursor-pointer hover:bg-muted/30"
                >
                  <td className="p-3">
                    {expanded === c.email ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{c.buyerName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-medium">{c.orderCount}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.paidCount}p · {c.pendingCount}pe · {c.failedCount}f
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-emerald-600">{fmtMoney(c.totalSpentCents)}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.hasUpsells && <Badge variant="default" className="text-[10px]">upsells</Badge>}
                      {c.isGift && <Badge variant="outline" className="text-[10px]">gift</Badge>}
                      {c.paidCount > 1 && <Badge variant="outline" className="text-[10px]">repeat</Badge>}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(c.lastOrderAt).toLocaleDateString()}
                  </td>
                </tr>
                {expanded === c.email && (
                  <tr className="border-t border-border/40 bg-muted/20">
                    <td colSpan={6} className="p-6">
                      <CustomerDetail
                        customer={c}
                        emails={emailLogs[c.email] ?? []}
                        events={quizEvents[c.email] ?? []}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No customers.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CustomerDetail({
  customer,
  emails,
  events,
}: {
  customer: CrmCustomer;
  emails: any[];
  events: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Orders */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Orders ({customer.orders.length})</h3>
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-2">Recipient</th>
                <th className="p-2">Status</th>
                <th className="p-2">Payment</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Upsells</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o: any) => (
                <tr key={o.id} className="border-t border-border/40">
                  <td className="p-2">{o.dog_name}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                  <td className="p-2"><Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "failed" ? "destructive" : "outline"} className="text-[10px]">{o.payment_status}</Badge></td>
                  <td className="p-2 font-medium">{fmtMoney(o.amount_paid_cents ?? 0)}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {o.has_3rd_verse && <Badge variant="outline" className="text-[10px]">verse</Badge>}
                      {o.is_rush && <Badge variant="outline" className="text-[10px]">rush</Badge>}
                      {o.has_unlimited_edits && <Badge variant="outline" className="text-[10px]">edits</Badge>}
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emails */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Emails ({emails.length})</h3>
        {emails.length === 0 ? (
          <p className="text-xs text-muted-foreground">No emails sent.</p>
        ) : (
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="p-2">Template</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Sent</th>
                  <th className="p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {emails.slice(0, 20).map((e, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-2">{e.template_name}</td>
                    <td className="p-2">
                      <Badge variant={e.status === "sent" ? "default" : e.status === "dlq" || e.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                        {e.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2 text-destructive">{e.error_message?.slice(0, 60) ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz path */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Quiz path ({events.length} events)</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No quiz activity tracked.</p>
        ) : (
          <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <span className="font-mono">{new Date(e.created_at).toLocaleTimeString()}</span>
                <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                {e.step_index !== null && <span>step {e.step_index}</span>}
                {e.time_on_step_ms && <span>· {fmtMs(e.time_on_step_ms)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   Upsells panel
   ===================================================================== */

function UpsellsPanel() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<{ events: any[]; orders: any[] } | null>(null);

  const load = async (signal?: { active: boolean }) => {
    const start = rangeStart(range);
    const end = rangeEnd(range);
    const allowed = await fetchAllowedSessionIds(start?.toISOString());
    let eq = supabase
      .from("quiz_events")
      .select("event_type, upsell_type, amount_cents, created_at, session_id")
      .in("event_type", ["upsell_view", "upsell_accept", "upsell_decline"])
      .order("created_at", { ascending: false })
      .limit(5000);
    if (start) eq = eq.gte("created_at", start.toISOString());
    if (end) eq = eq.lt("created_at", end.toISOString());
    let oq = supabase
      .from("orders")
      .select("has_3rd_verse, is_rush, has_unlimited_edits, payment_status, created_at")
      .not("buyer_email", "like", "pending+%@getpawprintsong.com")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (start) oq = oq.gte("created_at", start.toISOString());
    if (end) oq = oq.lt("created_at", end.toISOString());
    const [{ data: events }, { data: orders }] = await Promise.all([eq, oq]);
    if (signal && !signal.active) return;
    // Filter quiz events to production-host sessions only.
    const filteredEvents = (events ?? []).filter((e) => allowed.has(e.session_id));
    setData({ events: filteredEvents, orders: orders ?? [] });
  };

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => { signal.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useRealtimeRefresh(["quiz_events", "orders"], () => load(), { debounceMs: 1500 });

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  // Order matches the live funnel: Upsell 1 (90min priority) + 24h downsell → Upsell 2 (extra verse) → Upsell 3 (unlimited edits).
  const types = ["express_90min", "rush_delivery", "extra_verse", "unlimited_edits"];
  const labels: Record<string, string> = {
    express_90min: "Upsell 1 — 90-min priority delivery ($59.99)",
    rush_delivery: "Upsell 1 downsell — 24h rush delivery ($39.99)",
    extra_verse: "Upsell 2 — Extra verse ($19.99)",
    unlimited_edits: "Upsell 3 — Unlimited edits ($32.99)",
  };
  const prices: Record<string, number> = {
    express_90min: 5999,
    rush_delivery: 3999,
    extra_verse: 1999,
    unlimited_edits: 3299,
  };
  // Maps a tracked upsell to the order column we use to confirm it was actually
  // charged. express_90min and rush_delivery both flip is_rush, so we read
  // product_config to disambiguate the 90min path; rush_delivery falls back
  // to is_rush on legacy orders.
  const orderField: Record<string, string | null> = {
    extra_verse: "has_3rd_verse",
    express_90min: null,
    rush_delivery: "is_rush",
    unlimited_edits: "has_unlimited_edits",
  };

  const paidOrders = data.orders.filter((o) => o.payment_status === "paid" || o.payment_status === "succeeded");

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Upsells</h1>
          <p className="text-sm text-muted-foreground">View → Accept rates, take rates, revenue per upsell.</p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className="space-y-4">
        {types.map((t) => {
          const views = data.events.filter((e) => e.event_type === "upsell_view" && e.upsell_type === t).length;
          const accepts = data.events.filter((e) => e.event_type === "upsell_accept" && e.upsell_type === t).length;
          const declines = data.events.filter((e) => e.event_type === "upsell_decline" && e.upsell_type === t).length;
          const field = orderField[t];
          // For upsells with a dedicated order flag, count actual paid orders.
          // For express_90min (no flag), fall back to tracked accept events.
          const taken = field
            ? paidOrders.filter((o) => o[field as keyof typeof o]).length
            : accepts;
          const revenue = taken * prices[t];

          return (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">{labels[t]}</h2>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{fmtMoney(revenue)}</div>
                  <div className="text-xs text-muted-foreground">revenue</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Views</div>
                  <div className="text-2xl font-semibold">{views}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Accepted</div>
                  <div className="text-2xl font-semibold text-emerald-600">{accepts}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Declined</div>
                  <div className="text-2xl font-semibold text-muted-foreground">{declines}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Take rate</div>
                  <div className="text-2xl font-semibold">{fmtPct(accepts, views)}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {field ? (
                  <>
                    Confirmed in orders: <span className="font-semibold text-foreground">{taken}</span> of {paidOrders.length} paid orders
                    <span className="ml-2">({fmtPct(taken, paidOrders.length)})</span>
                  </>
                ) : (
                  <>
                    Counted from accept events (no dedicated order flag — sets <code className="rounded bg-muted px-1">is_rush</code> like the 24h rush).
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* =====================================================================
   Existing panels (Orders / Emails / Samples / Refunds / Reactions / Revisions / Ips)
   — kept identical to previous behavior
   ===================================================================== */

interface OrderRow {
  id: string;
  dog_name: string;
  buyer_email: string;
  status: string;
  priority: string;
  flagged_for_review: boolean;
  flag_reason: string | null;
  created_at: string;
  scheduled_delivery_at: string | null;
  delivered_at: string | null;
  is_gift: boolean;
  brief_score: any;
  amount_paid_cents: number;
  payment_status: string;
}

function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | "in_progress" | "paid" | "failed">("all");

  useEffect(() => { load(); }, [filter]);
  useRealtimeRefresh("orders", () => load());

  const load = async () => {
    let q = supabase
      .from("orders")
      .select("id, dog_name, buyer_email, status, priority, flagged_for_review, flag_reason, created_at, scheduled_delivery_at, delivered_at, is_gift, brief_score, amount_paid_cents, payment_status")
      .not("buyer_email", "like", "pending+%@getpawprintsong.com")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "flagged") q = q.eq("flagged_for_review", true);
    if (filter === "in_progress") q = q.not("status", "in", "(delivered,cancelled)");
    if (filter === "paid") q = q.eq("payment_status", "paid");
    if (filter === "failed") q = q.eq("payment_status", "failed");
    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
  };

  const callFn = async (fn: string, body: any, label: string, orderId: string) => {
    setBusy(`${orderId}:${label}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });
      console.log(label, await res.json());
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          {(["all", "in_progress", "paid", "failed", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-peach/40"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left">
            <tr>
              <th className="p-3">Recipient</th>
              <th className="p-3">Buyer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/40 align-top">
                <td className="p-3">
                  <div className="font-medium">{o.dog_name}</div>
                  {o.is_gift && <span className="text-xs text-muted-foreground">gift</span>}
                  {o.flagged_for_review && <Badge variant="destructive" className="ml-2 text-xs">flagged</Badge>}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{o.buyer_email}</td>
                <td className="p-3"><Badge variant="outline">{o.status}</Badge></td>
                <td className="p-3"><Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "failed" ? "destructive" : "outline"}>{o.payment_status}</Badge></td>
                <td className="p-3 text-xs">{fmtMoney(o.amount_paid_cents ?? 0)}</td>
                <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" disabled={busy === `${o.id}:brief`} onClick={() => callFn("generate-brief", { orderId: o.id }, "brief", o.id)}>
                      Regen brief
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === `${o.id}:music`} onClick={() => callFn("submit-to-kie", { orderId: o.id }, "music", o.id)}>
                      Submit music
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === `${o.id}:deliver`} onClick={() => callFn("deliver-song", { orderId: o.id }, "deliver", o.id)}>
                      Deliver now
                    </Button>
                    <Button size="sm" variant="default" disabled={busy === `${o.id}:force`} onClick={() => callFn("deliver-song", { orderId: o.id, force: true }, "force", o.id)}>
                      Force deliver (skip schedule)
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">No orders.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Emails (preserved from previous) ---------- */

interface EmailRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function EmailsPanel() {
  const [view, setView] = useState<"flows" | "logs" | "suppressions">("flows");
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [suppressed, setSuppressed] = useState<Array<{ id: string; email: string; reason: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async (signal?: { active: boolean }) => {
    setLoading(true);
    let q = supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(2000);
    const start = rangeStart(range);
    const end = rangeEnd(range);
    if (start) q = q.gte("created_at", start.toISOString());
    if (end) q = q.lt("created_at", end.toISOString());
    const { data } = await q;
    const { data: sup } = await supabase
      .from("suppressed_emails")
      .select("id, email, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (signal && !signal.active) return;
    setRows((data ?? []) as EmailRow[]);
    setSuppressed((sup ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => { signal.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useRealtimeRefresh(["email_send_log", "suppressed_emails"], () => load(), { debounceMs: 1000 });

  // Dedupe to latest status per message_id
  const deduped = (() => {
    const seen = new Map<string, EmailRow>();
    for (const r of rows) {
      const key = r.message_id ?? `__noid_${r.id}`;
      if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
  })();

  // Per-template flow stats
  const flowStats = (() => {
    const map = new Map<string, { template: string; total: number; sent: number; failed: number; bounced: number; suppressed: number; pending: number }>();
    for (const r of deduped) {
      const k = r.template_name;
      if (!map.has(k)) map.set(k, { template: k, total: 0, sent: 0, failed: 0, bounced: 0, suppressed: 0, pending: 0 });
      const s = map.get(k)!;
      s.total++;
      if (r.status === "sent") s.sent++;
      else if (r.status === "dlq" || r.status === "failed") s.failed++;
      else if (r.status === "bounced") s.bounced++;
      else if (r.status === "suppressed" || r.status === "complained") s.suppressed++;
      else if (r.status === "pending") s.pending++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const templates = Array.from(new Set(deduped.map((r) => r.template_name))).sort();
  const filtered = deduped.filter((r) => {
    if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.recipient_email.toLowerCase().includes(s) && !r.template_name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const overall = {
    total: deduped.length,
    sent: deduped.filter((r) => r.status === "sent").length,
    failed: deduped.filter((r) => r.status === "dlq" || r.status === "failed").length,
    bounced: deduped.filter((r) => r.status === "bounced").length,
    suppressed: deduped.filter((r) => r.status === "suppressed" || r.status === "complained").length,
  };
  const deliveryRate = overall.total > 0 ? ((overall.sent / overall.total) * 100).toFixed(1) : "0.0";
  const failRate = overall.total > 0 ? (((overall.failed + overall.bounced) / overall.total) * 100).toFixed(1) : "0.0";
  const bounceRate = overall.total > 0 ? ((overall.bounced / overall.total) * 100).toFixed(2) : "0.00";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Emails</h1>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Deliverability KPIs — always shown */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
        <StatCard label="Total" value={overall.total} />
        <StatCard label="Delivery rate" value={`${deliveryRate}%`} tone="success" />
        <StatCard label="Fail rate" value={`${failRate}%`} tone="danger" />
        <StatCard label="Bounce rate" value={`${bounceRate}%`} tone="warn" />
        <StatCard label="Suppressed" value={overall.suppressed} tone="warn" />
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["flows", "logs", "suppressions"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-sm rounded-md capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? <div className="text-muted-foreground">Loading…</div> : (
        <>
          {view === "flows" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="p-3">Flow / template</th>
                    <th className="p-3 text-right">Sent</th>
                    <th className="p-3 text-right">Delivered</th>
                    <th className="p-3 text-right">Failed</th>
                    <th className="p-3 text-right">Bounced</th>
                    <th className="p-3 text-right">Suppressed</th>
                    <th className="p-3 text-right">Delivery %</th>
                  </tr>
                </thead>
                <tbody>
                  {flowStats.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No emails sent in this range</td></tr>
                  ) : flowStats.map((f) => {
                    const dr = f.total > 0 ? ((f.sent / f.total) * 100).toFixed(1) : "0";
                    return (
                      <tr key={f.template} className="border-t border-border/40">
                        <td className="p-3 font-medium">{f.template}</td>
                        <td className="p-3 text-right">{f.total}</td>
                        <td className="p-3 text-right text-emerald-600">{f.sent}</td>
                        <td className="p-3 text-right text-destructive">{f.failed}</td>
                        <td className="p-3 text-right text-amber-600">{f.bounced}</td>
                        <td className="p-3 text-right text-muted-foreground">{f.suppressed}</td>
                        <td className="p-3 text-right font-medium">{dr}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {view === "logs" && (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <option value="all">All templates</option>
                  {templates.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <option value="all">All statuses</option>
                  <option value="sent">Sent</option>
                  <option value="dlq">Failed</option>
                  <option value="bounced">Bounced</option>
                  <option value="suppressed">Suppressed</option>
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or template" className="flex-1 min-w-[200px] rounded-md border border-border bg-card px-3 py-2 text-sm" />
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="p-3">Template</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Sent</th>
                      <th className="p-3">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((r) => (
                      <tr key={r.id} className="border-t border-border/40">
                        <td className="p-3">{r.template_name}</td>
                        <td className="p-3 text-xs">{r.recipient_email}</td>
                        <td className="p-3">
                          <Badge variant={r.status === "sent" ? "default" : (r.status === "dlq" || r.status === "failed" || r.status === "bounced") ? "destructive" : "outline"}>{r.status}</Badge>
                        </td>
                        <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="p-3 text-xs text-destructive max-w-md truncate">{r.error_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {view === "suppressions" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="p-3">Email</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Suppressed at</th>
                  </tr>
                </thead>
                <tbody>
                  {suppressed.length === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No suppressed addresses — clean sender list.</td></tr>
                  ) : suppressed.map((s) => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="p-3">{s.email}</td>
                      <td className="p-3"><Badge variant="outline">{s.reason}</Badge></td>
                      <td className="p-3 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------- Refunds, Reactions, Revisions, Samples, IPs (compact preserved versions) ---------- */

function RefundsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("refund_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  useRealtimeRefresh("refund_requests", () => load());

  const update = async (id: string, status: string, notes?: string) => {
    setBusy(id);
    await supabase.from("refund_requests").update({ status, admin_notes: notes ?? null, resolved_at: new Date().toISOString() }).eq("id", id);
    await load();
    setBusy(null);
  };

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">Refund queue</h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left">
            <tr><th className="p-3">Buyer</th><th className="p-3">Type</th><th className="p-3">Reason</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="p-3 text-xs">{r.buyer_email}</td>
                <td className="p-3 text-xs capitalize">{r.request_type?.replace("_", " ")}</td>
                <td className="p-3 text-xs max-w-md whitespace-pre-wrap">{r.reason}</td>
                <td className="p-3"><Badge variant={r.status === "approved" ? "default" : r.status === "denied" ? "destructive" : "outline"}>{r.status}</Badge></td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" disabled={busy === r.id || r.status !== "pending"} onClick={() => update(r.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id || r.status === "paid"} onClick={() => update(r.id, "paid", "Paid")}>Mark paid</Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id || r.status === "denied"} onClick={() => update(r.id, "denied")}>Deny</Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No refund requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReactionsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("reaction_videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  useRealtimeRefresh(["reaction_videos", "reaction_reward_codes"], () => load());

  const preview = async (row: any) => {
    if (previews[row.id]) return;
    const { data } = await supabase.storage.from("reactions").createSignedUrl(row.storage_path, 3600);
    if (data?.signedUrl) setPreviews((p) => ({ ...p, [row.id]: data.signedUrl }));
  };

  const approve = async (id: string) => {
    setBusy(id);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("approve-reaction", {
      body: { reactionVideoId: id },
    });
    if (fnErr || data?.error) {
      setError(data?.error || fnErr?.message || "Approval failed");
    } else {
      await load();
    }
    setBusy(null);
  };

  const reject = async (id: string, reason: string) => {
    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setBusy(id);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("reject-reaction", {
      body: { reactionVideoId: id, reason: reason.trim() },
    });
    if (fnErr || data?.error) {
      setError(data?.error || fnErr?.message || "Rejection failed");
    } else {
      setRejectFor(null);
      setRejectReason("");
      await load();
    }
    setBusy(null);
  };

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold">Reactions</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Approving issues a reward code (2 free songs) and refunds the original purchase via Stripe.
      </p>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex justify-between"><p className="font-medium text-sm">{r.buyer_email}</p><Badge variant="outline">{r.status}</Badge></div>
            {r.caption && <p className="mt-3 text-sm italic text-muted-foreground">"{r.caption}"</p>}
            {previews[r.id] ? <video controls src={previews[r.id]} className="mt-3 w-full rounded-lg bg-black" /> : <Button variant="outline" size="sm" className="mt-3" onClick={() => preview(r)}>Load preview</Button>}
            {rejectFor === r.id ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (shown to customer in email)…"
                  className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => reject(r.id, rejectReason)}>
                    Confirm reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectFor(null); setRejectReason(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => approve(r.id)}
                  disabled={busy === r.id || r.status === "approved" || r.status === "rejected"}
                >
                  {busy === r.id ? "Approving…" : "Approve + Refund"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectFor(r.id)}
                  disabled={busy === r.id || r.status === "approved" || r.status === "rejected"}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No reaction videos.</p>}
      </div>
    </>
  );
}

function RevisionsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("revision_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  useRealtimeRefresh("revision_requests", () => load());
  const setStatus = async (id: string, status: string) => {
    await supabase.from("revision_requests").update({ status }).eq("id", id);
    await load();
  };
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">Revisions</h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left"><tr><th className="p-3">Buyer</th><th className="p-3">Notes</th><th className="p-3">Free?</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-3 text-xs">{r.buyer_email}</td>
                <td className="p-3 text-xs max-w-md whitespace-pre-wrap">{r.notes}</td>
                <td className="p-3">{r.is_free ? <Badge variant="outline">free</Badge> : <Badge>paid</Badge>}</td>
                <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "in_progress")}>Start</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "delivered")}>Delivered</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SamplesPanel() {
  const [samples, setSamples] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("featured_samples").select("*").order("sort_order", { ascending: true });
    setSamples(data ?? []);
  };
  useEffect(() => { load(); }, []);
  useRealtimeRefresh("featured_samples", () => load());
  const togglePublish = async (s: any) => {
    await supabase.from("featured_samples").update({ published: !s.published }).eq("id", s.id);
    load();
  };
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">Featured samples</h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left"><tr><th className="p-3">Title</th><th className="p-3">For</th><th className="p-3">Genre</th><th className="p-3">Status</th><th className="p-3">Published</th></tr></thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} className="border-t border-border/40">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3 text-muted-foreground">{s.for_text ?? s.dog_name}</td>
                <td className="p-3">{s.genre_label}</td>
                <td className="p-3"><Badge variant="outline">{s.status}</Badge></td>
                <td className="p-3">
                  <button onClick={() => togglePublish(s)} disabled={!s.audio_url} className={`rounded px-2 py-1 text-xs ${s.published ? "bg-primary text-primary-foreground" : "bg-muted"} disabled:opacity-50`}>
                    {s.published ? "Published" : "Draft"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


/* =====================================================================
   Support inbox
   ===================================================================== */

function SupportPanel() {
  const [threads, setThreads] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "open" | "closed">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closeAfter, setCloseAfter] = useState(false);

  const loadThreads = async () => {
    let q = supabase
      .from("support_threads")
      .select("id, sender_name, sender_email, subject, status, last_activity_at, order_id_text")
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setThreads(data ?? []);
    if (!selectedId && data && data.length > 0) setSelectedId(data[0].id);
  };

  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("id, direction, body, created_at, author_user_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useRealtimeRefresh(["support_threads", "support_messages"], () => {
    loadThreads();
    if (selectedId) loadMessages(selectedId);
  }, { debounceMs: 500 });

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      // mark "new" -> "open" once admin opens it
      supabase.from("support_threads").update({ status: "open" }).eq("id", selectedId).eq("status", "new").then(() => loadThreads());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selected = threads.find((t) => t.id === selectedId);

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("reply-support-message", {
        body: { threadId: selectedId, body: reply.trim(), closeThread: closeAfter },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message ?? (data as any)?.error ?? "Send failed");
      }
      setReply("");
      setCloseAfter(false);
      await loadMessages(selectedId);
      await loadThreads();
    } catch (e: any) {
      alert(`Reply failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!selectedId) return;
    await supabase.from("support_threads").update({ status }).eq("id", selectedId);
    await loadThreads();
  };

  const newCount = threads.filter((t) => t.status === "new").length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Support inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Messages from the contact form. Replies email the customer directly.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "new", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setSelectedId(null);
              }}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {f}
              {f === "new" && newCount > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No messages.
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border/40">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedId === t.id
                        ? "bg-primary/10"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.sender_name}</span>
                      {t.status === "new" && (
                        <Badge className="shrink-0 text-[10px]">new</Badge>
                      )}
                      {t.status === "closed" && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          closed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.subject}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">
                      {new Date(t.last_activity_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-border bg-card flex flex-col min-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a message to view it.
            </div>
          ) : (
            <>
              <div className="border-b border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold truncate">
                      {selected.subject}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.sender_name} · {selected.sender_email}
                      {selected.order_id_text ? ` · Order ${selected.order_id_text}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {selected.status !== "closed" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus("closed")}>
                        Mark closed
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus("open")}>
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      m.direction === "inbound"
                        ? "bg-muted/50 text-foreground"
                        : "ml-auto bg-primary/15 text-foreground"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {m.direction === "inbound" ? selected.sender_name : "You"} ·{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                    {m.body}
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4 space-y-3">
                <Textarea
                  rows={4}
                  placeholder={`Reply to ${selected.sender_name}…`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={10000}
                  className="resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={closeAfter}
                      onChange={(e) => setCloseAfter(e.target.checked)}
                    />
                    Close thread after sending
                  </label>
                  <Button onClick={sendReply} disabled={!reply.trim() || sending}>
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- Customer Explorer (back door) ---------- */
// Searchable explorer over EVERY order — paid, unpaid, abandoned. Click a row
// to open a side drawer with the full quiz responses, brief, payment details,
// job events timeline, related emails, sessions, reactions, refunds, revisions.

interface ExplorerOrderRow {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  dog_name: string;
  dog_breed: string | null;
  status: string;
  payment_status: string;
  amount_cents: number;
  amount_paid_cents: number;
  delivery_tier: string;
  is_gift: boolean;
  flagged_for_review: boolean;
  created_at: string;
  delivered_at: string | null;
  user_id: string | null;
}

function CustomerExplorerPanel() {
  const [rows, setRows] = useState<ExplorerOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "abandoned" | "delivered" | "flagged">("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("orders")
      .select("id, buyer_email, buyer_name, dog_name, dog_breed, status, payment_status, amount_cents, amount_paid_cents, delivery_tier, is_gift, flagged_for_review, created_at, delivered_at, user_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (filter === "paid") q = q.eq("payment_status", "paid");
    if (filter === "unpaid") q = q.neq("payment_status", "paid");
    if (filter === "abandoned") q = q.eq("payment_status", "pending").eq("status", "pending_payment");
    if (filter === "delivered") q = q.eq("status", "delivered");
    if (filter === "flagged") q = q.eq("flagged_for_review", true);

    const { data } = await q;
    setRows((data ?? []) as ExplorerOrderRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useRealtimeRefresh("orders", () => load(), { debounceMs: 1500 });

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.buyer_email?.toLowerCase().includes(s) ||
      r.buyer_name?.toLowerCase().includes(s) ||
      r.dog_name?.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: filtered.length,
    paid: filtered.filter((r) => r.payment_status === "paid").length,
    revenue: filtered.reduce((s, r) => s + (r.amount_paid_cents ?? 0), 0),
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Customer explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search every order — paid, unpaid, abandoned — and inspect the full quiz, brief, payment, and timeline.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, recipient, or order ID…"
            className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "paid", "unpaid", "abandoned", "delivered", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-peach/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex gap-3 text-xs text-muted-foreground">
        <span>{stats.total} orders</span>
        <span>·</span>
        <span>{stats.paid} paid</span>
        <span>·</span>
        <span>{fmtMoney(stats.revenue)} revenue</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Buyer</th>
              <th className="p-3">For</th>
              <th className="p-3">Status</th>
              <th className="p-3">Pay</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No matching orders.</td></tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="border-b border-border/40 cursor-pointer hover:bg-peach/30 transition"
              >
                <td className="p-3">
                  <div className="font-medium">{r.buyer_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.buyer_email}</div>
                </td>
                <td className="p-3">
                  <div>{r.dog_name}</div>
                  <div className="text-xs text-muted-foreground">{r.dog_breed || "—"}{r.is_gift ? " · gift" : ""}</div>
                </td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{r.status}</Badge></td>
                <td className="p-3">
                  <Badge
                    variant={r.payment_status === "paid" ? "default" : r.payment_status === "failed" ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {r.payment_status}
                  </Badge>
                  {r.flagged_for_review && <Badge variant="destructive" className="ml-1 text-[10px]">flag</Badge>}
                </td>
                <td className="p-3 text-xs">{r.delivery_tier}</td>
                <td className="p-3 text-xs">
                  {fmtMoney(r.amount_paid_cents || r.amount_cents)}
                </td>
                <td className="p-3 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <CustomerDetailDrawer orderId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

function CustomerDetailDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [otherOrders, setOtherOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: ord } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (!active) return;
      setOrder(ord);

      const email = ord?.buyer_email ?? null;

      const [evRes, emRes, otherRes, refRes, revRes, reactRes, sessRes] = await Promise.all([
        supabase.from("job_events").select("id, event_type, payload, created_at").eq("order_id", orderId).order("created_at", { ascending: false }).limit(200),
        email ? supabase.from("email_send_log").select("id, template_name, status, created_at, error_message").eq("recipient_email", email).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
        email ? supabase.from("orders").select("id, dog_name, status, payment_status, amount_paid_cents, created_at").eq("buyer_email", email).neq("id", orderId).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        supabase.from("refund_requests").select("id, request_type, reason, status, amount_cents, created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
        supabase.from("revision_requests").select("id, notes, status, is_free, created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
        supabase.from("reaction_videos").select("id, status, is_public, caption, created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
        email ? supabase.from("page_sessions").select("session_id, host, landing_path, referrer, utm_source, utm_medium, utm_campaign, first_seen_at, last_seen_at").eq("buyer_email", email).order("last_seen_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      ]);

      if (!active) return;
      setEvents(evRes.data ?? []);
      setEmails((emRes as any).data ?? []);
      setOtherOrders((otherRes as any).data ?? []);
      setRefunds(refRes.data ?? []);
      setRevisions(revRes.data ?? []);
      setReactions(reactRes.data ?? []);
      setSessions((sessRes as any).data ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [orderId]);

  const quiz = (order?.quiz_payload ?? {}) as Record<string, any>;
  const brief = order?.brief as any;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-2xl bg-background border-l border-border overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Order</div>
            <div className="font-mono text-xs">{orderId}</div>
            {order && (
              <div className="mt-1 font-display text-lg font-semibold">
                {order.dog_name} <span className="text-muted-foreground font-normal text-sm">for {order.buyer_name || order.buyer_email}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}

        {order && !loading && (
          <div className="p-6 space-y-6">
            {/* Top status */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailField label="Status" value={<Badge variant="outline">{order.status}</Badge>} />
              <DetailField label="Payment" value={
                <Badge variant={order.payment_status === "paid" ? "default" : order.payment_status === "failed" ? "destructive" : "outline"}>
                  {order.payment_status}
                </Badge>
              } />
              <DetailField label="Amount paid" value={fmtMoney(order.amount_paid_cents || 0)} />
              <DetailField label="Order amount" value={fmtMoney(order.amount_cents || 0)} />
              <DetailField label="Tier" value={order.delivery_tier} />
              <DetailField label="Priority" value={order.priority} />
              <DetailField label="Source" value={order.source_kind} />
              <DetailField label="Currency" value={order.currency} />
              <DetailField label="Created" value={new Date(order.created_at).toLocaleString()} />
              <DetailField label="Delivered" value={order.delivered_at ? new Date(order.delivered_at).toLocaleString() : "—"} />
              <DetailField label="Scheduled delivery" value={order.scheduled_delivery_at ? new Date(order.scheduled_delivery_at).toLocaleString() : "—"} />
              <DetailField label="Confirmation email" value={order.confirmation_email_sent_at ? new Date(order.confirmation_email_sent_at).toLocaleString() : "—"} />
            </div>

            {order.flagged_for_review && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">Flagged for review</div>
                <div className="text-muted-foreground mt-1">{order.flag_reason || "(no reason)"}</div>
              </div>
            )}

            {/* Contact */}
            <Section title="Contact">
              <DetailField label="Buyer name" value={order.buyer_name || "—"} />
              <DetailField label="Buyer email" value={order.buyer_email} />
              <DetailField label="Recipient" value={order.dog_name} />
              <DetailField label="Breed" value={order.dog_breed || "—"} />
              <DetailField label="Is gift" value={order.is_gift ? "Yes" : "No"} />
              <DetailField label="Recipient email" value={order.recipient_email || "—"} />
              <DetailField label="Delivery date" value={order.delivery_date || "—"} />
              <DetailField label="Has account" value={order.user_id ? "Yes" : "No"} />
            </Section>

            {/* Song spec */}
            <Section title="Song spec">
              <DetailField label="Genre" value={order.genre || "—"} />
              <DetailField label="Tempo" value={order.tempo || "—"} />
              <DetailField label="Voice" value={order.voice || "—"} />
              <DetailField label="Title idea" value={order.song_title_idea || "—"} />
              <DetailField label="3rd verse" value={order.has_3rd_verse ? "Yes" : "No"} />
              <DetailField label="Rush" value={order.is_rush ? "Yes" : "No"} />
              <DetailField label="Unlimited edits" value={order.has_unlimited_edits ? "Yes" : "No"} />
            </Section>

            {/* Personal note */}
            {order.personal_note && (
              <Section title="Personal note">
                <p className="col-span-2 text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-lg p-3">{order.personal_note}</p>
              </Section>
            )}

            {/* Quiz */}
            {Object.keys(quiz).length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quiz responses</h3>
                <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                  {Object.entries(quiz).map(([k, v]) => (
                    <div key={k} className="px-3 py-2 grid grid-cols-3 gap-3 text-sm">
                      <div className="text-xs text-muted-foreground font-mono">{k}</div>
                      <div className="col-span-2 whitespace-pre-wrap break-words">
                        {v == null ? "—" : typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brief */}
            {brief && (
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI brief</h3>
                <pre className="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(brief, null, 2)}</pre>
                {order.brief_score && (
                  <pre className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre-wrap">Score: {JSON.stringify(order.brief_score, null, 2)}</pre>
                )}
              </div>
            )}

            {/* Payment / Stripe */}
            <Section title="Payment / Stripe">
              <DetailField label="Stripe env" value={order.stripe_env || "—"} />
              <DetailField label="PaymentIntent" value={<span className="font-mono text-xs break-all">{order.stripe_payment_intent_id || "—"}</span>} />
              <DetailField label="Customer" value={<span className="font-mono text-xs break-all">{order.stripe_customer_id || "—"}</span>} />
              <DetailField label="Payment method" value={<span className="font-mono text-xs break-all">{order.stripe_payment_method_id || "—"}</span>} />
              <DetailField label="Checkout session" value={<span className="font-mono text-xs break-all">{order.stripe_checkout_session_id || "—"}</span>} />
              <DetailField label="Promo / discount" value={order.discount_cents ? `${fmtMoney(order.discount_cents)} off` : "—"} />
            </Section>

            {/* Other orders for this email */}
            {otherOrders.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Other orders from {order.buyer_email} ({otherOrders.length})
                </h3>
                <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                  {otherOrders.map((o) => (
                    <div key={o.id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{o.dog_name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline">{o.status}</Badge>
                        <Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge>
                        <span>{fmtMoney(o.amount_paid_cents || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions */}
            {sessions.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sessions ({sessions.length})</h3>
                <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                  {sessions.map((s) => (
                    <div key={s.session_id} className="px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{s.session_id.slice(0, 12)}…</span>
                        <span className="text-muted-foreground">{new Date(s.last_seen_at).toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {s.host || "—"} · {s.landing_path || "/"}{s.utm_source ? ` · ${s.utm_source}/${s.utm_medium || ""}/${s.utm_campaign || ""}` : ""}
                      </div>
                      {s.referrer && <div className="text-muted-foreground truncate">ref: {s.referrer}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emails */}
            {emails.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Emails ({emails.length})</h3>
                <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                  {emails.map((e) => (
                    <div key={e.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium">{e.template_name}</div>
                        {e.error_message && <div className="text-destructive truncate max-w-xs">{e.error_message}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={e.status === "sent" ? "default" : e.status === "bounced" || e.status === "failed" ? "destructive" : "outline"}>{e.status}</Badge>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refunds / revisions / reactions */}
            {(refunds.length > 0 || revisions.length > 0 || reactions.length > 0) && (
              <div className="grid gap-3">
                {refunds.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Refund requests</h3>
                    {refunds.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm mb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{r.request_type}</Badge>
                          <Badge variant="outline">{r.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{r.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                {revisions.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Revision requests</h3>
                    {revisions.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm mb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">{r.is_free ? "free" : "paid"}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{r.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
                {reactions.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Reactions</h3>
                    {reactions.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm mb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">{r.is_public ? "public" : "private"}</span>
                        </div>
                        {r.caption && <p className="mt-2 text-xs text-muted-foreground">{r.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Timeline ({events.length})
              </h3>
              <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
                {events.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No events yet.</div>
                )}
                {events.map((e) => (
                  <details key={e.id} className="group">
                    <summary className="px-3 py-2 cursor-pointer hover:bg-muted/40 flex items-center justify-between text-sm list-none">
                      <span className="font-medium">{e.event_type}</span>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    </summary>
                    {e.payload && (
                      <pre className="px-3 pb-2 text-[11px] overflow-x-auto whitespace-pre-wrap text-muted-foreground">{JSON.stringify(e.payload, null, 2)}</pre>
                    )}
                  </details>
                ))}
              </div>
            </div>

            {/* Raw JSON */}
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">View raw order JSON</summary>
              <pre className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{JSON.stringify(order, null, 2)}</pre>
            </details>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">{children}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words">{value}</div>
    </div>
  );
}
