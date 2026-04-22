// Old /admin path now redirects to the obfuscated staff path so any links
// previously shared keep working but the URL itself isn't guessable.

import { createFileRoute, redirect } from "@tanstack/react-router";
import { ADMIN_PATH } from "@/config/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: ADMIN_PATH });
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
});
