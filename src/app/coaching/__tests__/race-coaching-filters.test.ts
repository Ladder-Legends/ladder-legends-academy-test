/**
 * Tests for race coaching page filtering logic:
 * - Replays filtered by winner's race
 * - Build orders filtered by player's race
 * - Race-specific content display
 */

import type { Replay } from '@/types/replay';
import type { BuildOrder } from '@/types/build-order';
import type { Video } from '@/types/video';

describe('Race Coaching Filters', () => {
  describe('Replay Winner Filtering', () => {
    const createReplay = (
      id: string,
      matchup: string,
      winner: 'player1' | 'player2',
      p1Race: string,
      p2Race: string
    ): Partial<Replay> => ({
      id,
      matchup: matchup as any,
      player1: {
        name: 'Player 1',
        race: p1Race as any,
        result: winner === 'player1' ? 'win' : 'loss',
      },
      player2: {
        name: 'Player 2',
        race: p2Race as any,
        result: winner === 'player2' ? 'win' : 'loss',
      },
      title: `${matchup} Game`,
      map: 'Test Map',
      duration: '10:00',
      gameDate: '2024-01-01',
      uploadDate: '2024-01-02',
      tags: [],
      videoIds: [],
    });

    it('should filter Terran coaching page to show only Terran wins', () => {
      const replays: Partial<Replay>[] = [
        createReplay('1', 'TvZ', 'player1', 'terran', 'zerg'),     // Terran won ✓
        createReplay('2', 'ZvT', 'player1', 'zerg', 'terran'),     // Zerg won ✗
        createReplay('3', 'TvP', 'player1', 'terran', 'protoss'),  // Terran won ✓
        createReplay('4', 'PvT', 'player1', 'protoss', 'terran'),  // Protoss won ✗
      ];

      const targetRace = 'terran';

      const filtered = replays.filter(replay => {
        const winner = replay.player1?.result === 'win' ? replay.player1 :
                      replay.player2?.result === 'win' ? replay.player2 : null;

        if (!winner) return false;

        const winnerRace = winner.race?.toLowerCase() || '';
        return winnerRace === targetRace;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('1'); // TvZ Terran win
      expect(filtered[1].id).toBe('3'); // TvP Terran win
    });

    it('should filter Zerg coaching page to show only Zerg wins', () => {
      const replays: Partial<Replay>[] = [
        createReplay('1', 'ZvT', 'player1', 'zerg', 'terran'),     // Zerg won ✓
        createReplay('2', 'TvZ', 'player1', 'terran', 'zerg'),     // Terran won ✗
        createReplay('3', 'ZvP', 'player1', 'zerg', 'protoss'),    // Zerg won ✓
        createReplay('4', 'PvZ', 'player1', 'protoss', 'zerg'),    // Protoss won ✗
      ];

      const targetRace = 'zerg';

      const filtered = replays.filter(replay => {
        const winner = replay.player1?.result === 'win' ? replay.player1 :
                      replay.player2?.result === 'win' ? replay.player2 : null;

        if (!winner) return false;

        const winnerRace = winner.race?.toLowerCase() || '';
        return winnerRace === targetRace;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('1'); // ZvT Zerg win
      expect(filtered[1].id).toBe('3'); // ZvP Zerg win
    });

    it('should filter Protoss coaching page to show only Protoss wins', () => {
      const replays: Partial<Replay>[] = [
        createReplay('1', 'PvT', 'player1', 'protoss', 'terran'),  // Protoss won ✓
        createReplay('2', 'TvP', 'player1', 'terran', 'protoss'),  // Terran won ✗
        createReplay('3', 'PvZ', 'player1', 'protoss', 'zerg'),    // Protoss won ✓
        createReplay('4', 'ZvP', 'player1', 'zerg', 'protoss'),    // Zerg won ✗
      ];

      const targetRace = 'protoss';

      const filtered = replays.filter(replay => {
        const winner = replay.player1?.result === 'win' ? replay.player1 :
                      replay.player2?.result === 'win' ? replay.player2 : null;

        if (!winner) return false;

        const winnerRace = winner.race?.toLowerCase() || '';
        return winnerRace === targetRace;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('1'); // PvT Protoss win
      expect(filtered[1].id).toBe('3'); // PvZ Protoss win
    });

    it('should show all replays for Random coaching page', () => {
      const replays: Partial<Replay>[] = [
        createReplay('1', 'TvZ', 'player1', 'terran', 'zerg'),
        createReplay('2', 'ZvP', 'player1', 'zerg', 'protoss'),
        createReplay('3', 'PvT', 'player1', 'protoss', 'terran'),
      ];

      const targetRace = 'random';

      const filtered = replays.filter(replay => {
        if (targetRace === 'random') return true;

        const winner = replay.player1?.result === 'win' ? replay.player1 :
                      replay.player2?.result === 'win' ? replay.player2 : null;

        if (!winner) return false;

        const winnerRace = winner.race?.toLowerCase() || '';
        return winnerRace === targetRace;
      });

      expect(filtered).toHaveLength(3);
    });

    it('should exclude replays with no winner', () => {
      const replays: Partial<Replay>[] = [
        createReplay('1', 'TvZ', 'player1', 'terran', 'zerg'),
        {
          id: '2',
          matchup: 'ZvP' as any,
          player1: { name: 'P1', race: 'zerg' as any, result: 'loss' },
          player2: { name: 'P2', race: 'protoss' as any, result: 'loss' },
          title: 'No Winner',
          map: 'Test',
          duration: '10:00',
          gameDate: '2024-01-01',
          uploadDate: '2024-01-02',
          tags: [],
          videoIds: [],
        },
      ];

      const targetRace = 'terran';

      const filtered = replays.filter(replay => {
        const winner = replay.player1?.result === 'win' ? replay.player1 :
                      replay.player2?.result === 'win' ? replay.player2 : null;

        if (!winner) return false;

        const winnerRace = winner.race?.toLowerCase() || '';
        return winnerRace === targetRace;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('Build Order Race Filtering', () => {
    const createBuildOrder = (id: string, race: string, vsRace: string): Partial<BuildOrder> => ({
      id,
      name: `${race} vs ${vsRace} Build`,
      race: race as any,
      vsRace: vsRace as any,
      description: 'Test build',
      difficulty: 'basic',
      tags: [],
      steps: [],
      videoIds: [],
      updatedAt: '2024-01-01',
    });

    it('should filter Terran coaching page to show only Terran build orders', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        createBuildOrder('1', 'terran', 'zerg'),     // ✓
        createBuildOrder('2', 'zerg', 'terran'),     // ✗
        createBuildOrder('3', 'terran', 'protoss'),  // ✓
        createBuildOrder('4', 'protoss', 'terran'),  // ✗
      ];

      const targetRace = 'terran';

      const filtered = buildOrders.filter(bo => {
        const buildOrderRace = bo.race?.toLowerCase() || '';
        return buildOrderRace === targetRace;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].race).toBe('terran');
      expect(filtered[1].race).toBe('terran');
    });

    it('should filter Zerg coaching page to show only Zerg build orders', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        createBuildOrder('1', 'zerg', 'terran'),     // ✓
        createBuildOrder('2', 'terran', 'zerg'),     // ✗
        createBuildOrder('3', 'zerg', 'protoss'),    // ✓
        createBuildOrder('4', 'protoss', 'zerg'),    // ✗
      ];

      const targetRace = 'zerg';

      const filtered = buildOrders.filter(bo => {
        const buildOrderRace = bo.race?.toLowerCase() || '';
        return buildOrderRace === targetRace;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(bo => bo.race === 'zerg')).toBe(true);
    });

    it('should show all build orders for Random coaching page', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        createBuildOrder('1', 'terran', 'zerg'),
        createBuildOrder('2', 'zerg', 'protoss'),
        createBuildOrder('3', 'protoss', 'terran'),
      ];

      const targetRace = 'random';

      const filtered = buildOrders.filter(bo => {
        if (targetRace === 'random') return true;
        const buildOrderRace = bo.race?.toLowerCase() || '';
        return buildOrderRace === targetRace;
      });

      expect(filtered).toHaveLength(3);
    });

    it('should be case-insensitive', () => {
      const buildOrders: Partial<BuildOrder>[] = [
        createBuildOrder('1', 'Terran', 'Zerg'),     // Capitalized
        createBuildOrder('2', 'TERRAN', 'PROTOSS'),  // Uppercase
        createBuildOrder('3', 'terran', 'zerg'),     // Lowercase
      ];

      const targetRace = 'terran'; // Lowercase search

      const filtered = buildOrders.filter(bo => {
        const buildOrderRace = bo.race?.toLowerCase() || '';
        return buildOrderRace === targetRace;
      });

      expect(filtered).toHaveLength(3);
    });
  });

  describe('Video Race Filtering', () => {
    it('should filter videos by race', () => {
      const videos: Partial<Video>[] = [
        { id: '1', title: 'Terran Video', race: 'terran' },
        { id: '2', title: 'Zerg Video', race: 'zerg' },
        { id: '3', title: 'All Races', race: 'all' },
        { id: '4', title: 'Terran Capitalized', race: 'Terran' as any },
      ];

      const targetRace: string = 'terran';

      const filtered = videos.filter(video => {
        if (targetRace === 'random') return true;
        const videoRace = video.race?.toLowerCase() || '';
        return videoRace === targetRace || videoRace === 'all' || videoRace === targetRace.charAt(0).toUpperCase() + targetRace.slice(1);
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      const terranVideos = filtered.filter(v => v.race?.toLowerCase() === 'terran');
      expect(terranVideos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Content Limiting', () => {
    it('should limit results to specified number', () => {
      const allReplays = Array.from({ length: 50 }, (_, i) =>
        createPartialReplay(`replay-${i}`, 'TvZ', 'terran')
      );

      const limit = 12;
      const limited = allReplays.slice(0, limit);

      expect(limited).toHaveLength(12);
      expect(allReplays).toHaveLength(50);
    });

    function createPartialReplay(id: string, matchup: string, winnerRace: string): Partial<Replay> {
      return {
        id,
        matchup: matchup as any,
        player1: { name: 'Winner', race: winnerRace as any, result: 'win' },
        player2: { name: 'Loser', race: 'other' as any, result: 'loss' },
        title: `${matchup} Replay`,
        map: 'Map',
        duration: '10:00',
        gameDate: '2024-01-01',
        uploadDate: '2024-01-02',
        tags: [],
        videoIds: [],
      };
    }
  });
});
