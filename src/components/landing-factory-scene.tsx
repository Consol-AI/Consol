/** Full-bleed factory floor visual for the marketing hero — CSS art, not a card. */
export function LandingFactoryScene() {
  return (
    <div
      aria-hidden
      className="landing-scene pointer-events-none absolute inset-x-0 bottom-0 top-[12%] -z-[1] md:top-[22%]"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--landing-deep)] via-[var(--landing-deep)]/70 to-transparent" />

      <svg
        className="absolute inset-0 h-full w-full opacity-90"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3dba8c" stopOpacity="0" />
            <stop offset="35%" stopColor="#3dba8c" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#7ee0b8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3dba8c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a3d32" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d221c" stopOpacity="0.55" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Atmospheric blooms */}
        <ellipse
          className="landing-bloom"
          cx="320"
          cy="420"
          rx="220"
          ry="120"
          fill="#1a7a5c"
          opacity="0.18"
          filter="url(#soft)"
        />
        <ellipse
          className="landing-bloom-delay"
          cx="1080"
          cy="380"
          rx="260"
          ry="140"
          fill="#2a9b74"
          opacity="0.14"
          filter="url(#soft)"
        />

        {/* Conveyor / process rails */}
        <path
          d="M80 480 H1360"
          stroke="url(#rail)"
          strokeWidth="1.5"
          className="landing-rail"
        />
        <path
          d="M120 560 H1320"
          stroke="url(#rail)"
          strokeWidth="1"
          opacity="0.55"
          className="landing-rail-delay"
        />

        {/* Process lanes */}
        {[
          { x: 180, label: "PM", stages: 4 },
          { x: 460, label: "Build", stages: 5 },
          { x: 780, label: "Design", stages: 3 },
          { x: 1060, label: "Data", stages: 4 },
        ].map((lane, laneIndex) => (
          <g key={lane.label} className={`landing-lane landing-lane-${laneIndex}`}>
            <rect
              x={lane.x}
              y={300}
              width={220}
              height={220}
              rx="4"
              fill="url(#panel)"
              stroke="#3dba8c"
              strokeOpacity="0.22"
            />
            <text
              x={lane.x + 18}
              y={330}
              fill="#9cb8ae"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="13"
              letterSpacing="0.12em"
            >
              {lane.label.toUpperCase()}
            </text>
            {Array.from({ length: lane.stages }).map((_, i) => (
              <g key={i}>
                <rect
                  x={lane.x + 18}
                  y={352 + i * 36}
                  width={184}
                  height={26}
                  rx="3"
                  fill="#0a1a15"
                  stroke="#3dba8c"
                  strokeOpacity={0.18 + (i === 1 ? 0.35 : 0)}
                />
                <circle
                  cx={lane.x + 34}
                  cy={365 + i * 36}
                  r="4"
                  className={i === 1 ? "landing-node-active" : undefined}
                  fill={i === 1 ? "#3dba8c" : "#2a4a3e"}
                />
                <rect
                  x={lane.x + 48}
                  y={360 + i * 36}
                  width={100 + ((i * 17) % 40)}
                  height="6"
                  rx="2"
                  fill="#2f5a4a"
                  opacity="0.7"
                />
              </g>
            ))}
          </g>
        ))}

        {/* Shared thread / AI signal */}
        <path
          className="landing-thread"
          d="M290 410 C420 390, 560 450, 690 420 S960 380, 1170 405"
          fill="none"
          stroke="#7ee0b8"
          strokeWidth="1.25"
          strokeDasharray="6 10"
          opacity="0.65"
        />
        <circle className="landing-pulse" cx="690" cy="420" r="7" fill="#7ee0b8" />
      </svg>
    </div>
  );
}
