// Lightweight transactional email sender used by the song pipeline.
// Renders a small set of branded templates and enqueues to pgmq email queue
// so the central email queue worker handles retries/throttling.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FROM = "PawPrint Song <noreply@notify.getpawprintsong.com>";
const SENDER_DOMAIN = "notify.getpawprintsong.com";

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

    // Get-or-create one unsubscribe token per recipient email.
    const lowerTo = to.toLowerCase();
    let unsubscribeToken: string | null = null;
    const { data: existingTok } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", lowerTo)
      .maybeSingle();
    if (existingTok?.token) {
      unsubscribeToken = existingTok.token;
    } else {
      const newToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { data: inserted, error: tokErr } = await supabase
        .from("email_unsubscribe_tokens")
        .insert({ email: lowerTo, token: newToken })
        .select("token")
        .maybeSingle();
      if (tokErr) {
        // race: another request inserted it — re-read
        const { data: again } = await supabase
          .from("email_unsubscribe_tokens")
          .select("token")
          .eq("email", lowerTo)
          .maybeSingle();
        unsubscribeToken = again?.token ?? newToken;
      } else {
        unsubscribeToken = inserted?.token ?? newToken;
      }
    }

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
      unsubscribe_token: unsubscribeToken,
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
    case "reaction-approved":
      return reactionApproved(d);
    case "reaction-rejected":
      return reactionRejected(d);
    case "support-notification":
      return supportNotification(d);
    case "support-acknowledgment":
      return supportAcknowledgment(d);
    case "support-reply":
      return supportReply(d);
    default:
      return null;
  }
}

function supportNotification(d: Record<string, any>) {
  const name = escape(d.sender_name ?? "Someone");
  const senderEmail = escape(d.sender_email ?? "");
  const subjectLine = escape(d.subject ?? "New support message");
  const body = escape(d.body ?? "").replace(/\n/g, "<br/>");
  const orderId = d.order_id_text ? escape(String(d.order_id_text)) : "";
  const inboxUrl = String(d.inbox_url ?? "https://getpawprintsong.com/admin");

  const subject = `[Support] ${d.subject ?? "New message"} — ${d.sender_name ?? ""}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;padding:32px 24px;max-width:560px;">
      <tr><td>
        <p style="font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 16px;">New support message</p>
        <h1 style="font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:600;line-height:1.2;color:#1F1B16;margin:0 0 16px;">${subjectLine}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
          <tr><td style="padding:6px 0;font-size:13px;color:#5A5148;">From</td><td style="padding:6px 0;font-size:13px;color:#1F1B16;font-weight:600;text-align:right;">${name} &lt;${senderEmail}&gt;</td></tr>
          ${orderId ? `<tr><td style="padding:6px 0;font-size:13px;color:#5A5148;">Order</td><td style="padding:6px 0;font-size:13px;color:#1F1B16;font-weight:600;text-align:right;">${orderId}</td></tr>` : ""}
        </table>
        <div style="background:#ffffff;border:1px solid #D9CEB9;border-radius:8px;padding:16px;font-size:14px;line-height:1.6;color:#1F1B16;margin:0 0 22px;">${body}</div>
        <p style="margin:0;text-align:center;">
          <a href="${inboxUrl}" style="background:#8D6FAF;color:#ffffff;font-size:14px;font-weight:600;border-radius:999px;padding:12px 24px;text-decoration:none;display:inline-block;">Open inbox</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `New support message: ${d.subject}\nFrom: ${d.sender_name} <${d.sender_email}>\n${orderId ? `Order: ${d.order_id_text}\n` : ""}\n${d.body}\n\nReply in the admin inbox: ${inboxUrl}`;
  return { subject, html, text };
}

function supportAcknowledgment(d: Record<string, any>) {
  const name = escape(String(d.sender_name ?? "").split(/\s+/)[0] || "there");
  const subject = `We got your message — PawPrint Song`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 28px;">Message received</p>
        <h1 style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:600;line-height:1.2;color:#1F1B16;margin:0 0 16px;">Thanks ${name} — we got it.</h1>
        <p style="font-size:16px;line-height:1.6;color:#1F1B16;margin:0 0 16px;">A real human on our team will read your message and reply within a few hours (usually faster).</p>
        <p style="font-size:14px;line-height:1.6;color:#5A5148;margin:0 0 16px;">If it's about an existing order, having your order ID handy will help us move quickly.</p>
        <div style="border-top:1px solid #D9CEB9;margin:24px 0 16px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:0;">— The PawPrint Song team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `Thanks ${name} — we got your message.\n\nA real human will reply within a few hours.\n\n— The PawPrint Song team`;
  return { subject, html, text };
}

function supportReply(d: Record<string, any>) {
  const name = escape(String(d.sender_name ?? "").split(/\s+/)[0] || "there");
  const body = escape(d.body ?? "").replace(/\n/g, "<br/>");
  const originalSubject = String(d.original_subject ?? "your message");
  const subject = `Re: ${originalSubject}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 28px;">A reply from our team</p>
        <h1 style="font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;line-height:1.25;color:#1F1B16;margin:0 0 18px;">Hi ${name},</h1>
        <div style="font-size:16px;line-height:1.65;color:#1F1B16;margin:0 0 22px;">${body}</div>
        <p style="font-size:14px;color:#5A5148;line-height:1.55;margin:0 0 8px;">Just hit reply if you need anything else — your reply lands straight in our inbox.</p>
        <div style="border-top:1px solid #D9CEB9;margin:24px 0 16px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:0;">— The PawPrint Song team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `Hi ${name},\n\n${d.body}\n\nJust hit reply if you need anything else.\n\n— The PawPrint Song team`;
  return { subject, html, text };
}

function reactionApproved(d: Record<string, any>) {
  const recipient = escape(d.recipient_name ?? "your dog");
  const buyer = d.buyer_name ? escape(String(d.buyer_name).split(/\s+/)[0]) : "";
  const code = escape(d.reward_code ?? "");
  const freeSongs = Number(d.free_songs ?? 2);
  const refundCents = Number(d.refund_amount_cents ?? 0);
  const refundDollars = (refundCents / 100).toFixed(2);
  const portalUrl = String(d.portal_url ?? "https://getpawprintsong.com/dashboard");
  const createUrl = String(d.create_url ?? `https://getpawprintsong.com/create?reward=${code}`);

  const subject = `Your reaction was approved — refund + ${freeSongs} free songs 🎁`;
  const heading = buyer
    ? `Thank you, ${buyer}.`
    : `Thank you for sharing your reaction.`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 32px;">Reaction approved</p>
        <h1 style="font-family:'Fraunces',Georgia,serif;font-size:30px;font-weight:600;line-height:1.15;color:#1F1B16;margin:0 0 16px;">${heading}</h1>
        <p style="font-size:16px;line-height:1.6;color:#1F1B16;margin:0 0 22px;">
          We watched your reaction to ${recipient}'s song and it made our day.
          As promised through our Re-found program, here's what happens now:
        </p>
        <ul style="font-size:15px;line-height:1.7;color:#1F1B16;margin:0 0 22px;padding-left:20px;">
          ${refundCents > 0 ? `<li>We refunded <strong>$${refundDollars}</strong> back to your card. It usually arrives in 5–10 business days.</li>` : ""}
          <li>You've unlocked <strong>${freeSongs} free songs</strong> on us.</li>
        </ul>
        <div style="background:#ffffff;border:1px dashed #8D6FAF;border-radius:14px;padding:20px;text-align:center;margin:0 0 24px;">
          <p style="font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8D6FAF;margin:0 0 6px;">Your reward code</p>
          <p style="font-family:'SF Mono',Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:0.14em;color:#1F1B16;margin:0;">${code}</p>
        </div>
        <p style="margin:24px 0;text-align:center;">
          <a href="${createUrl}" style="background:#8D6FAF;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">Create a free song now</a>
        </p>
        <p style="font-size:13px;color:#5A5148;text-align:center;margin:0 0 16px;">
          Or visit your <a href="${portalUrl}" style="color:#8D6FAF;">song portal</a> to see all your rewards.
        </p>
        <div style="border-top:1px solid #D9CEB9;margin:32px 0 20px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:8px 0 0;">Sent from PawPrint Song — turning love into songs.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `${heading}\n\nWe watched your reaction to ${d.recipient_name}'s song. As promised:\n${refundCents > 0 ? `- We refunded $${refundDollars} to your card.\n` : ""}- You unlocked ${freeSongs} free songs.\n\nYour reward code: ${d.reward_code}\nUse it at ${createUrl}\n\n— PawPrint Song`;

  return { subject, html, text };
}

function reactionRejected(d: Record<string, any>) {
  const recipient = escape(d.recipient_name ?? "your dog");
  const reason = escape(d.reason ?? "");
  const portalUrl = String(d.portal_url ?? "https://getpawprintsong.com/dashboard");

  const subject = `About your reaction video`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 32px;">Re-found program</p>
        <h1 style="font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:600;line-height:1.2;color:#1F1B16;margin:0 0 16px;">A note about your reaction video</h1>
        <p style="font-size:16px;line-height:1.6;color:#1F1B16;margin:0 0 18px;">
          Thank you for sharing the reaction to ${recipient}'s song. Unfortunately we
          couldn't approve this submission for the Re-found program.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#1F1B16;margin:0 0 18px;background:#ECE2D0;padding:14px 18px;border-radius:8px;">
          <strong>Reason:</strong> ${reason}
        </p>
        <p style="font-size:15px;line-height:1.6;color:#1F1B16;margin:0 0 22px;">
          You're welcome to upload a new video that captures the moment more clearly.
          Your song stays yours regardless.
        </p>
        <p style="margin:24px 0;text-align:center;">
          <a href="${portalUrl}" style="background:#8D6FAF;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">Upload a new video</a>
        </p>
        <div style="border-top:1px solid #D9CEB9;margin:32px 0 20px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:8px 0 0;">Sent from PawPrint Song — turning love into songs.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `Thank you for sharing the reaction to ${d.recipient_name}'s song.\n\nUnfortunately we couldn't approve this submission for the Re-found program.\n\nReason: ${d.reason}\n\nYou can upload a new video at ${portalUrl}\n\n— PawPrint Song`;

  return { subject, html, text };
}

function orderConfirmation(d: Record<string, any>) {
  const buyerFirstName =
    typeof d.buyer_name === "string" && d.buyer_name.trim()
      ? d.buyer_name.split(/\s+/)[0]
      : "";
  const recipient = escape(d.recipient_name ?? "your dog");
  const orderRef = escape(d.order_ref ?? "");
  const dashboardUrl = String(d.dashboard_url ?? "https://getpawprintsong.com/login");

  const speed = d.delivery_speed ?? "standard";
  const speedLabel =
    speed === "90min"
      ? "Within 90 minutes"
      : speed === "24h"
        ? "Within 24 hours"
        : "Within 5 days";

  // Compute expected delivery date.
  const created = d.created_at ? new Date(String(d.created_at)) : new Date();
  const days = speed === "90min" ? 0 : speed === "24h" ? 1 : 5;
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
  if (speed === "90min") addons.push("90 minute priority delivery");
  else if (speed === "24h") addons.push("24 hour delivery");
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
      <td style="padding:10px 0;font-size:14px;color:#5A5148;border-bottom:1px solid #D9CEB9;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:#1F1B16;font-weight:600;text-align:right;border-bottom:1px solid #D9CEB9;">${value}</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:"Instrument Sans",Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;border-radius:0;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces','Iowan Old Style',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;letter-spacing:-0.01em;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 32px;">Order confirmed</p>
        <h1 style="font-family:'Fraunces','Iowan Old Style',Georgia,serif;font-size:30px;font-weight:600;line-height:1.15;color:#1F1B16;margin:0 0 16px;">${escape(heading)}</h1>
        <p style="font-size:16px;line-height:1.6;color:#1F1B16;margin:0 0 22px;">
          We've started crafting <strong>${recipient}</strong>'s personalized PawPrint Song.
          Below is a summary of your order. Save this email — your order reference is
          <strong>#${orderRef}</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
          ${rowsHtml}
          <tr>
            <td style="padding:14px 0 0;font-size:15px;color:#1F1B16;font-weight:700;">Total paid</td>
            <td style="padding:14px 0 0;font-size:18px;color:#8D6FAF;font-weight:700;text-align:right;">${total}</td>
          </tr>
        </table>

        <p style="margin:24px 0;text-align:center;">
          <a href="${dashboardUrl}" style="background:#8D6FAF;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">View my dashboard</a>
        </p>
        <p style="font-size:13px;color:#5A5148;line-height:1.55;margin:0 0 8px;text-align:center;">
          Sign in with this email address (${escape(String(d.buyer_email ?? ""))}) to track progress, request edits, and download your song.
        </p>

        <div style="border-top:1px solid #D9CEB9;margin:32px 0 20px;"></div>

        <p style="font-size:14px;line-height:1.6;color:#1F1B16;margin:0 0 12px;font-weight:600;">What happens next</p>
        <ol style="font-size:14px;line-height:1.6;color:#1F1B16;margin:0 0 16px;padding-left:18px;">
          <li>We turn your story into lyrics, today.</li>
          <li>We record the song in the ${escape(String(d.genre ?? "style"))} you chose.</li>
          <li>A real human listens to every track before delivery.</li>
          <li>You'll receive a private link to listen, share, and download by <strong>${expectedLabel}</strong>.</li>
        </ol>

        <p style="font-size:13px;color:#5A5148;line-height:1.55;margin:16px 0 0;">
          Need to add or change something? Just reply to this email — we read every one. 30 day money back guarantee, no questions asked.
        </p>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:18px 0 0;">Sent from PawPrint Song — turning love into songs.</p>
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
    `— PawPrint Song`,
  ].join("\n");

  return { subject, html, text };
}

function songDelivered(d: Record<string, any>) {
  const recipient = escape(d.recipient_name ?? "your dog");
  const buyer = escape(d.buyer_name ?? "Someone who loves you");
  const listen = String(d.listen_url ?? "");
  const portal = String(d.portal_url ?? "");
  const note = d.personal_note ? escape(d.personal_note) : null;
  const isRecipient = d.role === "recipient";
  const promo = d.returning_promo_code ? escape(String(d.returning_promo_code)) : null;

  const subject = isRecipient
    ? `${buyer} made you a song 💛`
    : `${recipient}'s song is ready`;

  const heading = isRecipient ? `A song, just for you.` : `Their song is ready to share.`;

  const intro = isRecipient
    ? `${buyer} wrote a song for you. It was made one note at a time, with you in mind. Take a quiet moment and press play.`
    : `Your PawPrint Song for ${recipient} is finished. Listen to it, share it, or save the link to send later.`;

  const promoBlock = promo
    ? `<div style="background:#ECE2D0;border-radius:14px;padding:18px;margin:0 0 22px;text-align:center;">
        <p style="font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8D6FAF;margin:0 0 6px;">10% off your next song</p>
        <p style="font-family:'SF Mono',Menlo,monospace;font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1F1B16;margin:0;">${promo}</p>
        <p style="font-size:12px;color:#5A5148;margin:6px 0 0;">Valid for 180 days</p>
       </div>`
    : "";

  const portalBlock = "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:'Instrument Sans',Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FBF6EC;border-radius:0;padding:40px 28px;max-width:560px;">
      <tr><td>
        <p style="font-family:'Fraunces','Iowan Old Style',Georgia,serif;font-size:26px;font-weight:700;color:#1F1B16;margin:0 0 4px;letter-spacing:-0.01em;">PawPrint Song</p>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D6FAF;margin:0 0 32px;">A song made with love</p>
        <h1 style="font-family:'Fraunces','Iowan Old Style',Georgia,serif;font-size:30px;font-weight:600;line-height:1.15;color:#1F1B16;margin:0 0 16px;">${escape(heading)}</h1>
        <p style="font-size:16px;line-height:1.6;color:#1F1B16;margin:0 0 22px;">${intro}</p>
        ${note ? `<blockquote style="margin:0 0 22px;padding:14px 18px;background:#E5D9EF;border-left:3px solid #8D6FAF;font-style:italic;color:#1F1B16;font-size:15px;line-height:1.55;">"${note}"</blockquote>` : ""}
        <p style="margin:24px 0;"><a href="${listen}" style="background:#8D6FAF;color:#ffffff;font-size:15px;font-weight:600;border-radius:999px;padding:14px 28px;text-decoration:none;display:inline-block;">Listen to the song</a></p>
        <p style="font-size:14px;color:#5A5148;line-height:1.55;margin:0 0 16px;">Or copy this link: <a style="color:#8D6FAF;" href="${listen}">${listen}</a></p>
        ${portalBlock}
        ${promoBlock}
        <div style="border-top:1px solid #D9CEB9;margin:32px 0 20px;"></div>
        <p style="font-size:12px;line-height:1.6;color:#5A5148;margin:8px 0 0;">Sent from PawPrint Song — turning love into songs.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `${heading}\n\n${intro}\n\n${note ? `"${d.personal_note}"\n\n` : ""}Listen: ${listen}\n${portal ? `Portal: ${portal}\n` : ""}${promo ? `\n10% off your next song: ${d.returning_promo_code} (valid 180 days)\n` : ""}\n— PawPrint Song`;

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
