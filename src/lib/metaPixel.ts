// Tiny wrapper around Meta Pixel (`window.fbq`).
//
// The pixel script is injected from src/routes/__root.tsx and is gated to the
// production hostnames (getpawprintsong.com / www.getpawprintsong.com) so preview /
// lovable.dev domains never pollute the dataset. These helpers are safe to
// call from anywhere — when fbq isn't on the page they simply no-op.

type FbqArgs = unknown[];
type Fbq = ((...args: FbqArgs) => void) & { queue?: FbqArgs[] };

function getFbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof fn === "function" ? fn : null;
}

/** Standard Meta event (PageView, ViewContent, InitiateCheckout, Purchase, ...). */
export function pixelTrack(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
): void {
  try {
    const fbq = getFbq();
    if (!fbq) return;
    if (options?.eventID) {
      fbq("track", eventName, params ?? {}, { eventID: options.eventID });
    } else {
      fbq("track", eventName, params ?? {});
    }
  } catch {
    /* never block UI on pixel errors */
  }
}

/** Custom (non-standard) Meta event. */
export function pixelTrackCustom(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  try {
    const fbq = getFbq();
    if (!fbq) return;
    fbq("trackCustom", eventName, params ?? {});
  } catch {
    /* noop */
  }
}
