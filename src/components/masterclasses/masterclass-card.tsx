'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Masterclass, getMasterclassThumbnailUrl } from "@/types/masterclass";
import { Play, Lock, Edit, Trash2 } from "lucide-react";
import { PaywallLink } from "@/components/auth/paywall-link";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Video } from "@/types/video";
import videosData from "@/data/videos.json";
import Image from "next/image";

const videos = videosData as Video[];

interface MasterclassCardProps {
  masterclass: Masterclass;
  onEdit?: (masterclass: Masterclass) => void;
  onDelete?: (masterclass: Masterclass) => void;
}

export function MasterclassCard({ masterclass, onEdit, onDelete }: MasterclassCardProps) {
  const { data: session } = useSession();
  const hasSubscriberRole = session?.user?.hasSubscriberRole ?? false;
  const thumbnailUrl = getMasterclassThumbnailUrl(masterclass, videos);

  const getRaceBadgeColor = (race: string) => {
    switch (race.toLowerCase()) {
      case 'terran': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'zerg': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'protoss': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="relative group h-full">
      <PaywallLink
        href={`/masterclasses/${masterclass.id}`}
        className="block h-full"
        isFree={masterclass.isFree}
      >
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full flex flex-col p-0 pb-4">
          <div className="relative aspect-video bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden flex items-center justify-center">
            {/* Thumbnail or Race icon background */}
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={masterclass.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="text-6xl font-bold text-primary/10 capitalize">
                {masterclass.race}
              </div>
            )}

            {/* Premium Badge */}
            {!masterclass.isFree && !hasSubscriberRole && (
              <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium z-20">
                <Lock className="w-2.5 h-2.5" />
                Premium
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <CardHeader className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              {masterclass.race && (
                <Badge variant="outline" className={getRaceBadgeColor(masterclass.race)}>
                  {masterclass.race}
                </Badge>
              )}
              {masterclass.difficulty && (
                <Badge variant="outline">
                  {masterclass.difficulty}
                </Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
              {masterclass.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {masterclass.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Coach: {masterclass.coach}</span>
            </div>
          </CardContent>
        </Card>
      </PaywallLink>

      {/* Admin Edit/Delete Buttons */}
      <PermissionGate require="coaches">
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(masterclass);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 bg-destructive/90 backdrop-blur-sm hover:bg-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(masterclass);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
