// Real dashboard — lists user's orders, polls in-progress ones, links to /listen.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Music } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Your Dashboard · RibbonSong" }] }),
});

interface Order {
  id: string;
  recipient_name: string;
  status: string;
  priority: string;
  is_gift: boolean;
  delivery_date: string | null;
  scheduled_delivery_at: string | null;
  delivered_at: string | null;
  share_page_slug: string | null;
  audio_variants: any;
  selected_variant_id: string | null;
  brief: any;
  genre: string | null;
  tempo: string | null;
  has_3rd_verse: boolean;
  is_rush: boolean;
  has_unlimited_edits: boolean;
  created_at: string;
}

const STAGE_MAP: Record<string, { label: string; pct: number }> = {
  received: { label: "Order received", pct: 5 },
  upsells_complete: { label: "Setting up your song", pct: 10 },
  brief_generating: { label: "Drafting lyrics", pct: 25 },
  brief_ready: { label: "Lyrics complete", pct: 45 },
  music_generating: { label: "Composing music", pct: 70 },
  ready_to_deliver: { label: "Final polish", pct: 90 },
  delivered: { label: "Delivered", pct: 100 },
  brief_failed: { label: "Needs review", pct: 25 },
  music_failed: { label: "Needs review", pct: 70 },
};

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/dashboard" } as any });
      return;
    }
    fetchOrders();
    const t = setInterval(fetchOrders, 8000); // poll every 8s
    return () => clearInterval(t);
  }, [loading, user]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, recipient_name, status, priority, is_gift, delivery_date, scheduled_delivery_at, delivered_at, share_page_slug, audio_variants, selected_variant_id, brief, genre, tempo, has_3rd_verse, is_rush, has_unlimited_edits, created_at",
      )
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
  };

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border/60 bg-background/80 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">
            Account
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold">Your songs</h1>
        <p className="mt-2 text-muted-foreground">
          Every song you've made — past, present, and in progress.
        </p>

        {orders.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Music className="mx-auto h-12 w-12 text-primary/60" />
            <h2 className="mt-4 font-display text-xl">No songs yet</h2>
            <p className="mt-2 text-muted-foreground">
              Make your first song — it takes about 5 minutes.
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Start a song
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onCopy={copy}
                copied={copied === o.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onCopy,
  copied,
}: {
  order: Order;
  onCopy: (url: string, id: string) => void;
  copied: boolean;
}) {
  const stage = STAGE_MAP[order.status] ?? { label: order.status, pct: 0 };
  const delivered = order.status === "delivered";
  const variants = (order.audio_variants as any[]) ?? [];
  const variant =
    variants.find((v) => v.id === order.selected_variant_id) ?? variants[0];
  const slug = order.share_page_slug ?? order.id;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/listen/${slug}` : "";
  const title = (order.brief as any)?.title;
  const lyrics = (order.brief as any)?.lyrics ?? "";

  return (
    <article className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            {delivered ? "Delivered" : "In progress"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {title ?? `A song for ${order.recipient_name}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.genre ?? "Acoustic"} · {order.tempo ?? "Mid-tempo"}
            {order.is_gift ? " · Gift" : ""}
            {order.priority === "priority" || order.is_rush ? " · Priority" : ""}
          </p>
        </div>
        <Badge variant={delivered ? "default" : "outline"}>{stage.label}</Badge>
      </div>

      {!delivered && (
        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-peach/40">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000"
              style={{ width: `${stage.pct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {order.is_gift && order.delivery_date
              ? `Delivers to ${order.recipient_name} on ${new Date(order.delivery_date).toLocaleDateString()}.`
              : order.scheduled_delivery_at
                ? `Estimated delivery: ${new Date(order.scheduled_delivery_at).toLocaleString()}.`
                : "We'll email you the moment it's ready."}
          </p>
        </div>
      )}

      {delivered && variant?.audio_url && (
        <div className="mt-6 space-y-4">
          <AudioPlayer
            variant="full"
            title={title ?? `A Song for ${order.recipient_name}`}
            artist={`${order.genre ?? "Acoustic"} · ${order.tempo ?? "Mid-tempo"}`}
            src={variant.audio_url}
            lyrics={lyrics}
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onCopy(shareUrl, order.id)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Link copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy share link
                </>
              )}
            </button>
            <Link
              to="/listen/$id"
              params={{ id: slug }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-peach/40"
            >
              Open recipient view
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
