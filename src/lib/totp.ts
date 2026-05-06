// Client-safe TOTP helpers. The TOTP secret never leaves the server now —
// enrollment + verification go through the `admin-mfa` edge function. This
// module is kept for backward compatibility but contains no secret-handling
// logic.

export const TOTP_ISSUER = "PawPrint Song Admin";
