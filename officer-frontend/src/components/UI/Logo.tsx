import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 32,
  showText = true,
  subtitle = "TRAFFIC COMMAND",
}) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1a3a6b] to-[#0f2245] p-1.5 shadow-lg border border-blue-500/20"
      >
        <svg viewBox="0 0 120 140" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="offGrad" x1="0" y1="0" x2="60" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4a90d9" />
              <stop offset="100%" stopColor="#0f2245" />
            </linearGradient>
          </defs>
          <path d="M50 8 L8 125 L22 125 L50 38 Z" fill="url(#offGrad)" />
          <path d="M50 8 L92 125 L78 125 L50 38 Z" fill="url(#offGrad)" />
          <path d="M30 120 Q45 70 50 55 Q55 70 70 120" fill="#0f2245" stroke="none" />
          <line x1="50" y1="72" x2="50" y2="95" stroke="#ffd54f" strokeWidth="2.5" strokeDasharray="4 4" />
          <g transform="translate(26, 25)">
            <path d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.4 18.6 0 12 0Z" fill="#ff4757" />
            <circle cx="12" cy="12" r="5" fill="white" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-white leading-none">
            AMBI<span className="text-alert-red">GO</span>
          </span>
          {subtitle && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mt-0.5 leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
