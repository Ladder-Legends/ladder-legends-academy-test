/**
 * Premium background effects component
 * Adds subtle visual depth with layered effects:
 * - Radial gradients from corners (red/orange theme)
 * - Texture noise overlay for depth
 * - Subtle wave pattern
 */
export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Radial gradients from corners - emphasis on bottom right */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at bottom right, rgba(239, 68, 68, 0.05) 0%, transparent 50%),
            radial-gradient(circle at bottom right, rgba(249, 115, 22, 0.04) 10%, transparent 60%),
            radial-gradient(circle at top left, rgba(249, 115, 22, 0.01) 0%, transparent 40%)
          `
        }}
      />

      {/* Texture noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Subtle wave pattern - SVG */}
      <svg
        className="absolute bottom-0 left-0 right-0 opacity-[0.02]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: '40vh' }}
      >
        <path
          fill="currentColor"
          fillOpacity="1"
          d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          className="text-primary/5"
        ></path>
      </svg>

      {/* Top wave pattern */}
      <svg
        className="absolute top-0 left-0 right-0 opacity-[0.02] rotate-180"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: '30vh' }}
      >
        <path
          fill="currentColor"
          fillOpacity="1"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,197.3C672,192,768,160,864,149.3C960,139,1056,149,1152,154.7C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          className="text-primary/5"
        ></path>
      </svg>
    </div>
  );
}
