import { useEffect, useState } from 'react';
import { FileText, Heading, Info, Lightbulb, List, Code, CheckSquare } from 'lucide-react';

interface TOCItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TOC_ITEMS: TOCItem[] = [
  { id: 'title', label: '题目名称', icon: FileText },
  { id: 'description', label: '题目描述', icon: Heading },
  { id: 'input-description', label: '输入描述', icon: Info },
  { id: 'output-description', label: '输出描述', icon: Info },
  { id: 'sample-cases', label: '样例数据', icon: List },
  { id: 'hints', label: '说明提示', icon: Lightbulb },
  { id: 'solution', label: '题解', icon: Code },
  { id: 'test-cases', label: '测试数据', icon: CheckSquare },
];

interface ProblemTOCProps {
  className?: string;
}

export default function ProblemTOC({ className = '' }: ProblemTOCProps) {
  const [activeId, setActiveId] = useState<string>('title');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0% -35% 0%',
      }
    );

    TOC_ITEMS.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`w-48 flex-shrink-0 ${className}`}>
      <div className="sticky top-20">
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          目录导航
        </div>
        <nav className="space-y-0.5">
          {TOC_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
