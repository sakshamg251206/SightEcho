export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <path
        d="M12 32s7.5-13 20-13 20 13 20 13-7.5 13-20 13-20-13-20-13Z"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="6" fill="var(--accent-ink)" />
    </svg>
  );
}
