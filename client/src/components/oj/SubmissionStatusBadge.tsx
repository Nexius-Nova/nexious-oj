import { Badge } from '@/components/ui/badge';

const STATUS_MAP = {
  Pending: {
    label: '等待评测',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  Compiling: {
    label: '编译中',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  Running: {
    label: '运行中',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  Accepted: {
    label: '通过',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  'Wrong Answer': {
    label: '答案错误',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  'Time Limit Exceeded': {
    label: '超时',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  'Memory Limit Exceeded': {
    label: '超内存',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  'Runtime Error': {
    label: '运行错误',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  'Compilation Error': {
    label: '编译错误',
    className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  },
  'Presentation Error': {
    label: '格式错误',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  'System Error': {
    label: '系统错误',
    className: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  },
} as const;

interface SubmissionStatusBadgeProps {
  status: string;
}

export function SubmissionStatusBadge({
  status,
}: SubmissionStatusBadgeProps) {
  const config =
    STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP['System Error'];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
