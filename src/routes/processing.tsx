import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useQuizStore } from "@/stores/quizStore";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
});

function ProcessingPage() {
  const navigate = useNavigate();
  const q = useQuizStore();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 3500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 pt-8">
        <div className="mx-auto max-w-3xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <div className="relative h-32 w-32">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-3 rounded-full bg-gradient-ribbon shadow-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-primary-foreground"
                  style={{
                    height: `${10 + Math.sin(i) * 6 + i * 4}px`,
                    animation: `wave 1.2s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <h1 className="mt-12 font-display text-4xl font-semibold text-foreground md:text-5xl">
          The magic is in progress.
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          {q.recipient_name
            ? `We've started crafting ${q.recipient_name}'s song.`
            : "We've started crafting their song."}{" "}
          Taking you to your dashboard…
        </p>

        <style>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(0.6); }
            50% { transform: scaleY(1.4); }
          }
        `}</style>
      </main>
    </div>
  );
}
