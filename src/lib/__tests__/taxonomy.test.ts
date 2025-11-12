/**
 * Tests for taxonomy system
 */

import {
  TAXONOMY,
  getPrimaryCategory,
  getSecondaryCategories,
  isValidCategoryPair,
  isValidCategoryString,
  parseCategoryString,
  getCategoryLabel,
  getCategoryFilterOptions,
  type PrimaryCategory,
  type SecondaryCategory,
} from '../taxonomy';

describe('TAXONOMY', () => {
  it('should have all primary categories', () => {
    const primaryIds = TAXONOMY.map(cat => cat.id);
    expect(primaryIds).toContain('builds');
    expect(primaryIds).toContain('strategy');
    expect(primaryIds).toContain('mechanics');
    expect(primaryIds).toContain('mindset');
    expect(primaryIds).toContain('matchups');
    expect(primaryIds).toContain('analysis');
    expect(primaryIds).toContain('misc');
  });

  it('should have labels for all primary categories', () => {
    TAXONOMY.forEach(category => {
      expect(category.label).toBeTruthy();
      expect(typeof category.label).toBe('string');
    });
  });

  it('should have secondary categories with labels', () => {
    const buildsCategory = TAXONOMY.find(cat => cat.id === 'builds');
    expect(buildsCategory).toBeDefined();
    expect(buildsCategory!.secondaryCategories).toBeDefined();
    expect(buildsCategory!.secondaryCategories!.length).toBeGreaterThan(0);

    buildsCategory!.secondaryCategories!.forEach(secondary => {
      expect(secondary.id).toBeTruthy();
      expect(secondary.label).toBeTruthy();
    });
  });

  it('should have all matchup secondary categories', () => {
    const matchupsCategory = TAXONOMY.find(cat => cat.id === 'matchups');
    const matchupIds = matchupsCategory?.secondaryCategories?.map(s => s.id);

    expect(matchupIds).toContain('tvt');
    expect(matchupIds).toContain('tvz');
    expect(matchupIds).toContain('tvp');
    expect(matchupIds).toContain('zvt');
    expect(matchupIds).toContain('zvz');
    expect(matchupIds).toContain('zvp');
    expect(matchupIds).toContain('pvt');
    expect(matchupIds).toContain('pvz');
    expect(matchupIds).toContain('pvp');
  });
});

describe('getPrimaryCategory', () => {
  it('should return category by id', () => {
    const category = getPrimaryCategory('builds');
    expect(category).toBeDefined();
    expect(category?.id).toBe('builds');
    expect(category?.label).toBe('Builds');
  });

  it('should return undefined for invalid id', () => {
    const category = getPrimaryCategory('invalid' as PrimaryCategory);
    expect(category).toBeUndefined();
  });

  it('should return all valid primary categories', () => {
    expect(getPrimaryCategory('strategy')).toBeDefined();
    expect(getPrimaryCategory('mechanics')).toBeDefined();
    expect(getPrimaryCategory('mindset')).toBeDefined();
    expect(getPrimaryCategory('matchups')).toBeDefined();
    expect(getPrimaryCategory('analysis')).toBeDefined();
    expect(getPrimaryCategory('misc')).toBeDefined();
  });
});

describe('getSecondaryCategories', () => {
  it('should return secondary categories for builds', () => {
    const secondaries = getSecondaryCategories('builds');
    expect(secondaries.length).toBeGreaterThan(0);

    const ids = secondaries.map(s => s.id);
    expect(ids).toContain('macro');
    expect(ids).toContain('timing-attack');
    expect(ids).toContain('all-in');
    expect(ids).toContain('cheese');
    expect(ids).toContain('defensive');
  });

  it('should return secondary categories for strategy', () => {
    const secondaries = getSecondaryCategories('strategy');
    const ids = secondaries.map(s => s.id);

    expect(ids).toContain('early-game');
    expect(ids).toContain('mid-game');
    expect(ids).toContain('late-game');
    expect(ids).toContain('transitions');
    expect(ids).toContain('scouting');
  });

  it('should return empty array for invalid primary category', () => {
    const secondaries = getSecondaryCategories('invalid' as PrimaryCategory);
    expect(secondaries).toEqual([]);
  });

  it('should return secondary categories with labels', () => {
    const secondaries = getSecondaryCategories('mechanics');
    secondaries.forEach(secondary => {
      expect(secondary.id).toBeTruthy();
      expect(secondary.label).toBeTruthy();
      expect(typeof secondary.label).toBe('string');
    });
  });
});

describe('isValidCategoryPair', () => {
  it('should validate primary without secondary', () => {
    expect(isValidCategoryPair('builds', undefined)).toBe(true);
    expect(isValidCategoryPair('strategy', null)).toBe(true);
  });

  it('should validate primary with matching secondary', () => {
    expect(isValidCategoryPair('builds', 'macro')).toBe(true);
    expect(isValidCategoryPair('builds', 'timing-attack')).toBe(true);
    expect(isValidCategoryPair('strategy', 'early-game')).toBe(true);
    expect(isValidCategoryPair('matchups', 'tvz')).toBe(true);
  });

  it('should reject invalid primary', () => {
    expect(isValidCategoryPair('invalid' as PrimaryCategory, undefined)).toBe(false);
  });

  it('should reject mismatched primary-secondary pair', () => {
    expect(isValidCategoryPair('builds', 'early-game' as SecondaryCategory)).toBe(false);
    expect(isValidCategoryPair('strategy', 'macro' as SecondaryCategory)).toBe(false);
    expect(isValidCategoryPair('mindset', 'tvz' as SecondaryCategory)).toBe(false);
  });

  it('should handle no primary with no secondary', () => {
    expect(isValidCategoryPair(undefined, undefined)).toBe(true);
    expect(isValidCategoryPair(null, null)).toBe(true);
  });

  it('should reject secondary without primary', () => {
    expect(isValidCategoryPair(undefined, 'macro')).toBe(false);
    expect(isValidCategoryPair(null, 'timing-attack')).toBe(false);
  });
});

describe('isValidCategoryString', () => {
  it('should validate primary-only category strings', () => {
    expect(isValidCategoryString('builds')).toBe(true);
    expect(isValidCategoryString('strategy')).toBe(true);
    expect(isValidCategoryString('mechanics')).toBe(true);
  });

  it('should validate primary.secondary category strings', () => {
    expect(isValidCategoryString('builds.macro')).toBe(true);
    expect(isValidCategoryString('builds.timing-attack')).toBe(true);
    expect(isValidCategoryString('strategy.early-game')).toBe(true);
    expect(isValidCategoryString('matchups.tvz')).toBe(true);
  });

  it('should reject invalid primary categories', () => {
    expect(isValidCategoryString('invalid')).toBe(false);
    expect(isValidCategoryString('foo.bar')).toBe(false);
  });

  it('should reject invalid secondary categories', () => {
    expect(isValidCategoryString('builds.invalid')).toBe(false);
    expect(isValidCategoryString('strategy.macro')).toBe(false);
  });

  it('should reject malformed category strings', () => {
    expect(isValidCategoryString('builds.macro.extra')).toBe(false);
    expect(isValidCategoryString('')).toBe(false);
    // Note: '.' splits into ['', ''] which doesn't match any category
  });
});

describe('parseCategoryString', () => {
  it('should parse primary-only category string', () => {
    const result = parseCategoryString('builds');
    expect(result).toEqual({ primary: 'builds', secondary: undefined });
  });

  it('should parse primary.secondary category string', () => {
    const result = parseCategoryString('builds.macro');
    expect(result).toEqual({ primary: 'builds', secondary: 'macro' });
  });

  it('should return null for invalid category string', () => {
    expect(parseCategoryString('invalid')).toBeNull();
    expect(parseCategoryString('builds.invalid')).toBeNull();
    expect(parseCategoryString('builds.macro.extra')).toBeNull();
  });

  it('should parse all valid category combinations', () => {
    expect(parseCategoryString('strategy.late-game')).toEqual({
      primary: 'strategy',
      secondary: 'late-game',
    });
    expect(parseCategoryString('matchups.tvz')).toEqual({
      primary: 'matchups',
      secondary: 'tvz',
    });
  });
});

describe('getCategoryLabel', () => {
  it('should return label for primary-only category', () => {
    expect(getCategoryLabel('builds')).toBe('Builds');
    expect(getCategoryLabel('strategy')).toBe('Strategy');
    expect(getCategoryLabel('mechanics')).toBe('Mechanics');
  });

  it('should return hierarchical label for primary.secondary', () => {
    expect(getCategoryLabel('builds.macro')).toBe('Builds > Macro');
    expect(getCategoryLabel('strategy.early-game')).toBe('Strategy > Early Game');
    expect(getCategoryLabel('matchups.tvz')).toBe('Matchups > TvZ');
  });

  it('should return null for invalid category string', () => {
    expect(getCategoryLabel('invalid')).toBeNull();
    expect(getCategoryLabel('builds.invalid')).toBeNull();
  });

  it('should handle all valid categories', () => {
    expect(getCategoryLabel('mindset.tilt-management')).toBe('Mindset > Tilt Management');
    expect(getCategoryLabel('analysis.pro-games')).toBe('Analysis > Pro Games');
    expect(getCategoryLabel('misc.tips-tricks')).toBe('Misc. > Tips & Tricks');
  });
});

describe('getCategoryFilterOptions', () => {
  it('should return hierarchical filter options', () => {
    const options = getCategoryFilterOptions();

    expect(options).toBeDefined();
    expect(options.length).toBe(TAXONOMY.length);
  });

  it('should have correct structure for primary categories', () => {
    const options = getCategoryFilterOptions();
    const buildsOption = options.find(opt => opt.id === 'builds');

    expect(buildsOption).toBeDefined();
    expect(buildsOption!.label).toBe('Builds');
    expect(buildsOption!.children).toBeDefined();
    expect(buildsOption!.children!.length).toBeGreaterThan(0);
  });

  it('should use dot notation for secondary category IDs', () => {
    const options = getCategoryFilterOptions();
    const buildsOption = options.find(opt => opt.id === 'builds');

    const macroChild = buildsOption!.children!.find(c => c.id === 'builds.macro');
    expect(macroChild).toBeDefined();
    expect(macroChild!.label).toBe('Macro');
  });

  it('should include all primary categories', () => {
    const options = getCategoryFilterOptions();
    const ids = options.map(opt => opt.id);

    expect(ids).toContain('builds');
    expect(ids).toContain('strategy');
    expect(ids).toContain('mechanics');
    expect(ids).toContain('mindset');
    expect(ids).toContain('matchups');
    expect(ids).toContain('analysis');
    expect(ids).toContain('misc');
  });

  it('should include all matchup secondary categories', () => {
    const options = getCategoryFilterOptions();
    const matchupsOption = options.find(opt => opt.id === 'matchups');
    const childIds = matchupsOption!.children!.map(c => c.id);

    expect(childIds).toContain('matchups.tvt');
    expect(childIds).toContain('matchups.tvz');
    expect(childIds).toContain('matchups.tvp');
    expect(childIds).toContain('matchups.zvt');
    expect(childIds).toContain('matchups.zvz');
    expect(childIds).toContain('matchups.zvp');
    expect(childIds).toContain('matchups.pvt');
    expect(childIds).toContain('matchups.pvz');
    expect(childIds).toContain('matchups.pvp');
  });

  it('should have empty children array if no secondaries', () => {
    const options = getCategoryFilterOptions();

    // All current categories have secondaries, but test the structure
    options.forEach(option => {
      expect(option.children).toBeDefined();
      expect(Array.isArray(option.children)).toBe(true);
    });
  });
});
