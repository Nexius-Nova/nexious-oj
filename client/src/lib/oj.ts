export function formatAcceptance(acceptance?: number) {
  const ratio = Number.isFinite(acceptance) ? Number(acceptance) : 0;
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeCodeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

export interface ProblemForGenerator {
  description?: string;
  input_description?: string;
}

export function generateRandomInput(problem: ProblemForGenerator | null): string {
  if (!problem) return '';

  const desc = (problem.description || '').toLowerCase();
  const inputDesc = (problem.input_description || '').toLowerCase();

  if (desc.includes('数组') || desc.includes('array') || inputDesc.includes('数组')) {
    const n = Math.floor(Math.random() * 10) + 1;
    const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 100));
    return `${n}\n${arr.join(' ')}`;
  }

  if (desc.includes('字符串') || desc.includes('string') || inputDesc.includes('字符串')) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const length = Math.floor(Math.random() * 10) + 1;
    const str = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return str;
  }

  if (desc.includes('树') || desc.includes('tree') || inputDesc.includes('树')) {
    const n = Math.floor(Math.random() * 8) + 1;
    const edges = [];
    for (let i = 1; i < n; i++) {
      const parent = Math.floor(Math.random() * i);
      edges.push(`${parent + 1} ${i + 1}`);
    }
    return `${n}\n${edges.join('\n')}`;
  }

  if (desc.includes('图') || desc.includes('graph') || inputDesc.includes('图')) {
    const n = Math.floor(Math.random() * 5) + 2;
    const m = Math.floor(Math.random() * (n * (n - 1) / 2));
    const edges = [];
    const used = new Set<string>();
    for (let i = 0; i < m; i++) {
      let u, v;
      do {
        u = Math.floor(Math.random() * n) + 1;
        v = Math.floor(Math.random() * n) + 1;
      } while (u === v || used.has(`${Math.min(u, v)}-${Math.max(u, v)}`));
      used.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
      edges.push(`${u} ${v}`);
    }
    return `${n} ${m}\n${edges.join('\n')}`;
  }

  if (inputDesc.includes('两个数') || inputDesc.includes('两个整数') || inputDesc.includes('两个数字')) {
    const a = Math.floor(Math.random() * 100);
    const b = Math.floor(Math.random() * 100);
    return `${a} ${b}`;
  }

  if (inputDesc.includes('一个整数') || inputDesc.includes('一个数')) {
    const num = Math.floor(Math.random() * 100);
    return `${num}`;
  }

  if (inputDesc.includes('n') && inputDesc.includes('m')) {
    const n = Math.floor(Math.random() * 10) + 1;
    const m = Math.floor(Math.random() * 10) + 1;
    return `${n} ${m}`;
  }

  if (inputDesc.includes('n')) {
    const n = Math.floor(Math.random() * 10) + 1;
    return `${n}`;
  }

  const num = Math.floor(Math.random() * 100);
  return `${num}`;
}
