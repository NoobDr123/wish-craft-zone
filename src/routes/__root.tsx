import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import appCss from "../styles.css?url";
import { StaleBundleGuard } from "@/components/StaleBundleGuard";
import { pixelTrack } from "@/lib/metaPixel";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Meta Pixel — only fires on the production domain (ribbonsong.com / www.ribbonsong.com).
// Lovable preview URLs and lovable.dev are excluded so they don't pollute pixel data.
const metaPixelScript = `(function(){var h=window.location.hostname;if(h!=='ribbonsong.com'&&h!=='www.ribbonsong.com')return;!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1397546595537286');fbq('track','PageView');})();`;

export const Route = createRootRoute({
  head: () => ({
    scripts: [{ children: metaPixelScript }],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PawPrint Song: Turn your love into a song" },
      {
        name: "description",
        content:
          "A deeply personal, AI-crafted song for the fighter in your life. Because sometimes words aren't enough.",
      },
      { name: "author", content: "PawPrint Song" },
      { property: "og:title", content: "PawPrint Song: Turn your love into a song" },
      {
        property: "og:description",
        content:
          "Personalized songs that turn your memories and prayers into a lasting gift for someone facing cancer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PawPrint Song: Turn your love into a song" },
      { name: "description", content: "Transform the love, prayers, and memories of those affected by cancer into deeply personal songs that provide comfort, strength, and a lasting legacy." },
      { property: "og:description", content: "Transform the love, prayers, and memories of those affected by cancer into deeply personal songs that provide comfort, strength, and a lasting legacy." },
      { name: "twitter:description", content: "Transform the love, prayers, and memories of those affected by cancer into deeply personal songs that provide comfort, strength, and a lasting legacy." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/1ev7Eg3pjJSl6ntuLoRoywF3VFi1/social-images/social-1776831350372-apple-touch-icon.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/1ev7Eg3pjJSl6ntuLoRoywF3VFi1/social-images/social-1776831350372-apple-touch-icon.webp" },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Warm Stripe TLS handshakes early so the checkout page mounts faster.
      { rel: "preconnect", href: "https://js.stripe.com" },
      { rel: "preconnect", href: "https://api.stripe.com" },
      { rel: "preconnect", href: "https://m.stripe.network" },
      { rel: "dns-prefetch", href: "https://hooks.stripe.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Nunito:wght@700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Meta Pixel <noscript> fallback removed: it's static HTML and would fire
            on every hostname (preview, lovable.dev) without a JS hostname guard.
            The main Pixel script above handles all real users (JS required for Pixel events). */}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // Fire Meta Pixel `PageView` on every SPA route change.
  // The initial PageView is fired by the inline script in <head>; this hook
  // covers all subsequent client-side navigations so funnel pages (quiz steps,
  // checkout, upsells, thank-you) are tracked individually in Meta Ads.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    pixelTrack("PageView");
  }, [pathname]);

  return (
    <>
      <StaleBundleGuard />
      <Outlet />
    </>
  );
}
