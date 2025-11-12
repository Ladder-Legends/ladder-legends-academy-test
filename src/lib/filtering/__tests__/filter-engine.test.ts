/**
 * Tests for the core filtering engine
 */

import {
  validateFilterConfig,
  applyFilters,
  countWithFilter,
  createTagPredicate,
  createFieldMatchPredicate,
  createBooleanPredicate,
  createCategoryPredicate,
  sanitizeFilters,
} from '../filter-engine';
import type { FilterFieldConfig, FilterState } from '../types';

// Mock console methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('validateFilterConfig', () => {
  it('should not throw for valid configuration', () => {
    const fields: FilterFieldConfig<unknown>[] = [
      {
        id: 'race',
        predicate: () => true,
      },
    ];

    expect(() => validateFilterConfig(fields)).not.toThrow();
  });

  it('should not throw when urlParam matches id', () => {
    const fields: FilterFieldConfig<unknown>[] = [
      {
        id: 'race',
        urlParam: 'race',
        predicate: () => true,
      },
    ];

    expect(() => validateFilterConfig(fields)).not.toThrow();
  });

  it('should not throw for fields without urlParam', () => {
    const fields: FilterFieldConfig<unknown>[] = [
      {
        id: 'race',
        predicate: () => true,
      },
      {
        id: 'difficulty',
        predicate: () => true,
      },
    ];

    expect(() => validateFilterConfig(fields)).not.toThrow();
  });
});

describe('applyFilters', () => {
  interface TestItem {
    id: string;
    name: string;
    race: string;
    tags: string[];
    isFree: boolean;
  }

  const testItems: TestItem[] = [
    { id: '1', name: 'Terran Build', race: 'terran', tags: ['macro', 'beginner'], isFree: true },
    { id: '2', name: 'Zerg Rush', race: 'zerg', tags: ['timing', 'advanced'], isFree: false },
    { id: '3', name: 'Protoss Defense', race: 'protoss', tags: ['macro', 'defense'], isFree: true },
    { id: '4', name: 'Terran Timing', race: 'terran', tags: ['timing', 'advanced'], isFree: false },
  ];

  it('should return all items when no filters applied', () => {
    const result = applyFilters(testItems, {}, []);
    expect(result).toHaveLength(4);
  });

  it('should filter by search query in name field', () => {
    const result = applyFilters(testItems, {}, [], 'terran', ['name']);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.name.toLowerCase().includes('terran'))).toBe(true);
  });

  it('should filter by search query case-insensitively', () => {
    const result = applyFilters(testItems, {}, [], 'TERRAN', ['name']);
    expect(result).toHaveLength(2);
  });

  it('should filter by multiple search fields', () => {
    const result = applyFilters(testItems, {}, [], 'terran', ['name', 'race']);
    expect(result).toHaveLength(2);
  });

  it('should filter by tags with AND logic', () => {
    const result = applyFilters(testItems, {}, [], undefined, undefined, ['macro', 'beginner']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by tags with partial match', () => {
    const result = applyFilters(testItems, {}, [], undefined, undefined, ['macro']);
    expect(result).toHaveLength(2);
  });

  it('should filter out items without required tags', () => {
    const result = applyFilters(testItems, {}, [], undefined, undefined, ['nonexistent']);
    expect(result).toHaveLength(0);
  });

  it('should apply field predicates', () => {
    const filters: FilterState = { race: 'terran' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'race',
        predicate: (item, filters) => {
          if (!filters.race) return true;
          return item.race === filters.race;
        },
      },
    ];

    const result = applyFilters(testItems, filters, fieldConfigs);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.race === 'terran')).toBe(true);
  });

  it('should skip filters with empty values', () => {
    const filters: FilterState = { race: '' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'race',
        predicate: () => false,
      },
    ];

    const result = applyFilters(testItems, filters, fieldConfigs);
    expect(result).toHaveLength(4);
  });

  it('should skip filters with empty arrays', () => {
    const filters: FilterState = { race: [] };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'race',
        predicate: () => false,
      },
    ];

    const result = applyFilters(testItems, filters, fieldConfigs);
    expect(result).toHaveLength(4);
  });

  it('should combine search and field filters', () => {
    const filters: FilterState = { race: 'terran' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'race',
        predicate: (item, filters) => item.race === filters.race,
      },
    ];

    const result = applyFilters(testItems, filters, fieldConfigs, 'timing', ['name']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });
});

describe('countWithFilter', () => {
  interface TestItem {
    id: string;
    race: string;
    difficulty: string;
    tags: string[];
  }

  const testItems: TestItem[] = [
    { id: '1', race: 'terran', difficulty: 'easy', tags: ['macro'] },
    { id: '2', race: 'terran', difficulty: 'hard', tags: ['timing'] },
    { id: '3', race: 'zerg', difficulty: 'easy', tags: ['macro'] },
    { id: '4', race: 'zerg', difficulty: 'hard', tags: ['timing'] },
  ];

  it('should count items matching the test predicate', () => {
    const testPredicate = (item: TestItem) => item.race === 'terran';
    const count = countWithFilter(testItems, testPredicate, {}, '', []);
    expect(count).toBe(2);
  });

  it('should exclude the specified section from filtering', () => {
    const filters: FilterState = { difficulty: 'easy' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'race',
        predicate: (item, filters) => !filters.race || item.race === filters.race,
      },
      {
        id: 'difficulty',
        predicate: (item, filters) => !filters.difficulty || item.difficulty === filters.difficulty,
      },
    ];

    const testPredicate = (item: TestItem) => item.race === 'terran';

    // When counting race options, exclude race filter but apply difficulty filter
    const count = countWithFilter(
      testItems,
      testPredicate,
      filters,
      'race',
      fieldConfigs
    );

    expect(count).toBe(1); // Only 1 terran with easy difficulty
  });

  it('should apply search query', () => {
    const testPredicate = () => true;
    const count = countWithFilter(
      testItems,
      testPredicate,
      {},
      '',
      [],
      'terran',
      ['race']
    );
    expect(count).toBe(2);
  });

  it('should apply tag filters', () => {
    const testPredicate = () => true;
    const count = countWithFilter(
      testItems,
      testPredicate,
      {},
      '',
      [],
      undefined,
      undefined,
      ['macro']
    );
    expect(count).toBe(2);
  });
});

describe('createTagPredicate', () => {
  interface TestItem {
    tags: string[];
  }

  it('should return true when no filter value', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item: TestItem = { tags: ['macro'] };
    expect(predicate(item, {})).toBe(true);
  });

  it('should match items with any of the selected tags (OR logic)', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item: TestItem = { tags: ['macro', 'beginner'] };

    const filters: FilterState = { tagFilter: ['macro', 'advanced'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should not match items without any selected tags', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item: TestItem = { tags: ['defense'] };

    const filters: FilterState = { tagFilter: ['macro', 'advanced'] };
    expect(predicate(item, filters)).toBe(false);
  });

  it('should handle single tag value', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item: TestItem = { tags: ['macro'] };

    const filters: FilterState = { tagFilter: 'macro' };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should be case-insensitive', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item: TestItem = { tags: ['MACRO'] };

    const filters: FilterState = { tagFilter: ['macro'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should return false for items without tags array', () => {
    const predicate = createTagPredicate<TestItem>('tags', 'tagFilter');
    const item = { tags: null } as unknown as TestItem;

    const filters: FilterState = { tagFilter: ['macro'] };
    expect(predicate(item, filters)).toBe(false);
  });
});

describe('createFieldMatchPredicate', () => {
  interface TestItem {
    race: string;
  }

  it('should return true when no filter value', () => {
    const predicate = createFieldMatchPredicate<TestItem>('race', 'raceFilter');
    const item: TestItem = { race: 'terran' };
    expect(predicate(item, {})).toBe(true);
  });

  it('should match items with any of the selected values (OR logic)', () => {
    const predicate = createFieldMatchPredicate<TestItem>('race', 'raceFilter');
    const item: TestItem = { race: 'terran' };

    const filters: FilterState = { raceFilter: ['terran', 'zerg'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should not match items without selected values', () => {
    const predicate = createFieldMatchPredicate<TestItem>('race', 'raceFilter');
    const item: TestItem = { race: 'protoss' };

    const filters: FilterState = { raceFilter: ['terran', 'zerg'] };
    expect(predicate(item, filters)).toBe(false);
  });

  it('should handle single value', () => {
    const predicate = createFieldMatchPredicate<TestItem>('race', 'raceFilter');
    const item: TestItem = { race: 'terran' };

    const filters: FilterState = { raceFilter: 'terran' };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should be case-insensitive', () => {
    const predicate = createFieldMatchPredicate<TestItem>('race', 'raceFilter');
    const item: TestItem = { race: 'TERRAN' };

    const filters: FilterState = { raceFilter: ['terran'] };
    expect(predicate(item, filters)).toBe(true);
  });
});

describe('createBooleanPredicate', () => {
  interface TestItem {
    isFree: boolean;
  }

  it('should return true when no filter value', () => {
    const predicate = createBooleanPredicate<TestItem>('isFree', 'access', 'free', 'premium');
    const item: TestItem = { isFree: true };
    expect(predicate(item, {})).toBe(true);
  });

  it('should match true values when trueValue selected', () => {
    const predicate = createBooleanPredicate<TestItem>('isFree', 'access', 'free', 'premium');
    const item: TestItem = { isFree: true };

    const filters: FilterState = { access: ['free'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should match false values when falseValue selected', () => {
    const predicate = createBooleanPredicate<TestItem>('isFree', 'access', 'free', 'premium');
    const item: TestItem = { isFree: false };

    const filters: FilterState = { access: ['premium'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should not match opposite values', () => {
    const predicate = createBooleanPredicate<TestItem>('isFree', 'access', 'free', 'premium');
    const item: TestItem = { isFree: true };

    const filters: FilterState = { access: ['premium'] };
    expect(predicate(item, filters)).toBe(false);
  });

  it('should handle both values selected (OR logic)', () => {
    const predicate = createBooleanPredicate<TestItem>('isFree', 'access', 'free', 'premium');
    const item: TestItem = { isFree: true };

    const filters: FilterState = { access: ['free', 'premium'] };
    expect(predicate(item, filters)).toBe(true);
  });
});

describe('createCategoryPredicate', () => {
  interface TestItem {
    categories: string[];
  }

  it('should return true when no filter value', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals'] };
    expect(predicate(item, {})).toBe(true);
  });

  it('should match primary category exactly', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals'] };

    const filters: FilterState = { categoryFilter: ['fundamentals'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should match primary category when item has secondary', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals.macro'] };

    const filters: FilterState = { categoryFilter: ['fundamentals'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should match secondary category exactly', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals.macro'] };

    const filters: FilterState = { categoryFilter: ['fundamentals.macro'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should not match wrong secondary category', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals.macro'] };

    const filters: FilterState = { categoryFilter: ['fundamentals.micro'] };
    expect(predicate(item, filters)).toBe(false);
  });

  it('should return false for items without categories', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: [] };

    const filters: FilterState = { categoryFilter: ['fundamentals'] };
    expect(predicate(item, filters)).toBe(false);
  });

  it('should handle multiple categories (OR logic)', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals'] };

    const filters: FilterState = { categoryFilter: ['fundamentals', 'advanced'] };
    expect(predicate(item, filters)).toBe(true);
  });

  it('should match if item has any matching category', () => {
    const predicate = createCategoryPredicate<TestItem>('categories', 'categoryFilter');
    const item: TestItem = { categories: ['fundamentals.macro', 'advanced.timing'] };

    const filters: FilterState = { categoryFilter: ['fundamentals'] };
    expect(predicate(item, filters)).toBe(true);
  });
});

describe('sanitizeFilters', () => {
  interface TestItem {
    field: string;
  }

  it('should return filters unchanged when no sanitize functions', () => {
    const filters: FilterState = { race: 'terran', difficulty: 'easy' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      { id: 'race', predicate: () => true },
      { id: 'difficulty', predicate: () => true },
    ];

    const result = sanitizeFilters(filters, fieldConfigs, null);
    expect(result).toEqual(filters);
  });

  it('should apply sanitizeValue function when provided', () => {
    const filters: FilterState = { access: 'premium' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'access',
        predicate: () => true,
        sanitizeValue: (value, session) => {
          if (!session) return 'free';
          return value;
        },
      },
    ];

    const result = sanitizeFilters(filters, fieldConfigs, null);
    expect(result.access).toBe('free');
  });

  it('should handle multiple fields with different sanitize functions', () => {
    const filters: FilterState = { access: 'premium', coach: 'coach-1' };
    const fieldConfigs: FilterFieldConfig<TestItem>[] = [
      {
        id: 'access',
        predicate: () => true,
        sanitizeValue: (value, session) => {
          if (!session) return 'free';
          return value;
        },
      },
      {
        id: 'coach',
        predicate: () => true,
        sanitizeValue: (value) => {
          // Keep coach filter as-is
          return value;
        },
      },
    ];

    const result = sanitizeFilters(filters, fieldConfigs, null);
    expect(result.access).toBe('free');
    expect(result.coach).toBe('coach-1');
  });
});
