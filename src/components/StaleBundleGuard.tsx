// Detects when the published site is running an outdated build and reloads the page.
// Two layers of protection:
//  1) Listen for chunk-load failures (dynamic import of a hashed chunk that no longer exists)
//     and force-reload once. This is what happens to customers holding a stale `index.html`
//     after we redeploy with new bundle hashes.
//  2) Periodically poll the build manifest fingerprint. If it changed, reload on next nav.

import { useEffect, useRef } from "react";

const RELOAD_FLAG = "__ribbonsong_chunk_reload__";
const MANIFEST_PATH = "/__build_id"; // see public/__build_id below
const POLL_MS = 60_000;

function isChunkLoadError(message: unknown): boolean {
  if (typeof message !== "string") return false;
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("importing a module script failed") ||
    /chunk[- ]?\d*\s+failed/.test(m)
  );
}

function reloadOnce(reason: string) {
  if (typeof window === "undefined") return;
  // Avoid reload loops if reload itself fails
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    console.warn("[StaleBundleGuard] reload already attempted, skipping", reason);
    return;
  }
  sessionStorage.setItem(RELOAD_FLAG, "1");
  console.warn("[StaleBundleGuard] reloading due to:", reason);
  window.location.reload();
}

export function StaleBundleGuard() {
  const initialBuildId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Clear the reload flag once we've successfully booted on the new bundle
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5_000);

    // 1) Catch chunk-load errors from dynamic imports
    const onError = (e: ErrorEvent) => {
      if (isChunkLoadError(e.message) || isChunkLoadError(e.error?.message)) {
        reloadOnce("chunk error event");
      }
    };
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = (e.reason && (e.reason.message || String(e.reason))) ?? "";
      if (isChunkLoadError(msg)) reloadOnce("chunk promise rejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    // 2) Poll a build-id file to detect new deploys, reload on next visibility-gain
    let cancelled = false;
    const fetchBuildId = async (): Promise<string | null> => {
      try {
        const res = await fetch(`${MANIFEST_PATH}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.text()).trim();
      } catch {
        return null;
      }
    };

    fetchBuildId().then((id) => {
      initialBuildId.current = id;
    });

    const interval = setInterval(async () => {
      if (cancelled) return;
      const current = await fetchBuildId();
      if (!current || !initialBuildId.current) return;
      if (current !== initialBuildId.current) {
        // New build deployed — reload only when tab becomes visible to avoid
        // interrupting an active user mid-action.
        if (document.visibilityState === "visible") {
          reloadOnce("new build detected");
        } else {
          const onVis = () => {
            if (document.visibilityState === "visible") {
              document.removeEventListener("visibilitychange", onVis);
              reloadOnce("new build detected on tab focus");
            }
          };
          document.addEventListener("visibilitychange", onVis);
        }
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
