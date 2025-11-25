'use client';

import { Masterclass } from '@/types/masterclass';
import Link from 'next/link';
import { Play, Lock, Edit, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MasterclassesTableProps {
  masterclasses: Masterclass[];
  hasSubscriberRole: boolean;
  onEdit?: (masterclass: Masterclass) => void;
  onDelete?: (masterclass: Masterclass) => void;
}

export function MasterclassesTable({ masterclasses, hasSubscriberRole, onEdit, onDelete }: MasterclassesTableProps) {
  const getRaceColor = (_race: string) => {
    // Using theme foreground color instead of race-specific colors
    return 'text-foreground';
  };

  const getDifficultyColor = (_difficulty?: string) => {
    // Using theme colors instead of difficulty-specific colors
    return 'bg-muted text-foreground border-border';
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden inline-block min-w-full">
      <table className="w-full min-w-[800px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Coach</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Race</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Difficulty</th>
            <th className="text-left px-6 py-4 text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {masterclasses.map((masterclass, index) => (
            <tr
              key={masterclass.id}
              className={`border-t border-border hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              }`}
            >
              <td className="px-6 py-4">
                <Link
                  href={`/masterclasses/${masterclass.id}`}
                  className="text-base font-medium hover:text-primary transition-colors block"
                >
                  {masterclass.title}
                </Link>
                {!masterclass.isFree && !hasSubscriberRole && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-primary-foreground flex items-center gap-0.5 font-medium whitespace-nowrap flex-shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      Premium
                    </span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-muted-foreground">{masterclass.coach}</span>
              </td>
              <td className="px-6 py-4">
                {masterclass.race && (
                  <span className={`text-sm font-medium ${getRaceColor(masterclass.race)}`}>
                    {masterclass.race}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                {masterclass.difficulty && (
                  <Badge variant="outline" className={getDifficultyColor(masterclass.difficulty)}>
                    {masterclass.difficulty}
                  </Badge>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Link href={`/masterclasses/${masterclass.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Play className="h-4 w-4" />
                    </Button>
                  </Link>
                  <PermissionGate require="coaches">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
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
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(masterclass);
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
