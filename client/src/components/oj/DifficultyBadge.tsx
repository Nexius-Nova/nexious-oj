import { Badge } from '@/components/ui/badge';

const DIFFICULTY_MAP = {
  easy: {
    label: '简单',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  medium: {
    label: '中等',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  hard: {
    label: '困难',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
} as const;

interface DifficultyBadgeProps {
  difficulty: string;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config =
    DIFFICULTY_MAP[difficulty as keyof typeof DIFFICULTY_MAP] ??
    DIFFICULTY_MAP.medium;

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
