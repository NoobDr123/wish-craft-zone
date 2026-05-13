// Minimal ISO-3166 country list for the billing-country picker.
// We keep it inline (no extra dep) and skip exotic territories. The 5
// markets where we charge in local currency are flagged via `local`.

export interface CountryEntry {
  code: string;   // ISO-3166-1 alpha-2
  name: string;
  flag: string;
  /** True for the 5 markets where we charge in local currency. */
  local?: boolean;
}

// Countries Stripe / postal systems consider as having NO postal code.
// We hide the postal field for these. Source: Stripe + UPU references.
export const NO_POSTAL_CODE_COUNTRIES = new Set<string>([
  "AE", "AG", "AO", "AW", "BF", "BI", "BJ", "BO", "BS", "BW", "BZ",
  "CD", "CF", "CG", "CI", "CK", "CM", "DJ", "DM", "ER", "FJ", "GD",
  "GH", "GM", "GN", "GQ", "GY", "HK", "IE", "JM", "KE", "KI", "KM",
  "KN", "KP", "LC", "ML", "MO", "MR", "MS", "MU", "MW", "NR", "NU",
  "PA", "QA", "RW", "SB", "SC", "SL", "SO", "SR", "ST", "SY", "TF",
  "TK", "TL", "TO", "TT", "TV", "TZ", "UG", "VU", "YE", "ZW",
]);

export const COUNTRIES: CountryEntry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", local: true },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", local: true },
  { code: "CA", name: "Canada", flag: "🇨🇦", local: true },
  { code: "AU", name: "Australia", flag: "🇦🇺", local: true },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", local: true },
  // Other supported destinations — alphabetical.
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czechia", flag: "🇨🇿" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export function findCountry(code: string | null | undefined): CountryEntry | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

export function postalRequiredFor(code: string | null | undefined): boolean {
  if (!code) return true;
  return !NO_POSTAL_CODE_COUNTRIES.has(code.toUpperCase());
}
