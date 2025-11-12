import { normalizeReplay, normalizeReplays } from '../replay';
import type { Replay } from '../replay';

describe('Replay Normalization', () => {
  describe('normalizeReplay', () => {
    it('should return replay as-is when player1 is already the winner', () => {
      const replay: Replay = {
        id: 'replay-1',
        title: 'Test Replay',
        map: 'Test Map',
        matchup: 'TvZ',
        player1: {
          name: 'Player 1',
          race: 'terran',
          mmr: 5500,
          result: 'win',
        },
        player2: {
          name: 'Player 2',
          race: 'zerg',
          mmr: 5400,
          result: 'loss',
        },
        duration: '12:34',
        gameDate: '2024-01-01',
        uploadDate: '2024-01-02',
        tags: [],
        videoIds: [],
      };

      const normalized = normalizeReplay(replay);
      expect(normalized).toEqual(replay);
      expect(normalized.player1.result).toBe('win');
      expect(normalized.player2.result).toBe('loss');
      expect(normalized.matchup).toBe('TvZ');
    });

    it('should swap players when player2 is the winner', () => {
      const replay: Replay = {
        id: 'replay-2',
        title: 'Test Replay',
        map: 'Test Map',
        matchup: 'TvZ',
        player1: {
          name: 'Player 1',
          race: 'terran',
          mmr: 5400,
          result: 'loss',
        },
        player2: {
          name: 'Player 2',
          race: 'zerg',
          mmr: 5500,
          result: 'win',
        },
        duration: '12:34',
        gameDate: '2024-01-01',
        uploadDate: '2024-01-02',
        tags: [],
        videoIds: [],
      };

      const normalized = normalizeReplay(replay);

      // Players should be swapped
      expect(normalized.player1.name).toBe('Player 2');
      expect(normalized.player1.race).toBe('zerg');
      expect(normalized.player1.mmr).toBe(5500);
      expect(normalized.player1.result).toBe('win');

      expect(normalized.player2.name).toBe('Player 1');
      expect(normalized.player2.race).toBe('terran');
      expect(normalized.player2.mmr).toBe(5400);
      expect(normalized.player2.result).toBe('loss');

      // Matchup should stay the same (already represents winner vs loser)
      expect(normalized.matchup).toBe('TvZ');
    });

    it('should preserve other replay properties when swapping players', () => {
      const replay: Replay = {
        id: 'replay-3',
        title: 'Test Replay',
        description: 'Test description',
        map: 'Test Map',
        matchup: 'PvT',
        player1: {
          name: 'Player 1',
          race: 'protoss',
          mmr: 5400,
          result: 'loss',
        },
        player2: {
          name: 'Player 2',
          race: 'terran',
          mmr: 5500,
          result: 'win',
        },
        duration: '15:20',
        gameDate: '2024-01-01',
        uploadDate: '2024-01-02',
        downloadUrl: 'https://example.com/replay.SC2Replay',
        tags: ['macro', 'mid-game'],
        videoIds: ['video-1', 'video-2'],
        coach: 'Coach Name',
        coachId: 'coach-1',
        patch: '5.0.11',
        notes: 'Test notes',
        isFree: true,
        categories: ['analysis.replay-reviews'],
        difficulty: 'intermediate',
      };

      const normalized = normalizeReplay(replay);

      // All non-player properties should be preserved
      expect(normalized.id).toBe('replay-3');
      expect(normalized.title).toBe('Test Replay');
      expect(normalized.description).toBe('Test description');
      expect(normalized.map).toBe('Test Map');
      expect(normalized.duration).toBe('15:20');
      expect(normalized.gameDate).toBe('2024-01-01');
      expect(normalized.uploadDate).toBe('2024-01-02');
      expect(normalized.downloadUrl).toBe('https://example.com/replay.SC2Replay');
      expect(normalized.tags).toEqual(['macro', 'mid-game']);
      expect(normalized.videoIds).toEqual(['video-1', 'video-2']);
      expect(normalized.coach).toBe('Coach Name');
      expect(normalized.coachId).toBe('coach-1');
      expect(normalized.patch).toBe('5.0.11');
      expect(normalized.notes).toBe('Test notes');
      expect(normalized.isFree).toBe(true);
      expect(normalized.categories).toEqual(['analysis.replay-reviews']);
      expect(normalized.difficulty).toBe('intermediate');
    });

    it('should handle replays with neither player having a win', () => {
      const replay: Replay = {
        id: 'replay-4',
        title: 'Test Replay',
        map: 'Test Map',
        matchup: 'ZvP',
        player1: {
          name: 'Player 1',
          race: 'zerg',
          mmr: 5400,
          result: 'loss',
        },
        player2: {
          name: 'Player 2',
          race: 'protoss',
          mmr: 5500,
          result: 'loss',
        },
        duration: '12:34',
        gameDate: '2024-01-01',
        uploadDate: '2024-01-02',
        tags: [],
        videoIds: [],
      };

      const normalized = normalizeReplay(replay);
      // Should return as-is when neither player won
      expect(normalized).toEqual(replay);
    });
  });

  describe('normalizeReplays', () => {
    it('should normalize an array of replays', () => {
      const replays: Replay[] = [
        {
          id: 'replay-1',
          title: 'Replay 1',
          map: 'Map 1',
          matchup: 'TvZ',
          player1: {
            name: 'Winner',
            race: 'terran',
            mmr: 5500,
            result: 'win',
          },
          player2: {
            name: 'Loser',
            race: 'zerg',
            mmr: 5400,
            result: 'loss',
          },
          duration: '10:00',
          gameDate: '2024-01-01',
          uploadDate: '2024-01-02',
          tags: [],
          videoIds: [],
        },
        {
          id: 'replay-2',
          title: 'Replay 2',
          map: 'Map 2',
          matchup: 'PvT',
          player1: {
            name: 'Loser',
            race: 'protoss',
            mmr: 5300,
            result: 'loss',
          },
          player2: {
            name: 'Winner',
            race: 'terran',
            mmr: 5600,
            result: 'win',
          },
          duration: '15:00',
          gameDate: '2024-01-03',
          uploadDate: '2024-01-04',
          tags: [],
          videoIds: [],
        },
      ];

      const normalized = normalizeReplays(replays);

      expect(normalized).toHaveLength(2);

      // First replay should be unchanged (already normalized)
      expect(normalized[0].player1.name).toBe('Winner');
      expect(normalized[0].player1.result).toBe('win');

      // Second replay should be swapped
      expect(normalized[1].player1.name).toBe('Winner');
      expect(normalized[1].player1.result).toBe('win');
      expect(normalized[1].player2.name).toBe('Loser');
      expect(normalized[1].player2.result).toBe('loss');
    });

    it('should handle empty array', () => {
      const normalized = normalizeReplays([]);
      expect(normalized).toEqual([]);
    });

    it('should not mutate the original array', () => {
      const replays: Replay[] = [
        {
          id: 'replay-1',
          title: 'Test',
          map: 'Test Map',
          matchup: 'TvZ',
          player1: {
            name: 'Loser',
            race: 'terran',
            mmr: 5400,
            result: 'loss',
          },
          player2: {
            name: 'Winner',
            race: 'zerg',
            mmr: 5500,
            result: 'win',
          },
          duration: '10:00',
          gameDate: '2024-01-01',
          uploadDate: '2024-01-02',
          tags: [],
          videoIds: [],
        },
      ];

      const original = JSON.parse(JSON.stringify(replays));
      normalizeReplays(replays);

      // Original should be unchanged
      expect(replays).toEqual(original);
    });
  });
});
