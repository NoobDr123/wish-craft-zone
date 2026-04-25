// Legacy route — redirects to the unified /account?order=$id page.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/account",
      search: { order: params.id },
      replace: true,
    });
  },
  component: () => null,
});
