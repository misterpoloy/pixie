"use client";

interface Props {
  showCalendar: boolean;
  onCalendar: () => void;
  showClock: boolean;
  onClock: () => void;
}

export default function NavRail({ showCalendar, onCalendar, showClock, onClock }: Props) {
  return (
    <nav className="nav-rail">
      <button
        className={`nav-rail-btn${showCalendar ? " active" : ""}`}
        onClick={onCalendar}
        title={showCalendar ? "Hide calendar" : "Show calendar"}
      >
        <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 6h13" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="3.5" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
          <rect x="6.5" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
          <rect x="9.5" y="8" width="2" height="2" rx="0.4" fill="currentColor" />
        </svg>
      </button>
      <button
        className={`nav-rail-btn${showClock ? " active" : ""}`}
        onClick={onClock}
        title={showClock ? "Hide world clock" : "Show world clock"}
      >
        <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7.5 4v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
