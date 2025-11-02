'use client';

import { BuildOrder } from '@/types/build-order';
import Link from 'next/link';
import { FileText, Video, Lock, Edit, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PaywallLink } from '@/components/auth/paywall-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getContentVideoUrl } from '@/lib/video-helpers';

interface BuildOrdersTableProps {
  buildOrders: BuildOrder[];
  hasSubscriberRole: boolean;
  onEdit?: (buildOrder: BuildOrder) => void;
  onDelete?: (buildOrder: BuildOrder) => void;
}

export function BuildOrdersTable({ buildOrders, hasSubscriberRole, onEdit, onDelete }: BuildOrdersTableProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'aggressive': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'defensive': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'economic': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'timing': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'all-in': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden inline-block min-w-full">
      <table className="w-full min-w-[800px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold">Build Name</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Matchup</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Type</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Difficulty</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {buildOrders.map((buildOrder, index) => (
            <tr
              key={buildOrder.id}
              className={`border-t border-border hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              }`}
            >
              <td className="px-6 py-4">
                <Link
                  href={`/build-orders/${buildOrder.id}`}
                  className="text-base font-medium hover:text-primary transition-colors block"
                >
                  {buildOrder.name}
                </Link>
                {!buildOrder.isFree && !hasSubscriberRole && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      Premium
                    </span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-medium uppercase">
                  {buildOrder.race.charAt(0)}v{buildOrder.vsRace.charAt(0)}
                </span>
              </td>
              <td className="px-6 py-4">
                <Badge variant="outline" className={getTypeColor(buildOrder.type)}>
                  {buildOrder.type}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant="outline" className={getDifficultyColor(buildOrder.difficulty)}>
                  {buildOrder.difficulty}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {buildOrder.coach || '—'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Link href={`/build-orders/${buildOrder.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  {getContentVideoUrl(buildOrder) && (
                    <PaywallLink
                      href={getContentVideoUrl(buildOrder)!}
                      isFree={buildOrder.isFree}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Video className="h-4 w-4" />
                      </Button>
                    </PaywallLink>
                  )}
                  <PermissionGate require="coaches">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(buildOrder);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(buildOrder);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
