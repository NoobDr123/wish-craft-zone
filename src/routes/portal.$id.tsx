// Customer portal — rebuilt with branded layout, variant switching, $5 second-variant unlock,
// one-time regeneration, reward tracking + redemption, public share link, lyrics, reaction,
// free revision, and refund/gift-card request.

import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Sparkles, Lock, Share2, Music, Gift } from "lucide-react";
import { RibbonMark } from "@/components/Logo";
import { VinylPlayer } from "@/components/VinylPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/$id")({
  component: PortalSong,
  head: () => ({
    meta: [
      { title: "Your song · RibbonSong" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Variant = { id: string; audio_url?: string; locked?: boolean };
type Order = any;
type Reward = {
  id: string;
  code: string;
  status: string;
  free_songs_remaining: number;
  unlocked_at: string | null;
  fully_redeemed_at: string | null;
};
type PromoCode = {
  id: string;
  code: string;
  kind: string;
  discount_pct: number;
  active: boolean;
  expires_at: string | null;
  times_used: number;
  max_uses: number;
};

function PortalSong() {
  const { id } = useParams({ from: "/portal/$id" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [revision, setRevision] = useState<any>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [returningPromos, setReturningPromos] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<"player" | "reaction" | "revision" | "refund" | "rewards">(
    "player",
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/portal/${id}` } as any });
      return;
    }
    void load();
  }, [loading, user, id]);

  const load = async () => {
    const { data: o } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setOrder(o);

    const [{ data: rev }, { data: rf }, { data: rx }, { data: rwd }, { data: promos }] =
      await Promise.all([
        supabase.from("revision_requests").select("*").eq("order_id", id).maybeSingle(),
        supabase
          .from("refund_requests")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reaction_videos")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reaction_reward_codes")
          .select("*")
          .eq("order_id", id)
          .maybeSingle(),
        supabase
          .from("promo_codes")
          .select("*")
          .eq("kind", "returning_10pct")
          .eq("issued_for_order_id", id)
          .order("created_at", { ascending: false }),
      ]);
    setRevision(rev);
    setRefunds(rf ?? []);
    setReactions(rx ?? []);
    setReward(rwd ?? null);
    setReturningPromos((promos as PromoCode[]) ?? []);
  };

  const variants: Variant[] = useMemo(
    () => ((order?.audio_variants as Variant[]) ?? []).filter(Boolean),
    [order],
  );
  const selectedVariant: Variant | undefined = useMemo(
    () => variants.find((v) => v.id === order?.selected_variant_id) ?? variants[0],
    [variants, order?.selected_variant_id],
  );
  const otherVariant: Variant | undefined = useMemo(
    () => variants.find((v) => v.id !== selectedVariant?.id),
    [variants, selectedVariant],
  );

  if (loading || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1F1B16] text-[rgba(246,240,230,0.6)]">
        Loading…
      </div>
    );
  }

  const title = (order.brief as any)?.title ?? `A song for ${order.recipient_name}`;
  const lyrics = (order.brief as any)?.lyrics ?? "";
  const tags = `${order.genre ?? "Acoustic"} · ${order.tempo ?? "Mid-tempo"}`;
  const delivered = order.status === "delivered" && !!selectedVariant?.audio_url;
  const sharePath = order.share_page_slug ? `/listen/${order.share_page_slug}` : null;

  const tabs: Array<[typeof tab, string]> = [
    ["player", "Lyrics"],
    ["reaction", "Reaction video"],
    ["revision", "Free revision"],
    ["refund", "Refund / gift card"],
    ["rewards", "Rewards"],
  ];

  return (
    <div className="min-h-screen bg-[#1F1B16] pb-24 text-[#F6F0E6]">
      {/* Branded header */}
      <header className="border-b border-[rgba(246,240,230,0.1)] px-5 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em] text-[#F6F0E6]"
          >
            <RibbonMark className="h-6 w-6" />
            RibbonSong
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/dashboard"
              className="text-[rgba(246,240,230,0.6)] hover:text-[#F6F0E6]"
            >
              All songs
            </Link>
            <Link
              to="/create"
              className="rounded-full bg-[#E5D9EF] px-4 py-2 font-medium text-[#1F1B16] hover:bg-[#d8c8e6]"
            >
              Send another
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
        {!delivered ? (
          <div className="rounded-3xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-8 text-center">
            <h1 className="font-display text-3xl font-semibold">Still being made</h1>
            <p className="mt-2 text-[rgba(246,240,230,0.65)]">
              We'll email you the moment it's ready.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-block text-[#E5D9EF] underline"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <>
            <VinylPlayer src={selectedVariant!.audio_url!} title={title} tags={tags} />

            {/* Variant switcher / unlock */}
            <VariantSwitcher
              order={order}
              variants={variants}
              selectedVariant={selectedVariant}
              otherVariant={otherVariant}
              onChange={load}
            />

            {/* Tag badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
              {order.has_3rd_verse && (
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.8)]">
                  3rd verse
                </Badge>
              )}
              {order.is_rush && (
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.8)]">
                  Rush
                </Badge>
              )}
              {order.has_unlimited_edits && (
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.8)]">
                  Unlimited edits
                </Badge>
              )}
              {order.is_gift && (
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.8)]">
                  Gift
                </Badge>
              )}
              {order.source_kind === "free_reward" && (
                <Badge className="bg-[#E5D9EF] text-[#1F1B16]">Free song reward</Badge>
              )}
            </div>

            {/* Share + regenerate quick actions */}
            <ActionsRow
              order={order}
              sharePath={sharePath}
              onRegenerated={load}
            />

            {/* Tabs */}
            <nav className="mt-10 flex justify-center gap-1 border-b border-[rgba(246,240,230,0.15)] overflow-x-auto">
              {tabs.map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative whitespace-nowrap px-4 py-3 text-sm transition ${
                    tab === k
                      ? "font-semibold text-[#F6F0E6]"
                      : "text-[rgba(246,240,230,0.55)] hover:text-[#F6F0E6]"
                  }`}
                >
                  {l}
                  {tab === k && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-[#E5D9EF]" />
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-8">
              {tab === "player" && (
                <pre className="whitespace-pre-wrap rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6 font-sans text-[15px] leading-relaxed text-[#F6F0E6]">
                  {lyrics}
                </pre>
              )}
              {tab === "reaction" && (
                <ReactionTab
                  orderId={order.id}
                  buyerEmail={order.buyer_email}
                  userId={user!.id}
                  reactions={reactions}
                  reward={reward}
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
              {tab === "rewards" && (
                <RewardsTab reward={reward} returningPromos={returningPromos} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Variant switcher + $5 unlock                                            */
/* ----------------------------------------------------------------------- */

function VariantSwitcher({
  order,
  variants,
  selectedVariant,
  otherVariant,
  onChange,
}: {
  order: Order;
  variants: Variant[];
  selectedVariant: Variant | undefined;
  otherVariant: Variant | undefined;
  onChange: () => Promise<void>;
}) {
  const [unlocking, setUnlocking] = useState(false);

  const hasSavedCard = !!order.stripe_payment_method_id;
  const unlocked = !!order.second_variant_unlocked_at;
  const canSwitch = unlocked || variants.filter((v) => v.audio_url).length > 1;

  const select = async (variantId: string) => {
    if (variantId === selectedVariant?.id) return;
    const { error } = await supabase
      .from("orders")
      .update({ selected_variant_id: variantId })
      .eq("id", order.id);
    if (error) {
      toast.error("Could not switch variant");
      return;
    }
    await onChange();
  };

  const unlock = async () => {
    if (!hasSavedCard) {
      toast.error("No saved card — contact support to unlock the second take.");
      return;
    }
    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-second-variant", {
        body: { orderId: order.id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Unlock failed");
        return;
      }
      toast.success("Second take unlocked");
      await onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Unlock failed");
    } finally {
      setUnlocking(false);
    }
  };

  if (variants.length < 2 && !otherVariant) return null;

  return (
    <div className="mt-6 rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-[rgba(246,240,230,0.55)]">
          Two takes were generated
        </p>
        {!unlocked && otherVariant && !otherVariant.audio_url ? null : (
          <span className="text-xs text-[rgba(246,240,230,0.55)]">
            {canSwitch ? "Tap to switch" : ""}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {variants.map((v, i) => {
          const active = v.id === selectedVariant?.id;
          const isOther = v.id !== selectedVariant?.id;
          const locked = isOther && !unlocked && variants.length === 1; // only one came back; unlock will fetch second
          return (
            <button
              key={v.id || i}
              onClick={() => v.audio_url && select(v.id)}
              disabled={!v.audio_url}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                active
                  ? "border-[#E5D9EF] bg-[rgba(229,217,239,0.12)] text-[#F6F0E6]"
                  : "border-[rgba(246,240,230,0.15)] bg-transparent text-[rgba(246,240,230,0.7)] hover:border-[rgba(246,240,230,0.3)]"
              } ${!v.audio_url ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5" />
                Take {i + 1}
              </span>
              {active && <Check className="h-4 w-4" />}
              {locked && <Lock className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {!unlocked && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[rgba(229,217,239,0.25)] bg-[rgba(229,217,239,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#E5D9EF]">Unlock the second take</p>
            <p className="mt-0.5 text-xs text-[rgba(246,240,230,0.65)]">
              Same lyrics, a different feel. One-time $5 charge to your saved card.
            </p>
          </div>
          <Button
            onClick={unlock}
            disabled={unlocking || !hasSavedCard}
            className="bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
          >
            {unlocking ? "Charging…" : hasSavedCard ? "Unlock for $5" : "No saved card"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Share link + regeneration                                               */
/* ----------------------------------------------------------------------- */

function ActionsRow({
  order,
  sharePath,
  onRegenerated,
}: {
  order: Order;
  sharePath: string | null;
  onRegenerated: () => Promise<void>;
}) {
  const [regenOpen, setRegenOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const regenUsed = !!order.regeneration_used_at;

  const copyShare = async () => {
    if (!sharePath || typeof window === "undefined") return;
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const submitRegen = async () => {
    if (notes.trim().length < 10) {
      toast.error("Please describe the change (min 10 chars)");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-song", {
        body: { orderId: order.id, changeNotes: notes.trim() },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Regenerate failed");
        return;
      }
      toast.success("Regenerating — we'll email you when ready");
      setNotes("");
      setRegenOpen(false);
      await onRegenerated();
    } catch (e: any) {
      toast.error(e?.message ?? "Regenerate failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {sharePath && (
        <Button
          variant="outline"
          size="sm"
          onClick={copyShare}
          className="border-[rgba(246,240,230,0.2)] bg-transparent text-[#F6F0E6] hover:bg-[rgba(246,240,230,0.08)]"
        >
          <Share2 className="mr-2 h-3.5 w-3.5" /> Copy share link
        </Button>
      )}
      {!regenUsed && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRegenOpen((v) => !v)}
          className="border-[rgba(246,240,230,0.2)] bg-transparent text-[#F6F0E6] hover:bg-[rgba(246,240,230,0.08)]"
        >
          <Sparkles className="mr-2 h-3.5 w-3.5" /> Regenerate (1 free)
        </Button>
      )}

      {regenOpen && (
        <div className="mt-2 w-full rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-5">
          <h3 className="font-display text-lg">What should we change?</h3>
          <p className="mt-1 text-xs text-[rgba(246,240,230,0.6)]">
            One free full regeneration per order. We'll re-write the lyrics + re-record from scratch.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
            placeholder="e.g. Slower tempo, mention our daughter Mia, change 'fighter' to 'warrior' in verse 2…"
            rows={5}
            className="mt-3 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenOpen(false)}
              className="border-[rgba(246,240,230,0.2)] bg-transparent text-[#F6F0E6] hover:bg-[rgba(246,240,230,0.08)]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitRegen}
              disabled={submitting}
              className="bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
            >
              {submitting ? "Submitting…" : "Regenerate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Reaction tab                                                             */
/* ----------------------------------------------------------------------- */

function ReactionTab({ orderId, buyerEmail, userId, reactions, reward, reload }: any) {
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
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${orderId}-${Date.now()}-${safeName}`;
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
      toast.success("Reaction submitted — we'll review within 24h");
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Re-Found reaction reward</h2>
          <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">
            Send us the moment they hear it for the first time. When approved, we'll{" "}
            <span className="font-medium text-[#F6F0E6]">refund your order in full</span> and give you{" "}
            <span className="font-medium text-[#F6F0E6]">2 free songs</span> to gift to anyone.
          </p>
        </div>
        {reward?.status === "approved" && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            Approved
          </Badge>
        )}
      </div>

      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-5 block w-full text-sm text-[rgba(246,240,230,0.7)] file:mr-3 file:rounded-full file:border-0 file:bg-[#E5D9EF] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1F1B16]"
      />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 280))}
        placeholder="Caption (optional)"
        className="mt-3 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
        rows={3}
      />
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <Button
        className="mt-4 bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
        disabled={!file || busy}
        onClick={upload}
      >
        {busy ? "Uploading…" : "Submit reaction"}
      </Button>

      {reactions.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[rgba(246,240,230,0.55)]">
            Your submissions
          </p>
          {reactions.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-[rgba(246,240,230,0.04)] px-3 py-2 text-sm"
            >
              <span className="text-[rgba(246,240,230,0.75)]">
                {new Date(r.created_at).toLocaleString()}
              </span>
              <Badge
                variant="outline"
                className={
                  r.status === "approved"
                    ? "border-emerald-500/40 text-emerald-300"
                    : r.status === "rejected"
                      ? "border-red-500/40 text-red-300"
                      : "border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.7)]"
                }
              >
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Revision tab                                                             */
/* ----------------------------------------------------------------------- */

function RevisionTab({ orderId, buyerEmail, existing, reload }: any) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (notes.trim().length < 10) return;
    setBusy(true);
    const { error } = await supabase.from("revision_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      notes: notes.trim(),
      is_free: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes("");
    toast.success("Revision request received");
    await reload();
  };

  if (existing) {
    return (
      <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
        <h2 className="font-display text-xl">Your revision</h2>
        <Badge variant="outline" className="mt-2 border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]">
          {existing.status}
        </Badge>
        <p className="mt-3 whitespace-pre-wrap text-sm text-[rgba(246,240,230,0.85)]">
          {existing.notes}
        </p>
        <p className="mt-4 text-xs text-[rgba(246,240,230,0.55)]">
          Free revisions are limited to one per song. Need more changes?{" "}
          <Link to="/create" className="text-[#E5D9EF] underline">
            Order another song
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
      <h2 className="font-display text-xl">Request a free revision</h2>
      <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">
        You get one free revision per song. Tell us what to change.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
        placeholder="e.g. Slower tempo, change 'fighter' to 'warrior' in verse 2…"
        className="mt-3 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
        rows={6}
      />
      <Button
        className="mt-4 bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
        disabled={notes.trim().length < 10 || busy}
        onClick={submit}
      >
        {busy ? "Submitting…" : "Submit revision request"}
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Refund tab                                                               */
/* ----------------------------------------------------------------------- */

function RefundTab({ orderId, buyerEmail, refunds, reload }: any) {
  const [type, setType] = useState<"refund" | "amazon_gift_card" | "both">("refund");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 20) return;
    setBusy(true);
    const { error } = await supabase.from("refund_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      request_type: type,
      reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReason("");
    toast.success("Request submitted");
    await reload();
  };

  return (
    <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
      <h2 className="font-display text-xl">Refund or Amazon gift card</h2>
      <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">
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
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              type === k
                ? "border-[#E5D9EF] bg-[#E5D9EF] text-[#1F1B16]"
                : "border-[rgba(246,240,230,0.2)] bg-transparent text-[rgba(246,240,230,0.75)] hover:border-[rgba(246,240,230,0.4)]"
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
        className="mt-3 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
        rows={6}
      />
      <Button
        className="mt-4 bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
        disabled={reason.trim().length < 20 || busy}
        onClick={submit}
      >
        {busy ? "Submitting…" : "Submit request"}
      </Button>

      {refunds.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[rgba(246,240,230,0.55)]">
            Your requests
          </p>
          {refunds.map((r: any) => (
            <div
              key={r.id}
              className="rounded-lg bg-[rgba(246,240,230,0.04)] px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="capitalize text-[rgba(246,240,230,0.85)]">
                  {r.request_type.replace("_", " ")}
                </span>
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]">
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[rgba(246,240,230,0.55)]">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Rewards tab — reaction reward + returning customer codes                 */
/* ----------------------------------------------------------------------- */

function RewardsTab({
  reward,
  returningPromos,
}: {
  reward: Reward | null;
  returningPromos: PromoCode[];
}) {
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-4">
      {/* Reaction reward */}
      <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
        <div className="flex items-start gap-3">
          <Gift className="mt-1 h-5 w-5 text-[#E5D9EF]" />
          <div className="flex-1">
            <h2 className="font-display text-xl">Reaction reward (2 free songs)</h2>
            {!reward && (
              <p className="mt-2 text-sm text-[rgba(246,240,230,0.65)]">
                Submit a reaction video on the previous tab. Once approved, your code unlocks here
                and you can send 2 free songs to anyone.
              </p>
            )}
            {reward && reward.status !== "approved" && (
              <p className="mt-2 text-sm text-[rgba(246,240,230,0.65)]">
                Status:{" "}
                <Badge variant="outline" className="ml-1 border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]">
                  {reward.status}
                </Badge>
              </p>
            )}
            {reward && reward.status === "approved" && (
              <>
                <p className="mt-2 text-sm text-[rgba(246,240,230,0.7)]">
                  <span className="font-medium text-[#F6F0E6]">{reward.free_songs_remaining}</span>{" "}
                  free song{reward.free_songs_remaining === 1 ? "" : "s"} remaining
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(229,217,239,0.3)] bg-[rgba(229,217,239,0.08)] px-4 py-3">
                  <code className="flex-1 font-mono text-sm font-semibold text-[#E5D9EF]">
                    {reward.code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(reward.code)}
                    className="border-[rgba(229,217,239,0.4)] bg-transparent text-[#E5D9EF] hover:bg-[rgba(229,217,239,0.1)]"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <Link
                  to="/create"
                  search={{ reward: reward.code } as any}
                  className="mt-3 inline-block text-sm text-[#E5D9EF] underline"
                >
                  Use it now → start a free song
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Returning customer 10% codes */}
      {returningPromos.length > 0 && (
        <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
          <h2 className="font-display text-xl">Your 10% off code</h2>
          <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">
            Saved for next time you order — works at checkout.
          </p>
          <div className="mt-3 space-y-2">
            {returningPromos.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-[rgba(246,240,230,0.15)] bg-[rgba(246,240,230,0.04)] px-4 py-3"
              >
                <code className="flex-1 font-mono text-sm font-semibold text-[#F6F0E6]">
                  {p.code}
                </code>
                <Badge
                  variant="outline"
                  className={
                    p.times_used >= p.max_uses || !p.active
                      ? "border-[rgba(246,240,230,0.2)] text-[rgba(246,240,230,0.4)]"
                      : "border-emerald-500/40 text-emerald-300"
                  }
                >
                  {p.times_used >= p.max_uses ? "Used" : !p.active ? "Inactive" : `${p.discount_pct}% off`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(p.code)}
                  className="border-[rgba(246,240,230,0.2)] bg-transparent text-[#F6F0E6] hover:bg-[rgba(246,240,230,0.08)]"
                  disabled={p.times_used >= p.max_uses || !p.active}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
