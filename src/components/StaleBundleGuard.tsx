// Detects when the published site is running an outdated build and reloads the page.
// Two layers of protection:
//  1) Listen for chunk-load failures (dynamic import of a hashed chunk that no longer exists)
//     and force-reload once. This is what happens to customers holding a stale `index.html`
//     after we redeploy with new bundle hashes.
//  2) Periodically refetch the homepage HTML and compare bundled-asset fingerprints.
//     If the script tag hashes change, a new build is live → reload on next tab focus.

import { useEffect, useRef } from "react";

const RELOAD_FLAG = "__ribbonsong_chunk_reload__";
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
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    console.warn("[StaleBundleGuard] reload already attempted, skipping", reason);
    return;
  }
  sessionStorage.setItem(RELOAD_FLAG, "1");
  console.warn("[StaleBundleGuard] reloading due to:", reason);
  window.location.reload();
}

// Extract a fingerprint from the current page's bundled asset URLs (which contain
// the Vite build hash, e.g. /assets/index-D_XjfnCQ.js).
function currentBundleFingerprint(): string {
  if (typeof document === "undefined") return "";
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((s) => s.src)
    .filter((src) => /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(js|mjs)/.test(src))
    .sort();
  return scripts.join("|");
}

async function fetchHtmlFingerprint(): Promise<string | null> {
  try {
    const res = await fetch("/", { cache: "no-store", headers: { Accept: "text/html" } });
    if (!res.ok) return null;
    const html = await res.text();
    const matches = html.match(/\/assets\/[^"'\s]+-[A-Za-z0-9_-]{6,}\.(?:js|mjs)/g) ?? [];
    return [...new Set(matches)].sort().join("|");
  } catch {
    return null;
  }
}

export function StaleBundleGuard() {
  const initialFingerprint = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5_000);
    initialFingerprint.current = currentBundleFingerprint();

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

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      if (!initialFingerprint.current) {
        initialFingerprint.current = currentBundleFingerprint();
        return;
      }
      const latest = await fetchHtmlFingerprint();
      if (!latest) return;
      // Compare: if none of our currently-loaded chunks appear in the fresh HTML,
      // the deploy has rolled forward.
      const loaded = initialFingerprint.current.split("|").filter(Boolean);
      if (loaded.length === 0) return;
      const stillPresent = loaded.some((url) => latest.includes(url));
      if (!stillPresent) {
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
