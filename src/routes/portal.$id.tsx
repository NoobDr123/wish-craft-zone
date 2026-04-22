// Customer portal — vinyl player, lyrics, upsells, reaction upload, refund + free revision.

import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { VinylPlayer } from "@/components/VinylPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/$id")({
  component: PortalSong,
  head: () => ({ meta: [{ title: "Your song · RibbonSong" }] }),
});

function PortalSong() {
  const { id } = useParams({ from: "/portal/$id" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [revision, setRevision] = useState<any>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [tab, setTab] = useState<"player" | "reaction" | "revision" | "refund">("player");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/portal/${id}` } as any });
      return;
    }
    load();
  }, [loading, user, id]);

  const load = async () => {
    const { data: o } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setOrder(o);
    const { data: rev } = await supabase
      .from("revision_requests")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();
    setRevision(rev);
    const { data: rf } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    setRefunds(rf ?? []);
    const { data: rx } = await supabase
      .from("reaction_videos")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    setReactions(rx ?? []);
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const variants = (order.audio_variants as any[]) ?? [];
  const variant =
    variants.find((v) => v.id === order.selected_variant_id) ?? variants[0];
  const title = (order.brief as any)?.title ?? `A song for ${order.recipient_name}`;
  const lyrics = (order.brief as any)?.lyrics ?? "";
  const tags = `${order.genre ?? "Acoustic"} · ${order.tempo ?? "Mid-tempo"}`;
  const delivered = order.status === "delivered" && variant?.audio_url;

  return (
    <div className="min-h-screen bg-gradient-warm pb-24">
      <header className="border-b border-border/40 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              All songs
            </Link>
            <Link
              to="/create"
              className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
            >
              Send another
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {!delivered ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-3xl font-semibold">Still being made</h1>
            <p className="mt-2 text-muted-foreground">
              We'll email you the moment it's ready.
            </p>
            <Link to="/dashboard" className="mt-6 inline-block text-primary underline">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <>
            <VinylPlayer src={variant.audio_url} title={title} tags={tags} />

            <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs">
              {order.has_3rd_verse && <Badge variant="outline">3rd verse</Badge>}
              {(order.has_unlimited_edits || order.is_rush) && (
                <Badge variant="outline">{order.is_rush ? "Rush" : "Unlimited edits"}</Badge>
              )}
              {order.is_gift && <Badge variant="outline">Gift</Badge>}
            </div>

            <nav className="mt-10 flex justify-center gap-1 border-b border-border/60">
              {(
                [
                  ["player", "Lyrics"],
                  ["reaction", "Reaction video"],
                  ["revision", "Free revision"],
                  ["refund", "Refund / gift card"],
                ] as Array<[typeof tab, string]>
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-4 py-3 text-sm transition ${
                    tab === k
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                  {tab === k && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-8">
              {tab === "player" && (
                <pre className="whitespace-pre-wrap rounded-2xl bg-card/70 p-6 font-sans text-base leading-relaxed">
                  {lyrics}
                </pre>
              )}
              {tab === "reaction" && (
                <ReactionTab
                  orderId={order.id}
                  buyerEmail={order.buyer_email}
                  userId={user!.id}
                  reactions={reactions}
                  reload={load}
                />
              )}
              {tab === "revision" && (
                <RevisionTab
                  orderId={order.id}
                  buyerEmail={order.buyer_email}
                  existing={revision}
                  reload={load}
                />
              )}
              {tab === "refund" && (
                <RefundTab
                  orderId={order.id}
                  buyerEmail={order.buyer_email}
                  refunds={refunds}
                  reload={load}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ReactionTab({ orderId, buyerEmail, userId, reactions, reload }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async () => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setErr("Max 100MB.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const path = `${userId}/${orderId}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("reactions")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("reaction_videos").insert({
        order_id: orderId,
        user_id: userId,
        buyer_email: buyerEmail,
        storage_path: path,
        file_size_bytes: file.size,
        mime_type: file.type,
        caption: caption || null,
      });
      if (insErr) throw insErr;
      setFile(null);
      setCaption("");
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl">Share a reaction video</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload an MP4 (up to 100MB). We may feature it with your permission.
      </p>
      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-4 block w-full text-sm"
      />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 280))}
        placeholder="Caption (optional)"
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        rows={3}
      />
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <Button className="mt-4" disabled={!file || busy} onClick={upload}>
        {busy ? "Uploading…" : "Submit reaction"}
      </Button>

      {reactions.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Your submissions
          </p>
          {reactions.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
            >
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <Badge variant="outline">{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevisionTab({ orderId, buyerEmail, existing, reload }: any) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (notes.trim().length < 10) return;
    setBusy(true);
    await supabase.from("revision_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      notes: notes.trim(),
      is_free: true,
    });
    setBusy(false);
    setNotes("");
    await reload();
  };

  if (existing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl">Your revision</h2>
        <Badge className="mt-2" variant="outline">
          {existing.status}
        </Badge>
        <p className="mt-3 whitespace-pre-wrap text-sm">{existing.notes}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Free revisions are limited to one per song. Need more changes?{" "}
          <Link to="/create" className="text-primary underline">
            Order another song
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl">Request a free revision</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You get one free revision per song. Tell us what to change.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
        placeholder="e.g. Slower tempo, change 'fighter' to 'warrior' in verse 2…"
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        rows={6}
      />
      <Button
        className="mt-4"
        disabled={notes.trim().length < 10 || busy}
        onClick={submit}
      >
        {busy ? "Submitting…" : "Submit revision request"}
      </Button>
    </div>
  );
}

function RefundTab({ orderId, buyerEmail, refunds, reload }: any) {
  const [type, setType] = useState<"refund" | "amazon_gift_card" | "both">(
    "refund",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 20) return;
    setBusy(true);
    await supabase.from("refund_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      request_type: type,
      reason: reason.trim(),
    });
    setBusy(false);
    setReason("");
    await reload();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl">Refund or Amazon gift card</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us what happened. We review every request personally.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["refund", "Refund"],
            ["amazon_gift_card", "Amazon gift card"],
            ["both", "Both"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setType(k)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              type === k
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-peach/40"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 2000))}
        placeholder="Please tell us what happened (min 20 characters)…"
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        rows={6}
      />
      <Button
        className="mt-4"
        disabled={reason.trim().length < 20 || busy}
        onClick={submit}
      >
        {busy ? "Submitting…" : "Submit request"}
      </Button>

      {refunds.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Your requests
          </p>
          {refunds.map((r: any) => (
            <div
              key={r.id}
              className="rounded-lg bg-background px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="capitalize">{r.request_type.replace("_", " ")}</span>
                <Badge variant="outline">{r.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
