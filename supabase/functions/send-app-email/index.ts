// Lightweight transactional email sender used by the song pipeline.
// Renders a small set of branded templates and enqueues to pgmq email queue
// so the central email queue worker handles retries/throttling.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FROM = "RibbonSong <noreply@notify.ribbonsong.com>";
const SENDER_DOMAIN = "notify.ribbonsong.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template, to, data, idempotencyKey } = await req.json();
    if (!template || !to) return json({ error: "template and to required" }, 400);

    const rendered = render(template, data ?? {});
    if (!rendered) return json({ error: `Unknown template: ${template}` }, 400);

    // Suppression check
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("id")
      .eq("email", to.toLowerCase())
      .maybeSingle();

    if (suppressed) {
      await supabase.from("email_send_log").insert({
        recipient_email: to,
        template_name: template,
        status: "suppressed",
        metadata: { reason: "address_in_suppression_list" },
      });
      return json({ ok: true, skipped: "suppressed" });
    }

    // Stable idempotency key — caller can pass one (preferred), otherwise we
    // derive a deterministic one from template + recipient + any order id so
    // retries by us don't double-send.
    const idemKey =
      (typeof idempotencyKey === "string" && idempotencyKey) ||
      `${template}:${to.toLowerCase()}:${data?.order_id ?? data?.orderId ?? ""}`;
    const messageId = crypto.randomUUID();

    // Enqueue to the central queue. The dispatcher (process-email-queue server
    // route) reads this exact shape — `purpose: "transactional"` and
    // `idempotency_key` are REQUIRED by the Lovable email API for app emails.
    const enqueuePayload = {
      to,
      from: FROM,
      sender_domain: SENDER_DOMAIN,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      purpose: "transactional",
      label: template,
      idempotency_key: idemKey,
      message_id: messageId,
    };

    const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: enqueuePayload,
    });

    if (enqueueErr) {
      console.error("enqueue_email failed", enqueueErr);
      await supabase.from("email_send_log").insert({
        recipient_email: to,
        template_name: template,
        status: "failed",
        error_message: enqueueErr.message,
      });
      return json({ error: enqueueErr.message }, 500);
    }

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      recipient_email: to,
      template_name: template,
      status: "pending",
      metadata: { queued: true, idempotency_key: idemKey },
    });

    return json({ ok: true, messageId });
  } catch (e: any) {
    console.error("send-app-email error", e);
    return json({ error: e.message }, 500);
  }
});

function render(template: string, d: Record<string, any>) {
  switch (template) {
    case "song-delivered":
      return songDelivered(d);
    case "order_confirmation":
      return orderConfirmation(d);
    default:
      return null;
  }
}

function orderConfirmation(d: Record<string, any>) {
  const buyerFirstName =
    typeof d.buyer_name === "string" && d.buyer_name.trim()
      ? d.buyer_name.split(/\s+/)[0]
      : "";
  const recipient = escape(d.recipient_name ?? "your loved one");
  const orderRef = escape(d.order_ref ?? "");
  const dashboardUrl = String(d.dashboard_url ?? "https://ribbonsong.com/login");

  const speed = d.delivery_speed ?? "standard";
  const speedLabel =
    speed === "24h"
      ? "Within 24 hours"
      : speed === "48h"
        ? "Within 48 hours"
        : "Within 5 days";

  // Compute expected delivery date.
  const created = d.created_at ? new Date(String(d.created_at)) : new Date();
  const days = speed === "24h" ? 1 : speed === "48h" ? 2 : 5;
  const expected = new Date(created);
  expected.setDate(expected.getDate() + days);
  const expectedLabel = expected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const cents = Number(d.amount_paid_cents || d.amount_cents || 0);
  const currency = String(d.currency || "USD").toUpperCase();
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);

  const addons: string[] = [];
  if (d.has_3rd_verse) addons.push("Extra verse");
  if (speed === "24h") addons.push("24 hour delivery");
  else if (speed === "48h") addons.push("48 hour delivery");
  if (d.has_unlimited_edits) addons.push("Unlimited edits");

  const subject = `Order confirmed${orderRef ? ` · #${orderRef}` : ""} · We're starting on ${recipient}'s song`;

  const heading = buyerFirstName
    ? `Thank you, ${escape(buyerFirstName)}.`
    : `Thank you for your order.`;

  const detailsRows = [
    ["Song for", recipient],
    d.relationship ? ["Relationship", escape(String(d.relationship))] : null,
    d.genre ? ["Genre", escape(String(d.genre))] : null,
    d.tempo ? ["Tempo", escape(String(d.tempo))] : null,
    d.voice ? ["Voice", escape(String(d.voice))] : null,
    d.song_title_idea ? ["Title idea", escape(String(d.song_title_idea))] : null,
    addons.length ? ["Add ons", addons.join(" · ")] : null,
    ["Delivery speed", speedLabel],
    ["Expected delivery", expectedLabel],
    d.is_gift && d.recipient_email
      ? ["Gift delivery to", escape(String(d.recipient_email))]
      : null,
  ].filter(Boolean) as [string, string][];

  const rowsHtml = detailsRows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:10px 0;font-size:14px;color:#7A716C;border-bottom:1px solid #EBDFCF;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:#2D2B2A;font-weight:600;text-align:right;border-bottom:1px solid #EBDFCF;">${value}</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EE;border-radius:0;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#2D2B2A;margin:0 0 4px;letter-spacing:-0.01em;">RibbonSong</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#D9614C;margin:0 0 32px;">Order confirmed</p>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:600;line-height:1.15;color:#2D2B2A;margin:0 0 16px;">${escape(heading)}</h1>
        <p style="font-size:16px;line-height:1.6;color:#2D2B2A;margin:0 0 22px;">
          We've started crafting <strong>${recipient}</strong>'s personalized RibbonSong.
          Below is a summary of your order. Save this email — your order reference is
          <strong>#${orderRef}</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
          ${rowsHtml}
          <tr>
            <td style="padding:14px 0 0;font-size:15px;color:#2D2B2A;font-weight:700;">Total paid</td>
            <td style="padding:14px 0 0;font-size:18px;color:#D9614C;font-weight:700;text-align:right;">${total}</td>
          </tr>
        </table>

        <p style="margin:24px 0;text-align:center;">
          <a href="${dashboardUrl}" style="background:#D9614C;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">View my dashboard</a>
        </p>
        <p style="font-size:13px;color:#7A716C;line-height:1.55;margin:0 0 8px;text-align:center;">
          Sign in with this email address (${escape(String(d.buyer_email ?? ""))}) to track progress, request edits, and download your song.
        </p>

        <div style="border-top:1px solid #EBDFCF;margin:32px 0 20px;"></div>

        <p style="font-size:14px;line-height:1.6;color:#2D2B2A;margin:0 0 12px;font-weight:600;">What happens next</p>
        <ol style="font-size:14px;line-height:1.6;color:#2D2B2A;margin:0 0 16px;padding-left:18px;">
          <li>We turn your story into lyrics, today.</li>
          <li>We record the song in the ${escape(String(d.genre ?? "style"))} you chose.</li>
          <li>A real human listens to every track before delivery.</li>
          <li>You'll receive a private link to listen, share, and download by <strong>${expectedLabel}</strong>.</li>
        </ol>

        <p style="font-size:13px;color:#7A716C;line-height:1.55;margin:16px 0 0;">
          Need to add or change something? Just reply to this email — we read every one. 30 day money back guarantee, no questions asked.
        </p>
        <p style="font-size:12px;line-height:1.6;color:#7A716C;margin:18px 0 0;">Sent from RibbonSong — turning love into songs.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    heading,
    ``,
    `Order #${orderRef}`,
    `Song for: ${recipient}`,
    ...detailsRows.map(([l, v]) => `${l}: ${v.replace(/<[^>]+>/g, "")}`),
    `Total paid: ${total}`,
    ``,
    `Track your order: ${dashboardUrl}`,
    ``,
    `— RibbonSong`,
  ].join("\n");

  return { subject, html, text };
}

function songDelivered(d: Record<string, any>) {
  const recipient = escape(d.recipient_name ?? "you");
  const buyer = escape(d.buyer_name ?? "Someone who loves you");
  const listen = String(d.listen_url ?? "");
  const note = d.personal_note ? escape(d.personal_note) : null;
  const isRecipient = d.role === "recipient";

  const subject = isRecipient
    ? `${buyer} made you a song 💛`
    : `${recipient}'s song is ready`;

  const heading = isRecipient ? `A song, just for you.` : `Their song is ready to share.`;

  const intro = isRecipient
    ? `${buyer} wrote a song for you. It was made one note at a time, with you in mind. Take a quiet moment and press play.`
    : `Your RibbonSong for ${recipient} is finished. Listen to it, share it, or save the link to send later.`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EE;border-radius:0;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#2D2B2A;margin:0 0 4px;letter-spacing:-0.01em;">RibbonSong</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#D9614C;margin:0 0 32px;">A song made with love</p>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:600;line-height:1.15;color:#2D2B2A;margin:0 0 16px;">${escape(heading)}</h1>
        <p style="font-size:16px;line-height:1.6;color:#2D2B2A;margin:0 0 22px;">${intro}</p>
        ${note ? `<blockquote style="margin:0 0 22px;padding:14px 18px;background:#F4E4D2;border-left:3px solid #D9614C;font-style:italic;color:#2D2B2A;font-size:15px;line-height:1.55;">"${note}"</blockquote>` : ""}
        <p style="margin:24px 0;"><a href="${listen}" style="background:#D9614C;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">Listen to the song</a></p>
        <p style="font-size:14px;color:#7A716C;line-height:1.55;margin:0 0 16px;">Or copy this link: <a style="color:#D9614C;" href="${listen}">${listen}</a></p>
        <div style="border-top:1px solid #EBDFCF;margin:32px 0 20px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#7A716C;margin:8px 0 0;">Sent from RibbonSong — turning love into songs.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `${heading}\n\n${intro}\n\n${note ? `"${d.personal_note}"\n\n` : ""}Listen: ${listen}\n\n— RibbonSong`;

  return { subject, html, text };
}

function escape(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
