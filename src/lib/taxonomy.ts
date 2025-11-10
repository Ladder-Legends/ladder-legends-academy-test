/**
 * Hierarchical content taxonomy for categorizing content
 * Primary categories can have optional secondary categories
 */

export type PrimaryCategory =
  | 'builds'
  | 'strategy'
  | 'mechanics'
  | 'mindset'
  | 'matchups'
  | 'analysis'
  | 'misc';

export type SecondaryCategory =
  // Builds
  | 'macro'
  | 'timing-attack'
  | 'all-in'
  | 'cheese'
  | 'defensive'
  // Strategy
  | 'early-game'
  | 'mid-game'
  | 'late-game'
  | 'transitions'
  | 'scouting'
  // Mechanics
  | 'macro-mechanics'
  | 'micro'
  | 'multitasking'
  | 'army-control'
  // Mindset
  | 'decision-making'
  | 'tilt-management'
  | 'learning'
  | 'game-sense'
  // Matchups
  | 'tvt'
  | 'tvz'
  | 'tvp'
  | 'zvt'
  | 'zvz'
  | 'zvp'
  | 'pvt'
  | 'pvz'
  | 'pvp'
  // Analysis
  | 'replay-reviews'
  | 'pro-games'
  | 'ladder-games'
  | 'tournament-games'
  // Misc
  | 'tips-tricks'
  | 'maps'
  | 'team-games'
  | 'casual'
  | 'meta-discussion';

export interface CategoryDefinition {
  id: PrimaryCategory;
  label: string;
  secondaryCategories?: {
    id: SecondaryCategory;
    label: string;
  }[];
}

/**
 * Complete taxonomy definition
 */
export const TAXONOMY: CategoryDefinition[] = [
  {
    id: 'builds',
    label: 'Builds',
    secondaryCategories: [
      { id: 'macro', label: 'Macro' },
      { id: 'timing-attack', label: 'Timing Attack' },
      { id: 'all-in', label: 'All-in' },
      { id: 'cheese', label: 'Cheese' },
      { id: 'defensive', label: 'Defensive' },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    secondaryCategories: [
      { id: 'early-game', label: 'Early Game' },
      { id: 'mid-game', label: 'Mid Game' },
      { id: 'late-game', label: 'Late Game' },
      { id: 'transitions', label: 'Transitions' },
      { id: 'scouting', label: 'Scouting' },
    ],
  },
  {
    id: 'mechanics',
    label: 'Mechanics',
    secondaryCategories: [
      { id: 'macro-mechanics', label: 'Macro' },
      { id: 'micro', label: 'Micro' },
      { id: 'multitasking', label: 'Multitasking' },
      { id: 'army-control', label: 'Army Control' },
    ],
  },
  {
    id: 'mindset',
    label: 'Mindset',
    secondaryCategories: [
      { id: 'decision-making', label: 'Decision Making' },
      { id: 'tilt-management', label: 'Tilt Management' },
      { id: 'learning', label: 'Learning' },
      { id: 'game-sense', label: 'Game Sense' },
    ],
  },
  {
    id: 'matchups',
    label: 'Matchups',
    secondaryCategories: [
      { id: 'tvt', label: 'TvT' },
      { id: 'tvz', label: 'TvZ' },
      { id: 'tvp', label: 'TvP' },
      { id: 'zvt', label: 'ZvT' },
      { id: 'zvz', label: 'ZvZ' },
      { id: 'zvp', label: 'ZvP' },
      { id: 'pvt', label: 'PvT' },
      { id: 'pvz', label: 'PvZ' },
      { id: 'pvp', label: 'PvP' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    secondaryCategories: [
      { id: 'replay-reviews', label: 'Replay Reviews' },
      { id: 'pro-games', label: 'Pro Games' },
      { id: 'ladder-games', label: 'Ladder Games' },
      { id: 'tournament-games', label: 'Tournament Games' },
    ],
  },
  {
    id: 'misc',
    label: 'Misc.',
    secondaryCategories: [
      { id: 'tips-tricks', label: 'Tips & Tricks' },
      { id: 'maps', label: 'Maps' },
      { id: 'team-games', label: 'Team Games' },
      { id: 'casual', label: 'Casual' },
      { id: 'meta-discussion', label: 'Meta Discussion' },
    ],
  },
];

/**
 * Helper to get primary category by ID
 */
export function getPrimaryCategory(id: PrimaryCategory): CategoryDefinition | undefined {
  return TAXONOMY.find(cat => cat.id === id);
}

/**
 * Helper to get secondary categories for a primary category
 */
export function getSecondaryCategories(primaryId: PrimaryCategory): { id: SecondaryCategory; label: string }[] {
  const primary = getPrimaryCategory(primaryId);
  return primary?.secondaryCategories || [];
}

/**
 * Helper to validate a category/subcategory pair
 */
export function isValidCategoryPair(
  primaryId?: PrimaryCategory | null,
  secondaryId?: SecondaryCategory | null
): boolean {
  if (!primaryId) return !secondaryId; // If no primary, shouldn't have secondary

  const primary = getPrimaryCategory(primaryId);
  if (!primary) return false;

  if (!secondaryId) return true; // Primary without secondary is valid

  // Check if secondary belongs to this primary
  return primary.secondaryCategories?.some(sec => sec.id === secondaryId) || false;
}

/**
 * Filter option type for use in filter configs
 */
export interface CategoryFilterOption {
  id: string;
  label: string;
  children?: CategoryFilterOption[];
}

/**
 * Convert TAXONOMY into hierarchical filter options
 * Format: primary categories with their secondaries as children
 * IDs use dot notation for secondaries: "primary.secondary"
 */
export function getCategoryFilterOptions(): CategoryFilterOption[] {
  return TAXONOMY.map(primary => ({
    id: primary.id,
    label: primary.label,
    children: primary.secondaryCategories?.map(secondary => ({
      id: `${primary.id}.${secondary.id}`,
      label: secondary.label,
    })) || [],
  }));
}
