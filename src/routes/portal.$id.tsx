// Legacy email route — redirects to the public listen page.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/listen/$id",
      params: { id: params.id },
      replace: true,
    });
  },
  component: () => null,
});
