'use client';

import { ReactNode } from 'react';

interface MarketingHeroProps {
  /** Background image URL */
  backgroundImage: string;
  /** Background image position (CSS background-position) */
  backgroundPosition?: string;
  /** Content to display in the hero section */
  children: ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Image filter class (e.g., 'grayscale', 'sepia') */
  imageFilter?: string;
  /** Image opacity (0-1) */
  imageOpacity?: number;
}

export function MarketingHero({
  backgroundImage,
  backgroundPosition = 'center 45%',
  children,
  className = '',
  imageFilter = 'grayscale',
  imageOpacity = 0.25,
}: MarketingHeroProps) {
  return (
    <section className={`relative px-8 py-16 md:py-24 lg:py-32 overflow-hidden ${className}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute inset-0 bg-cover bg-no-repeat ${imageFilter}`}
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundPosition,
            backgroundSize: 'cover',
            opacity: imageOpacity,
          }}
        />
      </div>

      {/* Strong center wash to hide logo - uses CSS variable that changes with theme */}
      <div
        className="absolute inset-0 z-10 transition-all duration-200"
        style={{
          background: 'radial-gradient(ellipse 60% 70% at center 55%, color-mix(in srgb, var(--color-background) 92%, transparent) 0%, color-mix(in srgb, var(--color-background) 80%, transparent) 30%, color-mix(in srgb, var(--color-background) 40%, transparent) 50%, transparent 70%)'
        }}
      />

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </section>
  );
}
