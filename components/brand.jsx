import React from 'react';

// The Wingman drumstick mark, ported 1:1 from the brand sheet.
// Static gradient/clip ids: every instance is identical, so a shared id
// renders correctly and keeps this a pure (server-or-client) component.
const MEAT_PATH =
  'M48 82C41 71 43 55 54 44C62 35 74 28 86 32C99 37 101 57 92 69C84 79 70 83 60 85C54 86 51 86 48 82Z';

export function Drumstick({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wmGold" x1="38" y1="100" x2="94" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a85e1d" />
          <stop offset="0.45" stopColor="#cd8128" />
          <stop offset="0.8" stopColor="#e3a23f" />
          <stop offset="1" stopColor="#f1bf58" />
        </linearGradient>
        <clipPath id="wmMeat">
          <path d={MEAT_PATH} />
        </clipPath>
      </defs>
      <g transform="translate(60 62) scale(1.16) translate(-59.5 -70.6)">
        <path d="M55 78 L31 99" stroke="#201913" strokeWidth="15.5" strokeLinecap="round" fill="none" />
        <circle cx="27" cy="96" r="9.2" fill="#201913" />
        <circle cx="31" cy="105" r="8.2" fill="#201913" />
        <path d="M55 78 L31 99" stroke="#efe7d4" strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="27" cy="96" r="6" fill="#efe7d4" />
        <circle cx="31" cy="105" r="5.4" fill="#efe7d4" />
        <path d="M22.5 99.2A6 6 0 0 0 32 98" fill="none" stroke="#cdbf9f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M26.4 108A5.4 5.4 0 0 0 35.4 106.4" fill="none" stroke="#cdbf9f" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M53 80 L34 96" stroke="#cdbf9f" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
        <g clipPath="url(#wmMeat)">
          <rect x="0" y="0" width="120" height="120" fill="url(#wmGold)" />
          <path d="M44 60C55 69 65 56 76 63C83 67 89 60 96 57L98 100L38 100Z" fill="#6d3917" />
          <path d="M60 39C70 33 82 34 88 43C83 39 73 39 65 45C62 47 60 44 60 39Z" fill="#f6cd76" opacity="0.6" />
          <ellipse cx="82" cy="41" rx="4" ry="2.6" fill="#fbe6b0" opacity="0.7" transform="rotate(-32 82 41)" />
        </g>
        <path d={MEAT_PATH} fill="none" stroke="#201913" strokeWidth="3.6" strokeLinejoin="round" />
        <path d="M44 60C55 69 65 56 76 63C83 67 89 60 95 57" fill="none" stroke="#4a2710" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// The bare drumstick mark (no tile) — used as the logo across the web app.
export function BrandMark({ size = 44, className = '' }) {
  return <Drumstick size={size} className={className} />;
}

// Two-tone wordmark: wing(ink) · man(pink). Size via the className font-size.
export function Wordmark({ className = '' }) {
  return (
    <span
      className={className}
      style={{ fontFamily: "var(--font-display), 'Poppins', sans-serif", fontWeight: 900, letterSpacing: '-0.03em' }}
    >
      wing<span style={{ color: '#ffb8d4' }}>man</span>
    </span>
  );
}

// Header lockup: tile + wordmark.
export function BrandLockup({ markSize = 40, className = '', wordClassName = 'text-2xl' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={markSize} />
      <Wordmark className={wordClassName} />
    </span>
  );
}

// 4-point sizzle star, from the brand motion sheet.
export function Sparkle({ size = 16, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1C12.7 7 13 9.3 23 12 13 14.7 12.7 17 12 23 11.3 17 11 14.7 1 12 11 9.3 11.3 7 12 1Z"
        fill={color}
      />
    </svg>
  );
}
