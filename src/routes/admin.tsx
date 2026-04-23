// Admin console — gated by:
//   1. Login (Supabase auth)
//   2. Admin role (user_roles table)
//   3. TOTP 2FA, re-prompted every 12 hours

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { AdminMfaEnroll } from "@/components/admin/AdminMfaEnroll";
import { AdminMfaChallenge } from "@/components/admin/AdminMfaChallenge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: StaffPage,
  head: () => ({
    meta: [
      { title: "Staff · RibbonSong" },
      { name: "robots", content: "noindex,nofollow,noarchive,nosnippet" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

type Tab = "orders" | "refunds" | "reactions" | "revisions" | "samples";

function StaffPage() {
  const { state, user, refresh } = useAdminGuard();
  const navigate = useNavigate();
  const adminPath = "/admin";
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    if (state === "anonymous") {
      navigate({ to: "/login", search: { redirect: adminPath } as any });
    }
  }, [state, navigate, adminPath]);

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
          <p className="mt-2 text-muted-foreground">
            This page doesn't exist.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (state === "needs_enrollment" && user) {
    return (
      <AdminMfaEnroll
        email={user.email ?? "admin"}
        userId={user.id}
        onEnrolled={refresh}
      />
    );
  }

  if (state === "needs_verification" && user) {
    return <AdminMfaChallenge userId={user.id} onVerified={refresh} />;
  }

  // state === "ready"
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="font-display text-lg">Staff</span>
            <Badge variant="outline" className="text-xs">
              2FA verified
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Exit
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl gap-1 px-6">
          {(
            [
              ["orders", "Orders"],
              ["samples", "Samples"],
              ["refunds", "Refund queue"],
              ["reactions", "Reactions"],
              ["revisions", "Revisions"],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative px-4 py-3 text-sm transition-colors ${
                tab === key
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {tab === key && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {tab === "orders" && <OrdersPanel />}
        {tab === "samples" && <SamplesPanel />}
        {tab === "refunds" && <RefundsPanel />}
        {tab === "reactions" && <ReactionsPanel />}
        {tab === "revisions" && <RevisionsPanel />}
      </main>
    </div>
  );
}

/* ---------- Orders ---------- */

interface OrderRow {
  id: string;
  recipient_name: string;
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
}

function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | "in_progress">("all");

  useEffect(() => {
    fetch();
  }, [filter]);

  const fetch = async () => {
    let q = supabase
      .from("orders")
      .select(
        "id, recipient_name, buyer_email, status, priority, flagged_for_review, flag_reason, created_at, scheduled_delivery_at, delivered_at, is_gift, brief_score",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "flagged") q = q.eq("flagged_for_review", true);
    if (filter === "in_progress")
      q = q.not("status", "in", "(delivered,cancelled)");
    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
  };

  const callFn = async (fn: string, body: any, label: string, orderId: string) => {
    setBusy(`${orderId}:${label}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch_fn(fn, session?.access_token, body);
      console.log(label, res);
      await fetch();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          {(["all", "in_progress", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-peach/40"
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
              <th className="p-3">Score</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Created</th>
              <th className="p-3">Scheduled</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/40 align-top">
                <td className="p-3">
                  <div className="font-medium">{o.recipient_name}</div>
                  {o.is_gift && (
                    <span className="text-xs text-muted-foreground">gift</span>
                  )}
                  {o.flagged_for_review && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      flagged
                    </Badge>
                  )}
                  {o.flag_reason && (
                    <p className="mt-1 max-w-xs text-xs text-destructive">
                      {o.flag_reason}
                    </p>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {o.buyer_email}
                </td>
                <td className="p-3">
                  <Badge variant="outline">{o.status}</Badge>
                </td>
                <td className="p-3 text-xs">
                  {o.brief_score?.overall ? `${o.brief_score.overall}/5` : "—"}
                </td>
                <td className="p-3 text-xs capitalize">{o.priority}</td>
                <td className="p-3 text-xs">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-xs">
                  {o.scheduled_delivery_at
                    ? new Date(o.scheduled_delivery_at).toLocaleString()
                    : "—"}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `${o.id}:brief`}
                      onClick={() =>
                        callFn(
                          "generate-brief",
                          { orderId: o.id },
                          "brief",
                          o.id,
                        )
                      }
                    >
                      Regen brief
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `${o.id}:music`}
                      onClick={() =>
                        callFn(
                          "submit-to-kie",
                          { orderId: o.id },
                          "music",
                          o.id,
                        )
                      }
                    >
                      Submit music
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `${o.id}:deliver`}
                      onClick={() =>
                        callFn(
                          "deliver-song",
                          { orderId: o.id },
                          "deliver",
                          o.id,
                        )
                      }
                    >
                      Deliver now
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  No orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function fetch_fn(fn: string, accessToken: string | undefined, body: any) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );
  return res.json();
}

/* ---------- Refunds ---------- */

interface RefundRow {
  id: string;
  order_id: string;
  buyer_email: string;
  request_type: string;
  reason: string;
  status: string;
  amount_cents: number | null;
  admin_notes: string | null;
  created_at: string;
  reaction_video_id: string | null;
}

function RefundsPanel() {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("refund_requests")
      .select(
        "id, order_id, buyer_email, request_type, reason, status, amount_cents, admin_notes, created_at, reaction_video_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as RefundRow[]) ?? []);
  };

  const update = async (id: string, status: string, notes?: string) => {
    setBusy(id);
    await supabase
      .from("refund_requests")
      .update({
        status,
        admin_notes: notes ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);
    await load();
    setBusy(null);
  };

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">Refund queue</h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left">
            <tr>
              <th className="p-3">Buyer</th>
              <th className="p-3">Type</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 align-top">
                <td className="p-3 text-xs">
                  <div className="font-medium">{r.buyer_email}</div>
                  <button
                    type="button"
                    className="text-muted-foreground underline"
                    onClick={() => navigator.clipboard.writeText(r.order_id)}
                  >
                    Copy order ID
                  </button>
                </td>
                <td className="p-3 text-xs capitalize">
                  {r.request_type.replace("_", " ")}
                </td>
                <td className="p-3 text-xs max-w-md whitespace-pre-wrap">
                  {r.reason}
                  {r.reaction_video_id && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      reaction attached
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  <Badge
                    variant={
                      r.status === "approved" || r.status === "paid"
                        ? "default"
                        : r.status === "denied"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="p-3 text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id || r.status !== "pending"}
                      onClick={() => update(r.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id || r.status === "paid"}
                      onClick={() => update(r.id, "paid", "Paid out manually")}
                    >
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id || r.status === "denied"}
                      onClick={() => update(r.id, "denied")}
                    >
                      Deny
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  No refund requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Reactions ---------- */

interface ReactionRow {
  id: string;
  order_id: string;
  buyer_email: string;
  storage_path: string;
  caption: string | null;
  status: string;
  created_at: string;
}

function ReactionsPanel() {
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("reaction_videos")
      .select(
        "id, order_id, buyer_email, storage_path, caption, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as ReactionRow[]) ?? []);
  };

  const preview = async (row: ReactionRow) => {
    if (previews[row.id]) return;
    const { data } = await supabase.storage
      .from("reactions")
      .createSignedUrl(row.storage_path, 3600);
    if (data?.signedUrl) {
      setPreviews((p) => ({ ...p, [row.id]: data.signedUrl }));
    }
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("reaction_videos").update({ status }).eq("id", id);
    await load();
  };

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">Reaction videos</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{r.buyer_email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline">{r.status}</Badge>
            </div>
            {r.caption && (
              <p className="mt-3 text-sm italic text-muted-foreground">
                "{r.caption}"
              </p>
            )}
            {previews[r.id] ? (
              <video
                controls
                src={previews[r.id]}
                className="mt-3 w-full rounded-lg bg-black"
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => preview(r)}
              >
                Load preview
              </Button>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(r.id, "approved")}
                disabled={r.status === "approved"}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(r.id, "rejected")}
                disabled={r.status === "rejected"}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No reaction videos yet.
          </p>
        )}
      </div>
    </>
  );
}

/* ---------- Revisions ---------- */

interface RevisionRow {
  id: string;
  order_id: string;
  buyer_email: string;
  notes: string;
  is_free: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

function RevisionsPanel() {
  const [rows, setRows] = useState<RevisionRow[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("revision_requests")
      .select(
        "id, order_id, buyer_email, notes, is_free, status, admin_notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as RevisionRow[]) ?? []);
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("revision_requests").update({ status }).eq("id", id);
    await load();
  };

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-semibold">
        Revision requests
      </h1>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left">
            <tr>
              <th className="p-3">Buyer</th>
              <th className="p-3">Notes</th>
              <th className="p-3">Free?</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 align-top">
                <td className="p-3 text-xs">{r.buyer_email}</td>
                <td className="p-3 text-xs max-w-md whitespace-pre-wrap">
                  {r.notes}
                </td>
                <td className="p-3 text-xs">
                  {r.is_free ? (
                    <Badge variant="outline">free</Badge>
                  ) : (
                    <Badge variant="default">paid</Badge>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant="outline">{r.status}</Badge>
                </td>
                <td className="p-3 text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(r.id, "in_progress")}
                      disabled={r.status === "in_progress"}
                    >
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(r.id, "delivered")}
                      disabled={r.status === "delivered"}
                    >
                      Mark delivered
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  No revision requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Featured Samples ---------- */

interface SampleRow {
  id: string;
  title: string;
  recipient_name: string;
  relationship: string | null;
  stage: string | null;
  story_prompt: string;
  genre: string;
  genre_label: string;
  tempo: string;
  voice: string;
  quote: string | null;
  for_text: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  status: string;
  flag_reason: string | null;
  published: boolean;
  sort_order: number;
  kie_task_id: string | null;
  created_at: string;
}

const EMPTY_SAMPLE = {
  title: "",
  recipient_name: "",
  relationship: "",
  stage: "",
  story_prompt: "",
  genre: "folk",
  genre_label: "Folk",
  tempo: "mid",
  voice: "female",
  quote: "",
  for_text: "",
  cover_image_url: "",
  sort_order: 0,
};

function SamplesPanel() {
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_SAMPLE });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("featured_samples")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setSamples((data ?? []) as SampleRow[]);
  };

  const create = async () => {
    if (!form.title || !form.recipient_name || !form.story_prompt) {
      alert("Title, recipient, and story are required");
      return;
    }
    setBusy("create");
    const { error } = await supabase.from("featured_samples").insert({
      title: form.title,
      recipient_name: form.recipient_name,
      relationship: form.relationship || null,
      stage: form.stage || null,
      story_prompt: form.story_prompt,
      genre: form.genre,
      genre_label: form.genre_label,
      tempo: form.tempo,
      voice: form.voice,
      quote: form.quote || null,
      for_text: form.for_text || null,
      cover_image_url: form.cover_image_url || null,
      sort_order: Number(form.sort_order) || 0,
      status: "draft",
    });
    setBusy(null);
    if (error) {
      alert(error.message);
      return;
    }
    setForm({ ...EMPTY_SAMPLE });
    setShowForm(false);
    load();
  };

  const generate = async (id: string) => {
    setBusy(id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sample`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ sampleId: id }),
      },
    );
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      alert(`Generation failed: ${json.error ?? res.statusText}`);
      return;
    }
    load();
  };

  const togglePublish = async (s: SampleRow) => {
    setBusy(s.id);
    await supabase
      .from("featured_samples")
      .update({ published: !s.published })
      .eq("id", s.id);
    setBusy(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sample?")) return;
    setBusy(id);
    await supabase.from("featured_samples").delete().eq("id", id);
    setBusy(null);
    load();
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Featured Samples</h2>
          <p className="text-sm text-muted-foreground">
            Demo songs shown on the landing page. Generate via Claude + KIE.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New sample"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Recipient name">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              />
            </Field>
            <Field label="Relationship">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Mother, Husband"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              />
            </Field>
            <Field label="Stage / situation">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. In treatment, Survivor, Memory"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              />
            </Field>
            <Field label="Genre (key)">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
              />
            </Field>
            <Field label="Genre label">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.genre_label}
                onChange={(e) => setForm({ ...form, genre_label: e.target.value })}
              />
            </Field>
            <Field label="Tempo">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.tempo}
                onChange={(e) => setForm({ ...form, tempo: e.target.value })}
              />
            </Field>
            <Field label="Voice">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.voice}
                onChange={(e) => setForm({ ...form, voice: e.target.value })}
              />
            </Field>
            <Field label="Quote (homepage card)">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
            </Field>
            <Field label="For (homepage card)">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. For Mom · Stage III"
                value={form.for_text}
                onChange={(e) => setForm({ ...form, for_text: e.target.value })}
              />
            </Field>
            <Field label="Cover image URL">
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Story prompt (sender's words)">
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.story_prompt}
                onChange={(e) => setForm({ ...form, story_prompt: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={busy === "create"}>
              {busy === "create" ? "Saving…" : "Save sample"}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">For</th>
              <th className="p-3">Genre</th>
              <th className="p-3">Status</th>
              <th className="p-3">Audio</th>
              <th className="p-3">Published</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3 text-muted-foreground">
                  {s.for_text ?? s.recipient_name}
                </td>
                <td className="p-3">{s.genre_label}</td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {s.status}
                  </Badge>
                  {s.flag_reason && (
                    <div className="mt-1 text-xs text-destructive">
                      {s.flag_reason.slice(0, 80)}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {s.audio_url ? (
                    <a
                      href={s.audio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Listen
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => togglePublish(s)}
                    disabled={busy === s.id || !s.audio_url}
                    className={`rounded px-2 py-1 text-xs ${
                      s.published
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } disabled:opacity-50`}
                  >
                    {s.published ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {!s.kie_task_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generate(s.id)}
                        disabled={busy === s.id}
                      >
                        {busy === s.id ? "Generating…" : "Generate"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(s.id)}
                      disabled={busy === s.id}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {samples.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No samples yet. Click "+ New sample" to seed one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
