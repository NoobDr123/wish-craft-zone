// Server-only admin slug helper. The slug itself NEVER appears in the
// client bundle — it lives only in the ADMIN_SLUG env var on the server.
//
// Client code that needs to navigate to admin should call buildAdminPath()
// inside a server function (loader, action) and pass the result through.
//
// If you need a quick admin link in your own browser, bookmark:
//   https://ribbonsong.com/_admin/<your-secret-slug>
import { createServerFn } from "@tanstack/react-start";

export const getAdminSlug = createServerFn({ method: "GET" }).handler(async () => {
  const slug = process.env.ADMIN_SLUG;
  if (!slug || slug.length < 8) {
    throw new Error("ADMIN_SLUG env var is not set or too short");
  }
  return slug;
});

// Server-side comparison — never expose ADMIN_SLUG to the client.
export const verifyAdminSlug = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_SLUG ?? "";
    // Constant-time-ish compare to avoid trivial timing oracles.
    if (expected.length === 0 || data.slug.length !== expected.length) {
      return { ok: false };
    }
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ data.slug.charCodeAt(i);
    }
    return { ok: mismatch === 0 };
  });
