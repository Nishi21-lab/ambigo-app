import React from "react";

type LogoVariant = "full" | "icon" | "text";

interface LogoProps {
  /** "full" = icon + text, "icon" = icon only, "text" = text only */
  variant?: LogoVariant;
  /** Height in pixels — width scales proportionally */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show the "Driver" subtitle (only in "full" variant) */
  showSubtitle?: boolean;
}

/**
 * AmbiGo brand logo component.
 *
 * Renders an inline SVG so the logo works everywhere without external
 * asset loading — perfect for auth screens, headers, and loading states.
 */
export const Logo: React.FC<LogoProps> = ({
  variant = "full",
  size = 40,
  className = "",
  showSubtitle = false,
}) => {
  if (variant === "text") {
    return (
      <span
        className={`inline-flex items-baseline font-extrabold tracking-tight ${className}`}
        style={{ fontSize: size * 0.7 }}
      >
        <span style={{ color: "#0f2245" }}>AMBI</span>
        <span style={{ color: "#e53935" }}>GO</span>
      </span>
    );
  }

  const icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 140"
      fill="none"
      width={size}
      height={size * (140 / 120)}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient
          id="logo-aGrad"
          x1="0"
          y1="0"
          x2="60"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#0f2245" />
        </linearGradient>
        <linearGradient
          id="logo-blueShine"
          x1="20"
          y1="10"
          x2="45"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4a90d9" />
          <stop offset="50%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#0f2245" />
        </linearGradient>
      </defs>
      <g transform="translate(10, 5)">
        {/* A shape – left */}
        <path d="M50 8 L8 125 L22 125 L50 38 Z" fill="url(#logo-blueShine)" />
        {/* A shape – right */}
        <path d="M50 8 L92 125 L78 125 L50 38 Z" fill="url(#logo-aGrad)" />
        {/* Road */}
        <path d="M30 120 Q45 70 50 55 Q55 70 70 120" fill="#0f2245" />
        <path d="M36 118 Q47 75 50 62 Q53 75 64 118" fill="#2a2a3a" />
        {/* Road center dashes */}
        <line x1="50" y1="72" x2="50" y2="80" stroke="#ffd54f" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="49" y1="85" x2="51" y2="95" stroke="#ffd54f" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* Location Pin */}
        <g transform="translate(26, 25)">
          <path
            d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.4 18.6 0 12 0Z"
            fill="#e53935"
          />
          <circle cx="12" cy="12" r="5" fill="white" />
        </g>
        {/* Heartbeat line */}
        <path
          d="M70 65 L78 65 L82 50 L88 80 L94 55 L98 65 L108 65"
          stroke="#e53935"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  if (variant === "icon") {
    return <span className={`inline-flex ${className}`}>{icon}</span>;
  }

  // variant === "full"
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {icon}
      <span className="flex flex-col leading-tight">
        <span
          className="font-extrabold tracking-tight"
          style={{ fontSize: size * 0.55 }}
        >
          <span className="text-white">AMBI</span>
          <span style={{ color: "#e53935" }}>GO</span>
        </span>
        {showSubtitle && (
          <span
            className="text-ambigo-400 font-medium tracking-wider uppercase"
            style={{ fontSize: size * 0.22 }}
          >
            Driver
          </span>
        )}
      </span>
    </span>
  );
};
