// Customer portal — rebuilt with branded layout, variant switching, $5 second-variant unlock,
// one-time regeneration, reward tracking + redemption, public share link, lyrics, reaction,
// free revision, and refund/gift-card request.

import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Sparkles, Lock, Share2, Music, Gift, Download, Heart, Ticket } from "lucide-react";
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
  const [revisions, setRevisions] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [returningPromos, setReturningPromos] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<"player" | "reaction" | "refund" | "rewards">(
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
        supabase
          .from("revision_requests")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false }),
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
    setRevisions(rev ?? []);
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

  // Backend hard cap of 15 to prevent abuse, but UI presents as "Unlimited" for upsell purchasers.
  const revisionCap = order.has_unlimited_edits ? 15 : 1;
  const revisionsUsed = revisions.length;

  const tabs: Array<[typeof tab, string]> = [
    ["player", "Lyrics"],
    ["reaction", "Reaction video"],
    ["refund", "Contact support"],
    ["rewards", "Free gifts"],
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

            {/* Share + download */}
            <ShareSection
              audioUrl={selectedVariant?.audio_url}
              title={title}
              recipientName={order.recipient_name}
              sharePath={sharePath}
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
                <div className="space-y-6">
                  <pre className="whitespace-pre-wrap rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6 font-sans text-[15px] leading-relaxed text-[#F6F0E6]">
                    {lyrics}
                  </pre>
                  <RevisionTab
                    orderId={order.id}
                    buyerEmail={order.buyer_email}
                    revisions={revisions}
                    cap={revisionCap}
                    used={revisionsUsed}
                    hasUnlimited={!!order.has_unlimited_edits}
                    reload={load}
                  />
                </div>
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
          Two versions of your song
        </p>
        {unlocked && (
          <span className="text-xs text-[rgba(246,240,230,0.55)]">Tap to switch</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((i) => {
          const v = variants[i];
          const isFirst = i === 0;
          const isLockedSecond = !isFirst && !unlocked;
          const active = v && v.id === selectedVariant?.id;
          const playable = !!v?.audio_url && (isFirst || unlocked);
          return (
            <button
              key={v?.id || `slot-${i}`}
              onClick={() => playable && v && select(v.id)}
              disabled={!playable}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                active
                  ? "border-[#E5D9EF] bg-[rgba(229,217,239,0.12)] text-[#F6F0E6]"
                  : isLockedSecond
                    ? "border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.02)] text-[rgba(246,240,230,0.45)]"
                    : "border-[rgba(246,240,230,0.15)] bg-transparent text-[rgba(246,240,230,0.7)] hover:border-[rgba(246,240,230,0.3)]"
              } ${!playable && !isLockedSecond ? "opacity-50 cursor-not-allowed" : ""} ${isLockedSecond ? "cursor-not-allowed" : ""}`}
            >
              <span className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5" />
                Version {i + 1}
              </span>
              {active && <Check className="h-4 w-4" />}
              {isLockedSecond && <Lock className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {!unlocked && (
        <div className="mt-4 rounded-xl border border-[rgba(229,217,239,0.25)] bg-[rgba(229,217,239,0.06)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#E5D9EF]">
                Hear it sung a different way
              </p>
              <p className="mt-0.5 text-xs text-[rgba(246,240,230,0.7)]">
                Same heartfelt lyrics — a fresh voice and feel. Many people end up loving the second one more.
              </p>
            </div>
            <Button
              onClick={unlock}
              disabled={unlocking || !hasSavedCard}
              className="bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6] whitespace-nowrap"
            >
              {unlocking ? "Unlocking…" : hasSavedCard ? "Unlock for $5" : "No saved card"}
            </Button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[rgba(246,240,230,0.45)]">
            We'll make a one-time $5 charge to the card you used at checkout. No subscription.
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Share section — share link + download                                    */
/* ----------------------------------------------------------------------- */

function ShareSection({
  audioUrl,
  title,
  recipientName,
  sharePath,
}: {
  audioUrl: string | undefined;
  title: string;
  recipientName: string;
  sharePath: string | null;
}) {
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

  const downloadSong = async () => {
    if (!audioUrl) return;
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = `${title} — for ${recipientName}`.replace(/[^a-z0-9 ._-]/gi, "").trim();
      a.download = `${safeName || "ribbonsong"}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download — try again or right-click the player to save.");
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6 text-center">
      <h3 className="font-display text-xl">Share it with {recipientName}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[rgba(246,240,230,0.65)]">
        Send the private link, or download the file and send it however feels right —
        text, email, or save it forever.
      </p>
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
        {audioUrl && (
          <Button
            size="sm"
            onClick={downloadSong}
            className="bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
          >
            <Download className="mr-2 h-3.5 w-3.5" /> Download song
          </Button>
        )}
      </div>
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

function RevisionTab({
  orderId,
  buyerEmail,
  revisions,
  cap,
  used,
  hasUnlimited,
  reload,
}: {
  orderId: string;
  buyerEmail: string;
  revisions: any[];
  cap: number;
  used: number;
  hasUnlimited: boolean;
  reload: () => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const remaining = Math.max(0, cap - used);
  const canSubmit = remaining > 0;

  const submit = async () => {
    if (notes.trim().length < 10 || !canSubmit) return;
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

  const helper = hasUnlimited
    ? `Unlimited revisions on this song. ${used} submitted so far.`
    : "Tell us what to tweak — wording, tempo, voice, anything. We'll re-record it for you, on us.";

  return (
    <div className="space-y-6">
      {/* Past revisions */}
      {revisions.length > 0 && (
        <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Your revisions</h2>
            <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]">
              {hasUnlimited ? `${used} submitted` : `${used} of ${cap} used`}
            </Badge>
          </div>
          <div className="mt-4 space-y-4">
            {revisions.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[rgba(246,240,230,0.1)] bg-[rgba(246,240,230,0.03)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[rgba(246,240,230,0.55)]">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]"
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[rgba(246,240,230,0.85)]">
                  {r.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New request OR cap-reached message */}
      {canSubmit ? (
        <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
          <h2 className="font-display text-xl">
            Don't love the lyrics? Let our team help.
          </h2>
          <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">{helper}</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
            placeholder="e.g. Slower tempo, change 'fighter' to 'warrior' in verse 2, mention our daughter Mia…"
            className="mt-3 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
            rows={6}
          />
          <Button
            className="mt-4 bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
            disabled={notes.trim().length < 10 || busy}
            onClick={submit}
          >
            {busy ? "Submitting…" : hasUnlimited ? "Submit revision" : "Send to our team — it's free"}
          </Button>
          {hasUnlimited && (
            <p className="mt-3 text-xs text-[rgba(246,240,230,0.55)]">
              Unlimited revisions included with this song.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
          <h2 className="font-display text-xl">No revisions remaining</h2>
          <p className="mt-2 text-sm text-[rgba(246,240,230,0.7)]">
            You've used all {cap} {cap === 1 ? "revision" : "revisions"} for this song. Need more changes?{" "}
            <Link to="/create" className="text-[#E5D9EF] underline">
              Order another song
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Support tab — contact our team (used to be refund/gift card)             */
/* ----------------------------------------------------------------------- */

function RefundTab({ orderId, buyerEmail, refunds, reload }: any) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 20) return;
    setBusy(true);
    const { error } = await supabase.from("refund_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      request_type: "refund",
      reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReason("");
    toast.success("Message sent — our team will reply soon");
    await reload();
  };

  return (
    <div className="rounded-2xl border border-[rgba(246,240,230,0.12)] bg-[rgba(246,240,230,0.04)] p-6">
      <h2 className="font-display text-xl">Talk to our team</h2>
      <p className="mt-1 text-sm text-[rgba(246,240,230,0.65)]">
        Whether you want to say thanks, ask a question, request a refund, or just need a hand —
        write to us here. A real person reads every message and gets back to you, usually within
        a few hours.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 2000))}
        placeholder="Tell us what's on your mind (min 20 characters)…"
        className="mt-4 w-full rounded-xl border border-[rgba(246,240,230,0.2)] bg-[rgba(246,240,230,0.06)] p-3 text-sm text-[#F6F0E6] placeholder:text-[rgba(246,240,230,0.4)]"
        rows={6}
      />
      <Button
        className="mt-4 bg-[#E5D9EF] text-[#1F1B16] hover:bg-[#d8c8e6]"
        disabled={reason.trim().length < 20 || busy}
        onClick={submit}
      >
        {busy ? "Sending…" : "Send message"}
      </Button>

      {refunds.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[rgba(246,240,230,0.55)]">
            Your messages
          </p>
          {refunds.map((r: any) => (
            <div
              key={r.id}
              className="rounded-lg bg-[rgba(246,240,230,0.04)] px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[rgba(246,240,230,0.85)]">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <Badge variant="outline" className="border-[rgba(246,240,230,0.3)] text-[rgba(246,240,230,0.75)]">
                  {r.status}
                </Badge>
              </div>
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

  const reactionApproved = reward?.status === "approved";
  const reactionStatus = reward?.status ?? null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-2xl">Two free gifts, just for you</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[rgba(246,240,230,0.65)]">
          Our way of saying thank you. Two golden tickets you can use whenever you'd like.
        </p>
      </div>

      {/* Ticket 1 — Reaction reward (refund + 2 free songs) */}
      <GoldTicket
        icon={<Heart className="h-5 w-5" />}
        eyebrow="Golden ticket #1"
        title="Send us their reaction → full refund + 2 free songs"
        body={
          !reward
            ? "Capture the moment they hear it for the first time, upload it on the Reaction video tab, and once approved we'll refund this order in full and give you 2 free songs to gift to anyone."
            : reactionApproved
              ? `Approved! ${reward!.free_songs_remaining} free song${reward!.free_songs_remaining === 1 ? "" : "s"} remaining.`
              : `Status: ${reactionStatus}. We'll email you as soon as it's reviewed.`
        }
        code={reactionApproved ? reward!.code : null}
        onCopy={reactionApproved ? () => copy(reward!.code) : undefined}
        ctaLink={
          reactionApproved
            ? { to: "/create", search: { reward: reward!.code }, label: "Use it now → start a free song" }
            : null
        }
      />

      {/* Ticket 2 — Returning customer discount */}
      {returningPromos.length > 0 ? (
        returningPromos.map((p, idx) => (
          <GoldTicket
            key={p.id}
            icon={<Ticket className="h-5 w-5" />}
            eyebrow={returningPromos.length > 1 ? `Golden ticket #${idx + 2}` : "Golden ticket #2"}
            title={`${p.discount_pct}% off your next song`}
            body="Saved for the next time someone in your life deserves a song. Works at checkout."
            code={p.active && p.times_used < p.max_uses ? p.code : null}
            badge={
              p.times_used >= p.max_uses
                ? "Used"
                : !p.active
                  ? "Inactive"
                  : `${p.discount_pct}% off`
            }
            onCopy={
              p.active && p.times_used < p.max_uses ? () => copy(p.code) : undefined
            }
          />
        ))
      ) : (
        <GoldTicket
          icon={<Ticket className="h-5 w-5" />}
          eyebrow="Golden ticket #2"
          title="A special offer on your next song"
          body="Once your song is delivered, a personal discount code will appear here for the next time you'd like to send a song."
        />
      )}
    </div>
  );
}

function GoldTicket({
  icon,
  eyebrow,
  title,
  body,
  code,
  badge,
  onCopy,
  ctaLink,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  code?: string | null;
  badge?: string;
  onCopy?: () => void;
  ctaLink?: { to: string; search?: any; label: string } | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(229,217,239,0.3)] bg-gradient-to-br from-[rgba(229,217,239,0.10)] via-[rgba(246,240,230,0.04)] to-[rgba(229,217,239,0.06)] p-6 shadow-[0_0_40px_-20px_rgba(229,217,239,0.4)]">
      {/* perforated edge accent */}
      <div className="absolute inset-y-0 left-16 hidden w-px bg-[rgba(246,240,230,0.12)] sm:block" />
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(229,217,239,0.18)] text-[#E5D9EF]">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E5D9EF]">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-display text-lg leading-snug text-[#F6F0E6]">{title}</h3>
          <p className="mt-2 text-sm text-[rgba(246,240,230,0.7)]">{body}</p>

          {code && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[rgba(229,217,239,0.3)] bg-[rgba(229,217,239,0.08)] px-4 py-3">
              <code className="flex-1 font-mono text-sm font-semibold text-[#E5D9EF]">
                {code}
              </code>
              {badge && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                  {badge}
                </Badge>
              )}
              {onCopy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopy}
                  className="border-[rgba(229,217,239,0.4)] bg-transparent text-[#E5D9EF] hover:bg-[rgba(229,217,239,0.1)]"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>
          )}

          {ctaLink && (
            <Link
              to={ctaLink.to}
              search={ctaLink.search}
              className="mt-3 inline-block text-sm text-[#E5D9EF] underline"
            >
              {ctaLink.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
