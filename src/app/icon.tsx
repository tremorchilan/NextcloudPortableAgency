import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the brand mark — a brand-
// coloured rounded square + white chat-square glyph — matching the
// sidebar logo in `src/components/layout/sidebar.tsx`. Next.js renders
// this at build time and auto-injects <link rel="icon"> into <head>.
//
// The colour is driven by `NEXT_PUBLIC_BRAND_PRIMARY` (with a
// Nextcloud-blue default) so an agency can re-skin the favicon via env
// without code changes.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

// Read at request time (edge runtime) so the env-driven colour is
// honoured; falls back to Nextcloud blue when unset.
const PRIMARY = process.env.NEXT_PUBLIC_BRAND_PRIMARY ?? "#0082c9";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PRIMARY,
          borderRadius: 6,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
