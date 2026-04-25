import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Music2,
  LogOut,
  Loader2,
  Sparkles,
  Calendar,
  Gift,
  Mail,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [{ title: "My Account · RibbonSong" }],
  }),
});

interface OrderRow {
  id: string;
  recipient_name: string;
  relationship: string | null;
  genre: string | null;
  tempo: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  is_gift: boolean;
  delivery_date: string | null;
  created_at: string;
}

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
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
      .select(
        "id, recipient_name, relationship, genre, tempo, status, amount_cents, currency, is_gift, delivery_date, created_at",
      )
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

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-24">
      <header className="border-b border-peach/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Logo />
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        {/* Greeting */}
        <section className="rounded-3xl border border-peach/70 bg-card p-6 shadow-card md:p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Welcome back
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
            {user.email}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> All your songs and orders, in one
            place.
          </p>
        </section>

        {/* Orders */}
        <section className="mt-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Your songs
            </h2>
            <Link
              to="/create"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              + Create a new one
            </Link>
          </div>

          {fetching ? (
            <div className="mt-6 flex items-center justify-center rounded-3xl border border-peach/70 bg-card py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders && orders.length > 0 ? (
            <ul className="mt-6 space-y-4">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-3xl border border-peach/70 bg-card p-5 shadow-soft transition-shadow hover:shadow-card md:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {o.relationship ?? "Custom song"}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                        A song for {o.recipient_name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[o.genre, o.tempo].filter(Boolean).join(" · ") ||
                          "Acoustic Folk · Mid-tempo"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Ordered{" "}
                          {new Date(o.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {o.is_gift && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                            <Gift className="h-3 w-3" /> Gift
                          </span>
                        )}
                        <StatusPill status={o.status} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-foreground">
                        ${(o.amount_cents / 100).toFixed(0)}{" "}
                        <span className="text-xs font-semibold text-muted-foreground">
                          {o.currency}
                        </span>
                      </p>
                      <Link
                        to="/listen/$id"
                        params={{ id: o.id }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
                      >
                        <Music2 className="h-3.5 w-3.5" /> Open song
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-peach bg-card/60 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                No songs yet
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When you create a RibbonSong, it'll show up here forever.
              </p>
              <Link
                to="/create"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
              >
                Create your first song
              </Link>
            </div>
          )}
        </section>

        {/* Help */}
        <section className="mt-10 rounded-3xl border border-peach/70 bg-card p-6 shadow-soft md:p-7">
          <h3 className="font-display text-lg font-bold text-foreground">
            Need help with an order?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach us at{" "}
            <a
              href="mailto:hello@ribbonsong.com"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              hello@ribbonsong.com
            </a>{" "}
            and we'll get back within a day.
          </p>
        </section>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: {
      label: "Paid · in production",
      cls: "bg-success/15 text-success",
    },
    delivered: {
      label: "Delivered",
      cls: "bg-primary/15 text-primary",
    },
    refunded: {
      label: "Refunded",
      cls: "bg-muted text-muted-foreground",
    },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.cls}`}
    >
      {v.label}
    </span>
  );
}
