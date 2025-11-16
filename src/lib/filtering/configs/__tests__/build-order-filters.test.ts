/**
 * Tests for build order filtering configuration
 */
import { buildOrderFilterConfig } from '../build-order-filters';
import type { BuildOrder } from '@/types/build-order';

describe('Build Order Filters', () => {
  describe('Matchup Filter', () => {
    const matchupField = buildOrderFilterConfig.fields.find(f => f.id === 'matchups');

    if (!matchupField) {
      throw new Error('Matchup filter field not found');
    }

    const mockBuildOrders: BuildOrder[] = [
      {
        id: '1',
        name: 'TvT Build',
        race: 'terran',
        vsRace: 'terran',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'matchups.tvt'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '2',
        name: 'TvZ Build',
        race: 'terran',
        vsRace: 'zerg',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'matchups.tvz'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '3',
        name: 'TvP Build',
        race: 'terran',
        vsRace: 'protoss',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'matchups.tvp'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '4',
        name: 'ZvT Build',
        race: 'zerg',
        vsRace: 'terran',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'matchups.zvt'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '5',
        name: 'PvZ Build',
        race: 'protoss',
        vsRace: 'zerg',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'matchups.pvz'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
    ];

    it('should match all builds for a race when parent race is selected', () => {
      // When "terran" is selected, should match all Terran builds
      const filters = { matchups: ['terran'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(3);
      expect(matchedBuilds.map(b => b.id)).toEqual(['1', '2', '3']);
      expect(matchedBuilds.every(b => b.race === 'terran')).toBe(true);
    });

    it('should match only specific matchup when child matchup is selected', () => {
      // When "terran-tvz" is selected, should only match TvZ builds
      const filters = { matchups: ['terran-tvz'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(1);
      expect(matchedBuilds[0].id).toBe('2');
      expect(matchedBuilds[0].vsRace).toBe('zerg');
    });

    it('should match multiple specific matchups when multiple are selected', () => {
      // When both "terran-tvz" and "terran-tvp" are selected
      const filters = { matchups: ['terran-tvz', 'terran-tvp'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(2);
      expect(matchedBuilds.map(b => b.id).sort()).toEqual(['2', '3']);
    });

    it('should match builds when mixing parent and child selections', () => {
      // When "protoss" (all protoss) and "terran-tvt" (specific) are selected
      const filters = { matchups: ['protoss', 'terran-tvt'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(2);
      expect(matchedBuilds.map(b => b.id).sort()).toEqual(['1', '5']);
    });

    it('should match all Zerg builds when "zerg" parent is selected', () => {
      const filters = { matchups: ['zerg'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(1);
      expect(matchedBuilds[0].id).toBe('4');
      expect(matchedBuilds[0].race).toBe('zerg');
    });

    it('should match all Protoss builds when "protoss" parent is selected', () => {
      const filters = { matchups: ['protoss'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(1);
      expect(matchedBuilds[0].id).toBe('5');
      expect(matchedBuilds[0].race).toBe('protoss');
    });

    it('should match all builds when no matchup filter is set', () => {
      const filters = {};

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(5);
    });

    it('should match all builds when matchup filter is empty array', () => {
      const filters = { matchups: [] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(5);
    });

    it('should not match builds from different races', () => {
      const filters = { matchups: ['terran'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        matchupField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds.every(b => b.race !== 'zerg')).toBe(true);
      expect(matchedBuilds.every(b => b.race !== 'protoss')).toBe(true);
    });
  });

  describe('Difficulty Filter', () => {
    const difficultyField = buildOrderFilterConfig.fields.find(f => f.id === 'difficulty');

    if (!difficultyField) {
      throw new Error('Difficulty filter field not found');
    }

    const mockBuildOrders: BuildOrder[] = [
      {
        id: '1',
        name: 'Basic Build',
        race: 'terran',
        vsRace: 'terran',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '2',
        name: 'Intermediate Build',
        race: 'terran',
        vsRace: 'zerg',
        difficulty: 'intermediate',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '3',
        name: 'Expert Build',
        race: 'terran',
        vsRace: 'protoss',
        difficulty: 'expert',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
    ];

    it('should match builds with selected difficulty', () => {
      const filters = { difficulty: ['basic'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        difficultyField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(1);
      expect(matchedBuilds[0].difficulty).toBe('basic');
    });

    it('should match multiple difficulties when multiple are selected', () => {
      const filters = { difficulty: ['basic', 'expert'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        difficultyField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(2);
      expect(matchedBuilds.map(b => b.difficulty).sort()).toEqual(['basic', 'expert']);
    });

    it('should match all builds when no difficulty filter is set', () => {
      const filters = {};

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        difficultyField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(3);
    });
  });

  describe('Category Filter', () => {
    const categoryField = buildOrderFilterConfig.fields.find(f => f.id === 'categories');

    if (!categoryField) {
      throw new Error('Category filter field not found');
    }

    const mockBuildOrders: BuildOrder[] = [
      {
        id: '1',
        name: 'Macro Build',
        race: 'terran',
        vsRace: 'terran',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'builds.macro'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '2',
        name: 'All-in Build',
        race: 'terran',
        vsRace: 'zerg',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['builds', 'builds.all-in'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
      {
        id: '3',
        name: 'Strategy Content',
        race: 'terran',
        vsRace: 'protoss',
        difficulty: 'basic',
        description: 'Test build',
        coach: 'Test Coach',
        coachId: 'test-coach',
        videoIds: [],
        steps: [],
        tags: [],
        categories: ['strategy', 'strategy.early-game'],
        updatedAt: '2025-01-01',
        isFree: true,
      },
    ];

    it('should match all items with primary category when parent is selected', () => {
      const filters = { categories: ['builds'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        categoryField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(2);
      expect(matchedBuilds.map(b => b.id).sort()).toEqual(['1', '2']);
    });

    it('should match specific secondary category when child is selected', () => {
      const filters = { categories: ['builds.macro'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        categoryField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(1);
      expect(matchedBuilds[0].id).toBe('1');
    });

    it('should match items when mixing primary and secondary categories', () => {
      const filters = { categories: ['strategy', 'builds.all-in'] };

      const matchedBuilds = mockBuildOrders.filter(buildOrder =>
        categoryField.predicate(buildOrder, filters)
      );

      expect(matchedBuilds).toHaveLength(2);
      expect(matchedBuilds.map(b => b.id).sort()).toEqual(['2', '3']);
    });
  });
});
