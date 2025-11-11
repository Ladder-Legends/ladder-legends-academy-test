'use client';

import { useState, useMemo } from 'react';
import { BuildOrder } from '@/types/build-order';
import { Video as VideoType } from '@/types/video';
import Link from 'next/link';
import { FileText, Video, Lock, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PaywallLink } from '@/components/auth/paywall-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getContentVideoUrl } from '@/lib/video-helpers';
import videosData from '@/data/videos.json';

const allVideos = videosData as VideoType[];

type SortField = 'name' | 'matchup' | 'difficulty' | 'coach' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface BuildOrdersTableProps {
  buildOrders: BuildOrder[];
  hasSubscriberRole: boolean;
  onEdit?: (buildOrder: BuildOrder) => void;
  onDelete?: (buildOrder: BuildOrder) => void;
}

export function BuildOrdersTable({ buildOrders, hasSubscriberRole, onEdit, onDelete }: BuildOrdersTableProps) {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort the build orders based on current sort field and direction
  const sortedBuildOrders = useMemo(() => {
    return [...buildOrders].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'matchup':
          aValue = `${a.race}${a.vsRace}`.toLowerCase();
          bValue = `${b.race}${b.vsRace}`.toLowerCase();
          break;
        case 'difficulty':
          // Sort by difficulty order: basic < intermediate < expert
          const difficultyOrder: Record<string, number> = { basic: 1, intermediate: 2, expert: 3 };
          aValue = difficultyOrder[a.difficulty.toLowerCase()] || 0;
          bValue = difficultyOrder[b.difficulty.toLowerCase()] || 0;
          break;
        case 'coach':
          aValue = (a.coach || '').toLowerCase();
          bValue = (b.coach || '').toLowerCase();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [buildOrders, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending when clicking a new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
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
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Build Name
                <SortIcon field="name" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('matchup')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Matchup
                <SortIcon field="matchup" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('difficulty')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Difficulty
                <SortIcon field="difficulty" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('coach')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Coach
                <SortIcon field="coach" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">
              <button
                onClick={() => handleSort('updatedAt')}
                className="flex items-center hover:text-primary transition-colors"
              >
                Updated
                <SortIcon field="updatedAt" />
              </button>
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedBuildOrders.map((buildOrder, index) => (
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
                <span className="text-sm text-muted-foreground">
                  {new Date(buildOrder.updatedAt).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Link href={`/build-orders/${buildOrder.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  {getContentVideoUrl(buildOrder, allVideos) && (
                    <PaywallLink
                      href={getContentVideoUrl(buildOrder, allVideos)!}
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
