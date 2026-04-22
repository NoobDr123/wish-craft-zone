// Admin route — gated by the `admin` role in `user_roles`.
// Lists recent orders, flags, and lets admins manually retry stages.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin · RibbonSong" }] }),
});

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

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | "in_progress">("all");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/admin" } as any });
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
  }, [isAdmin, filter]);

  const fetchOrders = async () => {
    let q = supabase
      .from("orders")
      .select(
        "id, recipient_name, buyer_email, status, priority, flagged_for_review, flag_reason, created_at, scheduled_delivery_at, delivered_at, is_gift, brief_score",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "flagged") q = q.eq("flagged_for_review", true);
    if (filter === "in_progress") q = q.not("status", "in", "(delivered,cancelled)");
    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
  };

  const callFn = async (fn: string, body: any, label: string, orderId: string) => {
    setBusy(`${orderId}:${label}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        },
      );
      const j = await res.json();
      console.log(label, j);
      await fetchOrders();
    } finally {
      setBusy(null);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Logo />
          <h1 className="mt-6 font-display text-3xl font-semibold">Access denied</h1>
          <p className="mt-2 text-muted-foreground">
            This page is for RibbonSong staff only.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="font-display text-lg">Admin</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Exit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
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
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
