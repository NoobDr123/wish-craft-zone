// Legacy route — redirects to the unified /account page.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/account", replace: true });
  },
  component: () => null,
});
