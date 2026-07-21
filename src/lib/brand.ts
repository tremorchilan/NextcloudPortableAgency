/**
 * Agency / product branding.
 *
 * Every value is configurable per deployment through `NEXT_PUBLIC_*`
 * env vars, so a portable agency can re-skin an instance (name,
 * colour, support contact) without touching the code. Unset vars
 * fall back to the Nextcloud Portable Agency defaults, so the app
 * runs out of the box with zero branding config.
 *
 * Only `NEXT_PUBLIC_*` vars are safe here — this module is imported
 * by both server and client code (e.g. the root layout + the edge
 * favicon route), and only `NEXT_PUBLIC_*` values are inlined into
 * the client bundle.
 */

export const BRAND = {
  /** Full product name shown in the browser title and docs. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Portable Agency CRM",

  /** Short name / acronym used where horizontal space is tight. */
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT ?? "PACRM",

  /** One-line tagline used in docs and metadata. */
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ??
    "Self-hostable WhatsApp CRM for portable agencies",

  /**
   * Brand primary colour (hex). Drives the generated favicon and is
   * the seed for any brand-tinted UI. Defaults to Nextcloud blue.
   */
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY ?? "#0082c9",

  /** Support / contact email surfaced in error copy and docs. */
  supportEmail:
    process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL ?? "support@example.com",

  /**
   * Canonical public site URL. Falls back to the existing
   * `NEXT_PUBLIC_SITE_URL` (used for invite links + OG images) and
   * then to an empty string so callers can decide their own
   * last-resort behaviour.
   */
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BRAND_SITE_URL ??
    "",
} as const;

export type Brand = typeof BRAND;
