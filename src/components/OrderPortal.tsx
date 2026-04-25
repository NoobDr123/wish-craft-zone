// Shared order portal — used inside /account. Renders one order's full self-service UI:
// player + variant unlock + share/download + lyrics/revisions + reaction + support + free gifts.

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Share2,
  Music,
  Download,
  Heart,
  Ticket,
  Pencil,
  MessageCircle,
  Gift,
  Video,
} from "lucide-react";
import { VinylPlayer } from "@/components/VinylPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function OrderPortal({ orderId, userId }: { orderId: string; userId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [returningPromos, setReturningPromos] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<"player" | "reaction" | "refund" | "rewards">("player");

  useEffect(() => {
    void load();
    // Reset to lyrics tab when switching orders
    setTab("player");
  }, [orderId]);

  // Poll while in-progress
  useEffect(() => {
    if (!order || order.status === "delivered") return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [order?.status, orderId]);

  const load = async () => {
    const { data: o } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    setOrder(o);

    const [{ data: rev }, { data: rf }, { data: rx }, { data: rwd }, { data: promos }] =
      await Promise.all([
        supabase
          .from("revision_requests")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("refund_requests")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reaction_videos")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reaction_reward_codes")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle(),
        supabase
          .from("promo_codes")
          .select("*")
          .eq("kind", "returning_10pct")
          .eq("issued_for_order_id", orderId)
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

  if (!order) {
    return (
      <div className="flex items-center justify-center py-20 text-[rgba(31,27,22,0.6)]">
        Loading…
      </div>
    );
  }

  const title = (order.brief as any)?.title ?? `A song for ${order.recipient_name}`;
  const lyrics = (order.brief as any)?.lyrics ?? "";
  const tags = `${order.genre ?? "Acoustic"} · ${order.tempo ?? "Mid-tempo"}`;
  const delivered = order.status === "delivered" && !!selectedVariant?.audio_url;
  // Always provide a shareable URL — fall back to the order id when the
  // optional pretty slug isn't set yet. The /listen/$id route accepts both.
  const sharePath = `/listen/${order.share_page_slug ?? order.id}`;

  // Edits cap: free orders get 1 free edit. Unlimited orders are capped at
  // 10 to protect us from runaway abuse — when they hit the cap the backend
  // will reject and we surface the error inline (no scary "ran out" copy).
  const revisionCap = order.has_unlimited_edits ? 10 : 1;
  const revisionsUsed = revisions.length;

  // Tab labels are rendered by <BigTabBar />; no array needed here.

  return (
    <div>
      {!delivered ? (
        <InProgressCard order={order} />
      ) : (
        <>
          <VinylPlayer src={selectedVariant!.audio_url!} title={title} tags={tags} />

          <VariantSwitcher
            order={order}
            variants={variants}
            selectedVariant={selectedVariant}
            otherVariant={otherVariant}
            onChange={load}
          />

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
            {order.has_3rd_verse && (
              <Badge variant="outline" className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.8)]">
                3rd verse
              </Badge>
            )}
            {order.is_rush && (
              <Badge variant="outline" className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.8)]">
                Rush
              </Badge>
            )}
            {order.has_unlimited_edits && (
              <Badge variant="outline" className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.8)]">
                Unlimited edits
              </Badge>
            )}
            {order.is_gift && (
              <Badge variant="outline" className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.8)]">
                Gift
              </Badge>
            )}
            {order.source_kind === "free_reward" && (
              <Badge className="bg-[#8D6FAF] text-[#FFF7EE]">Free song reward</Badge>
            )}
          </div>

          <ShareSection
            audioUrl={selectedVariant?.audio_url}
            title={title}
            recipientName={order.recipient_name}
            sharePath={sharePath}
          />

          {/* ---- BIG OBVIOUS QUICK ACTIONS — impossible to miss ---- */}
          <QuickActions
            recipientName={order.recipient_name}
            onEdit={() => setTab("player")}
            onReaction={() => setTab("reaction")}
            onGifts={() => setTab("rewards")}
            onHelp={() => setTab("refund")}
            hasReward={!!reward}
            hasPromos={returningPromos.length > 0}
          />

          {/* ---- BIG TAB BAR — icons + labels + descriptions ---- */}
          <BigTabBar tab={tab} setTab={setTab} />

          <div className="mt-8">
            {tab === "player" && (
              <div className="space-y-6">
                <pre className="whitespace-pre-wrap rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6 font-sans text-[15px] leading-relaxed text-[#1F1B16]">
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
                userId={userId}
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
              <RewardsTab
                reward={reward}
                returningPromos={returningPromos}
                onOpenReaction={() => setTab("reaction")}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* In-progress card                                                         */
/* ----------------------------------------------------------------------- */

function InProgressCard({ order }: { order: Order }) {
  const stage = STAGE_MAP[order.status] ?? { label: "In progress", pct: 15 };
  return (
    <div className="rounded-3xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8D6FAF]">
        {stage.label}
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold">
        Your song for {order.recipient_name}
      </h2>
      <p className="mt-2 text-sm text-[rgba(31,27,22,0.65)]">
        We'll email you the moment it's ready. No need to refresh — this page updates on its own.
      </p>
      <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-[rgba(31,27,22,0.1)]">
        <div
          className="h-full rounded-full bg-[#8D6FAF] transition-all duration-700"
          style={{ width: `${stage.pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-[rgba(31,27,22,0.5)]">{stage.pct}% complete</p>
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
  const unlocked = !!order.second_variant_unlocked_at;

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

  // Only render when there's actually a second variant unlocked. The old
  // "$5 unlock" upsell card has been removed — second versions now ship
  // bundled with the upsell flow, so there's nothing to upsell here.
  if (!unlocked || variants.length < 2 || !otherVariant) return null;

  return (
    <div className="mt-6 rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-[rgba(31,27,22,0.55)]">
          Two versions of your song
        </p>
        <span className="text-xs text-[rgba(31,27,22,0.55)]">Tap to switch</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((i) => {
          const v = variants[i];
          const active = v && v.id === selectedVariant?.id;
          const playable = !!v?.audio_url;
          return (
            <button
              key={v?.id || `slot-${i}`}
              onClick={() => playable && v && select(v.id)}
              disabled={!playable}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                active
                  ? "border-[#8D6FAF] bg-[rgba(141,111,175,0.12)] text-[#1F1B16]"
                  : "border-[rgba(31,27,22,0.15)] bg-transparent text-[rgba(31,27,22,0.7)] hover:border-[rgba(31,27,22,0.3)]"
              } ${!playable ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5" />
                Version {i + 1}
              </span>
              {active && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Share section                                                            */
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
    <div className="mt-8 rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6 text-center">
      <h3 className="font-display text-xl">Share it with {recipientName}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-[rgba(31,27,22,0.65)]">
        Send the private link, or download the file and send it however feels right —
        text, email, or save it forever.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {sharePath && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyShare}
            className="border-[rgba(31,27,22,0.2)] bg-transparent text-[#1F1B16] hover:bg-[rgba(31,27,22,0.08)]"
          >
            <Share2 className="mr-2 h-3.5 w-3.5" /> Copy share link
          </Button>
        )}
        {audioUrl && (
          <Button
            size="sm"
            onClick={downloadSong}
            className="bg-[#8D6FAF] text-[#FFF7EE] hover:bg-[#6B4F8A]"
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
    <div className="rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Re-Found reaction reward</h2>
          <p className="mt-1 text-sm text-[rgba(31,27,22,0.65)]">
            Send us the moment they hear it for the first time. When approved, we'll{" "}
            <span className="font-medium text-[#1F1B16]">refund your order in full</span> and give you{" "}
            <span className="font-medium text-[#1F1B16]">2 free songs</span> to gift to anyone.
          </p>
        </div>
        {reward?.status === "approved" && (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
            Approved
          </Badge>
        )}
      </div>

      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-5 block w-full text-sm text-[rgba(31,27,22,0.7)] file:mr-3 file:rounded-full file:border-0 file:bg-[#8D6FAF] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#FFF7EE]"
      />
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 280))}
        placeholder="Caption (optional)"
        className="mt-3 w-full rounded-xl border border-[rgba(31,27,22,0.2)] bg-white p-3 text-sm text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
        rows={3}
      />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <Button
        className="mt-4 bg-[#8D6FAF] text-[#FFF7EE] hover:bg-[#6B4F8A]"
        disabled={!file || busy}
        onClick={upload}
      >
        {busy ? "Uploading…" : "Submit reaction"}
      </Button>

      {reactions.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[rgba(31,27,22,0.55)]">
            Your submissions
          </p>
          {reactions.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-[#FBF6EC] px-3 py-2 text-sm"
            >
              <span className="text-[rgba(31,27,22,0.75)]">
                {new Date(r.created_at).toLocaleString()}
              </span>
              <Badge
                variant="outline"
                className={
                  r.status === "approved"
                    ? "border-emerald-400 text-emerald-700"
                    : r.status === "rejected"
                      ? "border-red-400 text-red-700"
                      : "border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.7)]"
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const remaining = Math.max(0, cap - used);
  const canSubmit = remaining > 0;

  const submit = async () => {
    if (notes.trim().length < 10 || !canSubmit) return;
    setBusy(true);
    setSubmitError(null);
    const { error } = await supabase.from("revision_requests").insert({
      order_id: orderId,
      buyer_email: buyerEmail,
      notes: notes.trim(),
      is_free: true,
    });
    setBusy(false);
    if (error) {
      // Backend may reject (e.g. unlimited cap of 10 reached, RLS, etc.).
      // Surface the error inline — never the scary "you ran out" copy.
      setSubmitError(
        "Couldn't send that one through — please try again or message support below.",
      );
      return;
    }
    setNotes("");
    toast.success("Revision request received");
    await reload();
  };

  // Status copy — keep it positive and concrete.
  // Free tier: "1 free edit left" / "0 free edits left"
  // Unlimited: "Unlimited edits included · X used"
  const remainingLabel = hasUnlimited
    ? `Unlimited edits · ${used} used`
    : `${remaining} of ${cap} free edit${cap === 1 ? "" : "s"} left`;

  const helper = hasUnlimited
    ? "Tweak as many times as you need — wording, tempo, voice, anything. Our team re-records every revision."
    : "Tell us what to tweak — wording, tempo, voice, anything. We'll re-record it for you, on us. You get 1 free revision per song.";

  return (
    <div className="space-y-6">
      {/* Always-visible status pill so customers instantly see what they have */}
      <div className="flex items-center justify-between rounded-2xl border border-[rgba(141,111,175,0.25)] bg-[rgba(141,111,175,0.06)] px-4 py-3">
        <span className="text-sm font-medium text-[#1F1B16]">Edits on this song</span>
        <Badge
          variant="outline"
          className={
            hasUnlimited
              ? "border-[#8D6FAF] bg-[rgba(141,111,175,0.12)] text-[#6B4F8A]"
              : remaining > 0
                ? "border-emerald-400 text-emerald-700"
                : "border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.6)]"
          }
        >
          {remainingLabel}
        </Badge>
      </div>

      {revisions.length > 0 && (
        <div className="rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
          <h2 className="font-display text-xl">Your revisions</h2>
          <div className="mt-4 space-y-4">
            {revisions.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[rgba(31,27,22,0.1)] bg-[#FBF6EC] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[rgba(31,27,22,0.55)]">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.75)]"
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[rgba(31,27,22,0.85)]">
                  {r.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {canSubmit ? (
        <div className="space-y-5">
          <EditTicket
            number={1}
            icon={<Pencil className="h-5 w-5" />}
            eyebrow="Edit ticket #1 · Tweak the lyrics"
            title="Don't love a line? Rewrite it free."
            body="Tell us what should change — a name, a phrase, a whole verse. Our team rewrites and re-records it on us."
          />
          <EditTicket
            number={2}
            icon={<Music className="h-5 w-5" />}
            eyebrow="Edit ticket #2 · Change the sound"
            title="Different tempo or voice? Just say the word."
            body="Want it slower, faster, or a different vocal style? Mention it below and we'll re-record the whole track."
          />

          <div className="rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8D6FAF]">
              Editor
            </p>
            <h2 className="mt-1 font-display text-xl">{helper}</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              placeholder="e.g. Slower tempo, change 'fighter' to 'warrior' in verse 2, mention our daughter Mia…"
              className="mt-3 w-full rounded-xl border border-[rgba(31,27,22,0.2)] bg-white p-3 text-sm text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
              rows={6}
            />
            {submitError && (
              <p className="mt-2 text-sm text-red-600">{submitError}</p>
            )}
            <Button
              className="mt-4 bg-[#8D6FAF] text-[#FFF7EE] hover:bg-[#6B4F8A]"
              disabled={notes.trim().length < 10 || busy}
              onClick={submit}
            >
              {busy ? "Submitting…" : hasUnlimited ? "Submit revision" : "Send to our team — it's free"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
          <h2 className="font-display text-xl">You've used your free edit</h2>
          <p className="mt-2 text-sm text-[rgba(31,27,22,0.7)]">
            Need another tweak? Message our team in the Help tab — we're flexible
            on real fixes. Or{" "}
            <Link to="/create" className="text-[#8D6FAF] underline">
              start a new song
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Support tab                                                              */
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
    <div className="rounded-2xl border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
      <h2 className="font-display text-xl">Talk to our team</h2>
      <p className="mt-1 text-sm text-[rgba(31,27,22,0.65)]">
        Whether you want to say thanks, ask a question, request a refund, or just need a hand —
        write to us here. A real person reads every message and gets back to you, usually within
        a few hours.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 2000))}
        placeholder="Tell us what's on your mind (min 20 characters)…"
        className="mt-4 w-full rounded-xl border border-[rgba(31,27,22,0.2)] bg-white p-3 text-sm text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
        rows={6}
      />
      <Button
        className="mt-4 bg-[#8D6FAF] text-[#FFF7EE] hover:bg-[#6B4F8A]"
        disabled={reason.trim().length < 20 || busy}
        onClick={submit}
      >
        {busy ? "Sending…" : "Send message"}
      </Button>

      {refunds.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[rgba(31,27,22,0.55)]">
            Your messages
          </p>
          {refunds.map((r: any) => (
            <div
              key={r.id}
              className="rounded-lg bg-[#FBF6EC] px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[rgba(31,27,22,0.85)]">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <Badge variant="outline" className="border-[rgba(31,27,22,0.3)] text-[rgba(31,27,22,0.75)]">
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
/* Rewards tab                                                              */
/* ----------------------------------------------------------------------- */

function RewardsTab({
  reward,
  returningPromos,
  onOpenReaction,
}: {
  reward: Reward | null;
  returningPromos: PromoCode[];
  onOpenReaction: () => void;
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
  const reactionPending = reward?.status === "submitted" || reward?.status === "pending_review";
  const reactionStatus = reward?.status ?? null;

  // Golden Ticket #1 — clickable in three states:
  //   1. Not submitted yet  → "Upload reaction → unlock 2 free songs" (opens Reaction tab)
  //   2. Pending review     → status note, no CTA
  //   3. Approved           → "Use it now → start a free song" (links to /create with reward)
  const ticket1Cta = !reward
    ? { label: "Upload reaction → unlock 2 free songs", onClick: onOpenReaction }
    : reactionApproved
      ? {
          label: `Collect your free song → ${reward!.free_songs_remaining} left`,
          to: "/create" as const,
          search: { reward: reward!.code },
        }
      : null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-2xl">Two free gifts, just for you</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[rgba(31,27,22,0.65)]">
          Tap a ticket to use it. They're yours to keep — no expiry pressure.
        </p>
      </div>

      <GoldTicket
        icon={<Heart className="h-5 w-5" />}
        eyebrow="Golden ticket #1 · Reaction reward"
        title={
          reactionApproved
            ? "Approved! You earned a full refund + 2 free songs"
            : "Send us their reaction → full refund + 2 free songs"
        }
        body={
          !reward
            ? "Film the moment they hear it for the first time. Once we approve it, we refund this order in full AND send you 2 free songs to gift to anyone."
            : reactionApproved
              ? `Your refund is on the way. Use the code below (or tap the button) to start a free song — ${reward!.free_songs_remaining} remaining.`
              : reactionPending
                ? "We're reviewing your reaction video. You'll get an email the moment it's approved (usually within 24h) — then this ticket unlocks instantly."
                : `Status: ${reactionStatus}. We'll email you as soon as it's reviewed.`
        }
        code={reactionApproved ? reward!.code : null}
        onCopy={reactionApproved ? () => copy(reward!.code) : undefined}
        cta={ticket1Cta}
      />

      {returningPromos.length > 0 ? (
        returningPromos.map((p, idx) => {
          const usable = p.active && p.times_used < p.max_uses;
          return (
            <GoldTicket
              key={p.id}
              icon={<Ticket className="h-5 w-5" />}
              eyebrow={
                returningPromos.length > 1
                  ? `Golden ticket #${idx + 2} · Loyalty discount`
                  : "Golden ticket #2 · Loyalty discount"
              }
              title={
                usable
                  ? `Collect your next song — ${p.discount_pct}% off`
                  : `${p.discount_pct}% off (used)`
              }
              body={
                usable
                  ? `Tap below to start a new song with ${p.discount_pct}% off automatically applied at checkout. No code to remember.`
                  : "You've already redeemed this discount. Order another song any time."
              }
              code={usable ? p.code : null}
              badge={
                p.times_used >= p.max_uses
                  ? "Used"
                  : !p.active
                    ? "Inactive"
                    : `${p.discount_pct}% off`
              }
              onCopy={usable ? () => copy(p.code) : undefined}
              cta={
                usable
                  ? {
                      label: `Collect your new song · -${p.discount_pct}%`,
                      to: "/create" as const,
                      search: { promo: p.code },
                    }
                  : null
              }
            />
          );
        })
      ) : (
        <GoldTicket
          icon={<Ticket className="h-5 w-5" />}
          eyebrow="Golden ticket #2 · Loyalty discount"
          title="A discount on your next song — unlocks at delivery"
          body="The moment your song lands, a personal discount code appears here. One tap and your next song is cheaper at checkout — automatically."
        />
      )}
    </div>
  );
}

type GoldTicketCta =
  | { label: string; onClick: () => void; to?: undefined; search?: undefined }
  | { label: string; to: "/create"; search?: { reward?: string; promo?: string }; onClick?: undefined }
  | null;

function GoldTicket({
  icon,
  eyebrow,
  title,
  body,
  code,
  badge,
  onCopy,
  cta,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  code?: string | null;
  badge?: string;
  onCopy?: () => void;
  cta?: GoldTicketCta;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(141,111,175,0.3)] bg-gradient-to-br from-[rgba(141,111,175,0.16)] via-[#FBF6EC] to-[rgba(141,111,175,0.10)] p-6 shadow-[0_0_40px_-20px_rgba(141,111,175,0.4)]">
      <div className="absolute inset-y-0 left-16 hidden w-px bg-[rgba(31,27,22,0.12)] sm:block" />
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(141,111,175,0.18)] text-[#8D6FAF]">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8D6FAF]">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-display text-lg leading-snug text-[#1F1B16]">{title}</h3>
          <p className="mt-2 text-sm text-[rgba(31,27,22,0.7)]">{body}</p>

          {code && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[rgba(141,111,175,0.3)] bg-[rgba(141,111,175,0.08)] px-4 py-3">
              <code className="flex-1 font-mono text-sm font-semibold text-[#8D6FAF]">
                {code}
              </code>
              {badge && (
                <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                  {badge}
                </Badge>
              )}
              {onCopy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopy}
                  className="border-[rgba(141,111,175,0.4)] bg-transparent text-[#8D6FAF] hover:bg-[rgba(141,111,175,0.1)]"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>
          )}

          {cta && (cta.to ? (
            <Link
              to={cta.to}
              search={cta.search}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[#8D6FAF] px-5 py-2.5 text-sm font-semibold text-[#FFF7EE] shadow-sm transition hover:bg-[#6B4F8A]"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cta.onClick}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[#8D6FAF] px-5 py-2.5 text-sm font-semibold text-[#FFF7EE] shadow-sm transition hover:bg-[#6B4F8A]"
            >
              {cta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Big obvious quick-action grid — sits between the player and the tabs.   */
/* Designed so the four most common things to do are unmissable.           */
/* ----------------------------------------------------------------------- */

function QuickActions({
  recipientName,
  onEdit,
  onReaction,
  onGifts,
  onHelp,
  hasReward,
  hasPromos,
}: {
  recipientName: string;
  onEdit: () => void;
  onReaction: () => void;
  onGifts: () => void;
  onHelp: () => void;
  hasReward: boolean;
  hasPromos: boolean;
}) {
  const giftCount = (hasReward ? 1 : 0) + (hasPromos ? 1 : 0);

  const items: Array<{
    icon: ReactNode;
    title: string;
    sub: string;
    onClick: () => void;
    badge?: string;
    accent?: boolean;
  }> = [
    {
      icon: <Video className="h-6 w-6" />,
      title: "Send their reaction",
      sub: "Get your money back + 2 free songs",
      onClick: onReaction,
      accent: true,
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: "Open free gifts",
      sub: giftCount > 0 ? `You have ${giftCount} unlocked` : "Unlocks at delivery",
      onClick: onGifts,
      badge: giftCount > 0 ? String(giftCount) : undefined,
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Talk to a human",
      sub: "Real reply, usually within hours",
      onClick: onHelp,
    },
  ];

  return (
    <section className="mt-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8D6FAF]">
          What's next?
        </p>
        <h3 className="mt-1 font-display text-2xl text-[#1F1B16]">
          Pick what you'd like to do for {recipientName}
        </h3>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it.title}
            type="button"
            onClick={it.onClick}
            className={`group relative flex items-center gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-px hover:shadow-md ${
              it.accent
                ? "border-[rgba(141,111,175,0.45)] bg-gradient-to-br from-[rgba(141,111,175,0.16)] via-[#FBF6EC] to-[rgba(141,111,175,0.08)]"
                : "border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] hover:border-[rgba(141,111,175,0.4)]"
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                it.accent
                  ? "bg-[#8D6FAF] text-[#FFF7EE]"
                  : "bg-[rgba(141,111,175,0.18)] text-[#8D6FAF]"
              }`}
            >
              {it.icon}
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-semibold text-[#1F1B16]">
                {it.title}
              </span>
              <span className="mt-0.5 block text-[13px] text-[rgba(31,27,22,0.65)]">
                {it.sub}
              </span>
            </span>
            {it.badge && (
              <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#8D6FAF] px-2 text-xs font-semibold text-[#FFF7EE]">
                {it.badge}
              </span>
            )}
            <span className="text-[rgba(31,27,22,0.4)] transition group-hover:translate-x-0.5 group-hover:text-[#8D6FAF]">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Big tab bar — icon + label, easy to scan, sticky on mobile.             */
/* ----------------------------------------------------------------------- */

type TabKey = "player" | "reaction" | "refund" | "rewards";

function BigTabBar({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const items: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: "player", label: "Lyrics & edits", icon: <Pencil className="h-4 w-4" /> },
    { key: "reaction", label: "Reaction", icon: <Video className="h-4 w-4" /> },
    { key: "rewards", label: "Free gifts", icon: <Gift className="h-4 w-4" /> },
    { key: "refund", label: "Help", icon: <MessageCircle className="h-4 w-4" /> },
  ];

  return (
    <nav className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => setTab(it.key)}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition ${
              active
                ? "border-[#8D6FAF] bg-[#8D6FAF] text-[#FFF7EE] shadow-[0_4px_14px_rgba(141,111,175,0.3)]"
                : "border-[rgba(31,27,22,0.15)] bg-[#FBF6EC] text-[rgba(31,27,22,0.7)] hover:border-[#8D6FAF] hover:text-[#1F1B16]"
            }`}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
