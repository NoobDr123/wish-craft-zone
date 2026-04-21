import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Download, FileText, Pencil } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useQuizStore } from "@/stores/quizStore";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Your Dashboard · RibbonSong" }],
  }),
});

type Status = "drafting_lyrics" | "composing_music" | "finalizing" | "completed";

const STAGES: { key: Status; label: string; description: string }[] = [
  {
    key: "drafting_lyrics",
    label: "Drafting lyrics",
    description: "Weaving your story into verses.",
  },
  {
    key: "composing_music",
    label: "Composing music",
    description: "Bringing the melody to life.",
  },
  {
    key: "finalizing",
    label: "Final polish",
    description: "Mixing and mastering for clarity.",
  },
  {
    key: "completed",
    label: "Ready to listen",
    description: "Your song is delivered.",
  },
];

const DEMO_LYRICS = `[Verse 1]
You taught me how to laugh at rain
How to hold a hand and ease the pain
Every story, every quiet song
You're the reason I am strong

[Chorus]
And I will sing you through the night
A ribbon of love, a thread of light
Whatever comes, you're not alone
I'll carry you all the way home

[Verse 2]
The little kitchen, summer pies
The way you crinkled up your eyes
You're the kindness I still know
Wherever, whoever I go

[Chorus]
And I will sing you through the night
A ribbon of love, a thread of light
Whatever comes, you're not alone
I'll carry you all the way home

[Outro]
We'll carry you all the way home`;

function Dashboard() {
  const q = useQuizStore();
  const [stageIndex, setStageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Simulate progression for the demo
  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;
    const t = setTimeout(() => setStageIndex((i) => i + 1), 3500);
    return () => clearTimeout(t);
  }, [stageIndex]);

  const completed = stageIndex === STAGES.length - 1;
  const shareUrl =
    typeof window !== "undefined" && q.orderId
      ? `${window.location.origin}/listen/${q.orderId}`
      : "";

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border/60 bg-background/80 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">Your dashboard</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              {completed ? "Delivered" : "In progress"}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              {completed
                ? `${q.recipient_name || "Their"} song is ready.`
                : `We're crafting ${q.recipient_name || "their"} song.`}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {completed
                ? "Listen, share, and keep it forever."
                : "We'll email you the moment it's ready. You can close this page anytime."}
            </p>

            {completed ? (
              <div className="mt-10 space-y-6">
                <AudioPlayer
                  variant="full"
                  title={`A Song for ${q.recipient_name || "You"}`}
                  artist={`${q.genre ?? "Acoustic Folk"} · ${q.tempo ?? "Mid-tempo"}`}
                  src="https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3"
                  lyrics={DEMO_LYRICS}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <ActionButton icon={Download} label="Download MP3" />
                  <ActionButton icon={Download} label="Download WAV" />
                  <ActionButton icon={FileText} label="Lyric sheet PDF" />
                </div>
              </div>
            ) : (
              <ol className="mt-10 space-y-4">
                {STAGES.slice(0, -1).map((s, i) => {
                  const state =
                    i < stageIndex
                      ? "done"
                      : i === stageIndex
                        ? "active"
                        : "pending";
                  return (
                    <li
                      key={s.key}
                      className={`flex items-start gap-4 rounded-2xl border p-5 transition-all ${
                        state === "active"
                          ? "border-primary bg-card shadow-soft"
                          : state === "done"
                            ? "border-success/40 bg-card"
                            : "border-border bg-card/50"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          state === "done"
                            ? "bg-success text-success-foreground"
                            : state === "active"
                              ? "bg-primary text-primary-foreground"
                              : "bg-peach text-muted-foreground"
                        }`}
                      >
                        {state === "done" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-medium">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-lg font-semibold text-foreground">
                          {s.label}
                          {state === "active" && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              · in progress
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Order details
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="For" value={q.recipient_name || "Not set"} />
                <Row label="Relationship" value={q.relationship ?? "Not set"} />
                <Row label="Genre" value={q.genre ?? "Not set"} />
                <Row label="Tempo" value={q.tempo ?? "Not set"} />
                <Row
                  label="Add-ons"
                  value={
                    [
                      q.has_3rd_verse && "3rd verse",
                      q.is_rush && "24h rush",
                      q.has_unlimited_edits && "Unlimited edits",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "None"
                  }
                />
              </dl>
            </div>

            {completed && shareUrl && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Share their song
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A beautiful, distraction-free page just for them.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-peach bg-background px-3 py-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {shareUrl}
                  </span>
                </div>
                <button
                  onClick={copy}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy public link
                    </>
                  )}
                </button>
                <Link
                  to="/listen/$id"
                  params={{ id: q.orderId ?? "preview" }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-peach/40"
                >
                  Open recipient view
                </Link>
              </div>
            )}

            {completed && (
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-peach/40">
                <Pencil className="h-4 w-4" />
                Request a refinement
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: typeof Download;
  label: string;
}) {
  return (
    <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-peach/40">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
