export function Logomark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="30" height="30" rx="9" stroke="var(--signal)" strokeWidth="1.5" opacity="0.35" />
      <circle cx="16" cy="16" r="3.4" fill="var(--signal)" />
      <path
        d="M10.5 21.5a8 8 0 0 1 0-11"
        stroke="var(--signal)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M21.5 21.5a8 8 0 0 0 0-11"
        stroke="var(--signal)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 25a12.5 12.5 0 0 1 0-18"
        stroke="var(--signal)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
