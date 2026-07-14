export const RELATIONSHIP_GOALS = [
  { id: 'serious', label: 'Serious relationship' },
  { id: 'long_term', label: 'Long-term partner' },
  { id: 'casual', label: 'Casual dating' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'figuring_out', label: 'Still figuring it out' },
] as const

export const LANGUAGES = [
  'Amharic',
  'Tigrinya',
  'Oromo',
  'Somali',
  'English',
  'Arabic',
  'French',
  'Italian',
  'Spanish',
  'German',
] as const

export const CHILDREN_OPTIONS = [
  { id: 'want_someday', label: 'Want someday' },
  { id: 'have_and_want_more', label: 'Have & want more' },
  { id: 'have_and_done', label: 'Have & done' },
  { id: 'not_sure', label: 'Not sure' },
  { id: 'dont_want', label: "Don't want" },
] as const

export const PETS_OPTIONS = [
  { id: 'dog', label: 'Dog' },
  { id: 'cat', label: 'Cat' },
  { id: 'other', label: 'Other pets' },
  { id: 'want_pets', label: 'Want pets' },
  { id: 'no_pets', label: 'No pets' },
  { id: 'allergic', label: 'Allergic' },
] as const

export const DRINKING_OPTIONS = [
  { id: 'never', label: 'Never' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'socially', label: 'Socially' },
  { id: 'regularly', label: 'Regularly' },
] as const

export const SMOKING_OPTIONS = [
  { id: 'never', label: 'Never' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'socially', label: 'Socially' },
  { id: 'regularly', label: 'Regularly' },
] as const

export const PROFILE_PROMPTS = [
  { key: 'favorite_ethiopian_dish', label: "What's your favorite Ethiopian dish?" },
  { key: 'coffee_or_tea', label: 'Coffee or tea?' },
  { key: 'ideal_weekend', label: 'My ideal weekend is...' },
  { key: 'place_to_visit_ethiopia', label: 'A place in Ethiopia I want to visit is...' },
  { key: 'best_concert', label: "The best concert or event I've attended was..." },
  { key: 'love_language', label: 'My love language is...' },
  { key: 'cant_live_without', label: "I can't live without..." },
  { key: 'perfect_sunday', label: 'My perfect Sunday is...' },
  { key: 'way_to_my_heart', label: 'The quickest way to my heart is...' },
  { key: 'two_truths', label: 'Two truths and a lie...' },
  { key: 'overly_competitive', label: "I'm overly competitive about..." },
] as const

export function goalLabel(id?: string | null): string {
  if (!id) return 'Open'
  return RELATIONSHIP_GOALS.find((g) => g.id === id)?.label || id.replaceAll('_', ' ')
}

export function optionLabel(
  options: readonly { id: string; label: string }[],
  id?: string | null,
): string | null {
  if (!id) return null
  return options.find((o) => o.id === id)?.label || id.replaceAll('_', ' ')
}

/** Casual dating locks preferred gender to opposite sex (legacy `dating` behavior). */
export function isCasualGoal(goal?: string | null): boolean {
  return goal === 'casual' || goal === 'dating'
}
