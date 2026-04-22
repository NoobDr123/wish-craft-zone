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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template, to, data } = await req.json();
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

    // Enqueue to the central queue for sending
    const enqueuePayload = {
      from: FROM,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template_name: template,
      metadata: data ?? {},
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
      recipient_email: to,
      template_name: template,
      status: "pending",
      metadata: { queued: true },
    });

    return json({ ok: true });
  } catch (e: any) {
    console.error("send-app-email error", e);
    return json({ error: e.message }, 500);
  }
});

function render(template: string, d: Record<string, any>) {
  switch (template) {
    case "song-delivered":
      return songDelivered(d);
    default:
      return null;
  }
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
