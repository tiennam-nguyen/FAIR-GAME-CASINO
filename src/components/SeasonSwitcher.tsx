import { Flower2, Sun, Leaf, Snowflake, WandSparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { resolveSeason, SEASONS, type Season, type SeasonPreference } from '@/lib/season';

const seasonIcons = {
  spring: Flower2,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
} satisfies Record<Season, typeof Flower2>;

interface SeasonSwitcherProps {
  compact?: boolean;
}

export default function SeasonSwitcher({ compact = false }: SeasonSwitcherProps) {
  const { seasonPreference, setSeasonPreference } = useStore();
  const activeSeason = resolveSeason(seasonPreference);

  const options: { id: SeasonPreference; label: string; icon: typeof Flower2 }[] = [
    { id: 'auto', label: 'Tự động', icon: WandSparkles },
    ...SEASONS.map((season) => ({
      id: season.id,
      label: season.shortLabel,
      icon: seasonIcons[season.id],
    })),
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1" aria-label="Chọn mùa giao diện">
        {options.map(({ id, label, icon: Icon }) => {
          const selected = seasonPreference === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSeasonPreference(id)}
              title={label}
              aria-label={`Giao diện ${label}`}
              aria-pressed={selected}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                selected ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Giao diện 4 mùa</p>
        <span className="text-xs text-gray-400">
          Đang dùng {SEASONS.find((season) => season.id === activeSeason)?.label}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {options.map(({ id, label, icon: Icon }) => {
          const selected = seasonPreference === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSeasonPreference(id)}
              aria-pressed={selected}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[11px] font-medium transition ${
                selected
                  ? 'season-soft season-border season-text shadow-sm'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
