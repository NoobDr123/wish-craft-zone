// Shared branding tokens for RibbonSong auth + transactional emails.
// Email clients have very limited CSS — keep everything inline-friendly.

export const BRAND = {
  name: "RibbonSong",
  rootDomain: "ribbonsong.com",
  rootUrl: "https://ribbonsong.com",
  logoUrl:
    "https://tytxdnftsnspejnyfbmg.supabase.co/storage/v1/object/public/email-assets/ribbonsong-logo.png",
  // Synced with src/styles.css landing-page tokens (light theme)
  colors: {
    cream: "#F6F0E6",        // --background
    backgroundCard: "#FBF6EC", // --background-card
    backgroundWarm: "#ECE2D0", // --background-warm / --muted / --peach
    foreground: "#1F1B16",    // --foreground
    foregroundSoft: "#5A5148",// --foreground-soft / --muted-foreground
    muted: "#8A8175",         // --foreground-faint
    primary: "#8D6FAF",       // --primary (warm purple)
    primaryHover: "#6B4F8A",  // --primary-hover
    primaryForeground: "#FFF7EE", // --primary-foreground
    accent: "#E5D9EF",        // --accent
    border: "#D9CEB9",        // --border
    peach: "#ECE2D0",         // --peach
  },
} as const;

export const styles = {
  main: {
    backgroundColor: "#ffffff",
    fontFamily:
      '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: BRAND.colors.cream,
    padding: "40px 28px",
    maxWidth: "560px",
    margin: "0 auto",
    borderRadius: "0",
  },
  logo: {
    display: "block",
    margin: "0 auto 8px",
    width: "120px",
    height: "auto",
  },
  brandSub: {
    fontSize: "12px",
    fontWeight: 500 as const,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: BRAND.colors.primary,
    margin: "0 0 32px",
    textAlign: "center" as const,
  },
  h1: {
    fontFamily: '"Fraunces", "Iowan Old Style", Georgia, serif',
    fontSize: "30px",
    fontWeight: 600 as const,
    lineHeight: "1.15",
    color: BRAND.colors.foreground,
    margin: "0 0 16px",
  },
  text: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: BRAND.colors.foreground,
    margin: "0 0 22px",
  },
  textMuted: {
    fontSize: "14px",
    lineHeight: "1.55",
    color: BRAND.colors.muted,
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: BRAND.colors.primary,
    color: BRAND.colors.primaryForeground,
    fontSize: "15px",
    fontWeight: 600 as const,
    borderRadius: "999px",
    padding: "14px 28px",
    textDecoration: "none",
    display: "inline-block",
  },
  link: {
    color: BRAND.colors.primary,
    textDecoration: "underline",
  },
  divider: {
    borderTop: `1px solid ${BRAND.colors.border}`,
    margin: "32px 0 20px",
  },
  footer: {
    fontSize: "12px",
    lineHeight: "1.6",
    color: BRAND.colors.muted,
    margin: "8px 0 0",
  },
  code: {
    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
    fontSize: "30px",
    fontWeight: 700 as const,
    letterSpacing: "0.18em",
    color: BRAND.colors.foreground,
    backgroundColor: "#ffffff",
    border: `1px solid ${BRAND.colors.border}`,
    borderRadius: "12px",
    padding: "16px 20px",
    margin: "8px 0 28px",
    textAlign: "center" as const,
  },
};
