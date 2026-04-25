// Unified customer area — single page with order switcher + full self-service portal.
// Replaces the previous /dashboard, /account, and /portal/$id pages.

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, Loader2, Sparkles, Music2, Plus, Gift } from "lucide-react";
import { RibbonMark } from "@/components/Logo";
import { OrderPortal } from "@/components/OrderPortal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OrderRow {
  id: string;
  recipient_name: string;
  status: string;
  is_gift: boolean;
  delivered_at: string | null;
  created_at: string;
}

type AccountSearch = { order?: string };

export const Route = createFileRoute("/account")({
  component: AccountPage,
  validateSearch: (search: Record<string, unknown>): AccountSearch => ({
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My songs · RibbonSong" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const search = useSearch({ from: "/account" });

  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: undefined }, replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFetching(true);
    supabase
      .from("orders")
      .select("id, recipient_name, status, is_gift, delivered_at, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setOrders(data as OrderRow[]);
        else setOrders([]);
        setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Pick the active order: from URL if valid, otherwise the most recent one.
  const activeOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    if (search.order) {
      const found = orders.find((o) => o.id === search.order);
      if (found) return found;
    }
    return orders[0];
  }, [orders, search.order]);

  const switchOrder = (id: string) => {
    navigate({ to: "/account", search: { order: id }, replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (loading || !user || fetching || orders === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1F1B16] text-[rgba(31,27,22,0.6)]">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F1B16] pb-24 text-[#1F1B16]">
      {/* Header */}
      <header className="border-b border-[rgba(31,27,22,0.1)] px-5 py-5 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[18px] font-semibold tracking-[-0.02em] text-[#1F1B16]"
          >
            <RibbonMark className="h-6 w-6" />
            RibbonSong
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-[rgba(31,27,22,0.6)] hover:text-[#1F1B16]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8D6FAF] px-4 py-2 font-medium text-[#FFF7EE] hover:bg-[#6B4F8A]"
            >
              <Plus className="h-3.5 w-3.5" /> New song
            </Link>
            <button
              onClick={handleSignOut}
              className="text-[rgba(31,27,22,0.6)] hover:text-[#1F1B16]"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Order switcher — only when 2+ orders */}
            {orders.length > 1 && activeOrder && (
              <OrderSwitcher
                orders={orders}
                activeOrderId={activeOrder.id}
                onSelect={switchOrder}
              />
            )}

            {/* Heading for the selected order */}
            {activeOrder && (
              <div className="mb-6 mt-2 text-center sm:mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8D6FAF]">
                  {orders.length > 1 ? "Now showing" : "Your song"}
                </p>
                <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
                  For {activeOrder.recipient_name}
                </h1>
                <p className="mt-1 text-xs text-[rgba(31,27,22,0.5)]">
                  Ordered{" "}
                  {new Date(activeOrder.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            {activeOrder && <OrderPortal orderId={activeOrder.id} userId={user.id} />}

            {/* Help footer */}
            <section className="mt-12 rounded-2xl border border-[rgba(31,27,22,0.1)] bg-[#FBF6EC] p-5 text-center">
              <p className="text-sm text-[rgba(31,27,22,0.65)]">
                Need anything else? Email us at{" "}
                <a
                  href="mailto:hello@ribbonsong.com"
                  className="font-medium text-[#8D6FAF] underline-offset-4 hover:underline"
                >
                  hello@ribbonsong.com
                </a>
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function OrderSwitcher({
  orders,
  activeOrderId,
  onSelect,
}: {
  orders: OrderRow[];
  activeOrderId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs uppercase tracking-wider text-[rgba(31,27,22,0.55)]">
        Your songs ({orders.length})
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
        {orders.map((o) => {
          const active = o.id === activeOrderId;
          const inProgress = o.status !== "delivered";
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`group flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-[#8D6FAF] bg-[rgba(141,111,175,0.14)] text-[#1F1B16]"
                  : "border-[rgba(31,27,22,0.15)] bg-transparent text-[rgba(31,27,22,0.7)] hover:border-[rgba(31,27,22,0.3)] hover:text-[#1F1B16]"
              }`}
            >
              <Music2 className="h-3.5 w-3.5" />
              <span className="font-medium">{o.recipient_name}</span>
              {o.is_gift && <Gift className="h-3 w-3 opacity-60" />}
              {inProgress && (
                <span className="ml-1 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#8D6FAF]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[rgba(31,27,22,0.2)] bg-[#FBF6EC] p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,111,175,0.18)]">
        <Sparkles className="h-6 w-6 text-[#8D6FAF]" />
      </div>
      <h2 className="mt-4 font-display text-2xl">No songs yet</h2>
      <p className="mt-2 text-sm text-[rgba(31,27,22,0.65)]">
        When you create a RibbonSong, it'll show up here forever.
      </p>
      <Link
        to="/create"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#8D6FAF] px-5 py-2.5 text-sm font-semibold text-[#1F1B16] hover:bg-[#6B4F8A]"
      >
        <Plus className="h-4 w-4" /> Create your first song
      </Link>
    </div>
  );
}
