'use client';

import { Sponsorship } from '@/types/sponsorship';
import Image from 'next/image';
import Link from 'next/link';

interface SponsorshipSectionProps {
  sponsors: Sponsorship[];
  communityFunding: string;
  className?: string;
}

export function SponsorshipSection({ sponsors, communityFunding, className = '' }: SponsorshipSectionProps) {
  if (sponsors.length === 0) return null;

  return (
    <div className={`relative py-12 pattern-circuit ${className}`}>
      <div className="relative max-w-7xl mx-auto px-4">
        {/* Community Funding Metric */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Community Investment
            </div>
            <div className="text-5xl md:text-6xl font-bold text-primary">
              {communityFunding}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Supporting the StarCraft 2 ecosystem
            </div>
          </div>
        </div>

        {/* Sponsors Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Community Partners</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proud supporters of the StarCraft 2 community and competitive scene
          </p>
        </div>

        {/* Sponsor Links */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {sponsors
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((sponsor) => (
              <Link
                key={sponsor.id}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
                title={sponsor.description}
              >
                {/* Show image for Safe House, text for others */}
                {sponsor.id === 'sc2-safe-house' ? (
                  <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center p-4 rounded-lg border border-border bg-transparent hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                    <Image
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      fill
                      className="object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 128px, 160px"
                    />
                  </div>
                ) : (
                  <div className="px-6 py-3 rounded-lg border border-border bg-transparent hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                    <span className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                      {sponsor.name}
                    </span>
                  </div>
                )}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
