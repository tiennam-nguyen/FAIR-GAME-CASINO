export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonPreference = Season | 'auto';

export interface SeasonMeta {
  id: Season;
  label: string;
  shortLabel: string;
  description: string;
}

export const SEASONS: SeasonMeta[] = [
  { id: 'spring', label: 'Mùa Xuân', shortLabel: 'Xuân', description: 'Tươi, nhẹ và nhiều sức sống' },
  { id: 'summer', label: 'Mùa Hạ', shortLabel: 'Hạ', description: 'Rực rỡ, sáng và năng lượng' },
  { id: 'autumn', label: 'Mùa Thu', shortLabel: 'Thu', description: 'Ấm, dịu và thư thả' },
  { id: 'winter', label: 'Mùa Đông', shortLabel: 'Đông', description: 'Lạnh, sâu và gọn gàng' },
];

export function getAutomaticSeason(date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function resolveSeason(preference: SeasonPreference, date = new Date()): Season {
  return preference === 'auto' ? getAutomaticSeason(date) : preference;
}

export function getSeasonMeta(season: Season): SeasonMeta {
  return SEASONS.find((item) => item.id === season) ?? SEASONS[0];
}
