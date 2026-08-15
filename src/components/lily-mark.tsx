/**
 * The pressed-lily mark — the fallback brand mark used until an admin
 * uploads a logo, and as a recurring motif (order confirmations, empty states).
 */
export function LilyMark({ className = "h-8 w-8", title = "Lily's Safe Haven" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* stem */}
      <path
        d="M24 46c0-9 -1.5-15 -1-22"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* leaf on stem */}
      <path
        d="M23.4 36c-5 -1 -8.5 -4.5 -9 -9 4.5 .5 8 3.5 9 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* left petal */}
      <path
        d="M23 24C13.5 22.5 8.5 13 10 5.5 16.5 8 22 14 23 22.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* right petal */}
      <path
        d="M23.2 23C26 13.5 32 8.5 39 8c-.5 8-6.5 14.5-15 15.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* stamen */}
      <path
        d="M23.5 21.5C25.5 16.5 28.5 13 32.5 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="33.6" cy="10.2" r="1.6" fill="currentColor" />
    </svg>
  );
}
