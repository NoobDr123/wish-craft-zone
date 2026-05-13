// Public email tracking endpoint. Records opens (1x1 pixel) and clicks (302 redirect).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function pixelResponse() {
  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const mid = url.searchParams.get("mid") ?? "";
    const event = url.searchParams.get("e") ?? "open";
    const target = url.searchParams.get("u");

    // Fire-and-forget the DB write (don't block pixel/redirect)
    if (mid) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });
      // We await briefly to ensure it lands; serverless can kill background tasks.
      try {
        await supabase.rpc("record_email_event", {
          _message_id: mid,
          _event: event === "click" ? "click" : "open",
        });
      } catch (e) {
        console.error("record_email_event failed", e);
      }
    }

    if (event === "click" && target) {
      try {
        const decoded = decodeURIComponent(target);
        // Only allow http(s) destinations
        if (/^https?:\/\//i.test(decoded)) {
          return new Response(null, { status: 302, headers: { Location: decoded } });
        }
      } catch (_) {}
      return new Response("Invalid redirect", { status: 400 });
    }

    return pixelResponse();
  } catch (e) {
    console.error("email-track error", e);
    return pixelResponse();
  }
});
