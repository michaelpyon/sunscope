interface Props {
  sunAzimuth?: number // current sun position in degrees
}

export function CompassOverlay({ sunAzimuth }: Props) {
  return (
    <div className="compass-overlay">
      <svg viewBox="0 0 100 100" width="80" height="80">
        {/* Compass circle */}
        <circle cx="50" cy="50" r="45" fill="rgba(255,255,255,0.9)" stroke="#94a3b8" strokeWidth="1" />

        {/* Cardinal directions */}
        <text x="50" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444">N</text>
        <text x="88" y="54" textAnchor="middle" fontSize="10" fill="#64748b">E</text>
        <text x="50" y="92" textAnchor="middle" fontSize="10" fill="#64748b">S</text>
        <text x="12" y="54" textAnchor="middle" fontSize="10" fill="#64748b">W</text>

        {/* Compass needle */}
        <line x1="50" y1="50" x2="50" y2="22" stroke="#ef4444" strokeWidth="2" />
        <line x1="50" y1="50" x2="50" y2="78" stroke="#94a3b8" strokeWidth="1.5" />

        {/* Sun position indicator */}
        {sunAzimuth !== undefined && (
          <g transform={`rotate(${sunAzimuth}, 50, 50)`}>
            <circle cx="50" cy="12" r="6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            <text x="50" y="15" textAnchor="middle" fontSize="8" fill="#92400e">☀</text>
          </g>
        )}

        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="#1e293b" />
      </svg>
    </div>
  )
}
