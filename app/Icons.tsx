// Small inline icon set — kept dependency-free (no icon package) since the
// app only needs a handful of these. All use currentColor so they inherit
// whatever text color/hover state the surrounding button already has.

export function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6.5 0l.6 9a1.5 1.5 0 001.5 1.4h3.8a1.5 1.5 0 001.5-1.4l.6-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Spinner({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spinner" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyCalendarIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="10" width="34" height="30" rx="5" stroke="currentColor" strokeWidth="2" />
      <path d="M7 18h34" stroke="currentColor" strokeWidth="2" />
      <path d="M15 6v7M33 6v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="29" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function EmptyPeopleIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="19" cy="17" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M7 39c0-7 5.5-11 12-11s12 4 12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="33" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <path d="M31 22.5c3.6.6 6 3 6 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function SearchOffIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="21" cy="21" r="11" stroke="currentColor" strokeWidth="2" />
      <path d="M29 29l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
