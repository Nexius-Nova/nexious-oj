import { useState, useEffect } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import { problemApi } from '@/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  tags?: string[];
  acceptance_rate?: number;
  submission_count?: number;
}

interface ProblemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (problemIds: number[]) => void;
  existingProblemIds: number[];
}

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'Easy', label: '简单' },
  { value: 'Medium', label: '中等' },
  { value: 'Hard', label: '困难' },
];

export default function ProblemSelectDialog({
  open,
  onOpenChange,
  onConfirm,
  existingProblemIds,
}: ProblemSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      loadProblems();
      setSelectedIds(new Set());
    }
  }, [open, searchQuery, difficulty]);

  async function loadProblems() {
    setLoading(true);
    try {
      const response = await problemApi.getProblems({
        search: searchQuery || undefined,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        limit: 50,
      });
      const filtered = response.data.filter(
        (p: Problem) => !existingProblemIds.includes(p.id)
      );
      setProblems(filtered);
    } catch (error) {
      console.error('Load problems failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(problemId: number) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(problemId)) {
      newSelected.delete(problemId);
    } else {
      newSelected.add(problemId);
    }
    setSelectedIds(newSelected);
  }

  function handleConfirm() {
    onConfirm(Array.from(selectedIds));
    onOpenChange(false);
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'Hard':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>添加题目</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索题目名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            已选择 {selectedIds.size} 道题目
          </div>

          <ScrollArea className="h-96 rounded-md border border-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : problems.length > 0 ? (
              <div className="divide-y divide-border">
                {problems.map((problem) => {
                  const isSelected = selectedIds.has(problem.id);
                  return (
                    <div
                      key={problem.id}
                      onClick={() => toggleSelect(problem.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-secondary/50'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{problem.id}</span>
                          <span className="text-sm font-medium truncate">{problem.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getDifficultyColor(problem.difficulty)}`}
                          >
                            {problem.difficulty === 'Easy'
                              ? '简单'
                              : problem.difficulty === 'Medium'
                              ? '中等'
                              : '困难'}
                          </Badge>
                          {problem.tags && problem.tags.length > 0 && (
                            <div className="flex gap-1">
                              {problem.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {problem.acceptance_rate !== undefined && (
                        <div className="text-xs text-muted-foreground text-right">
                          <div>通过率</div>
                          <div className="font-medium">{problem.acceptance_rate.toFixed(1)}%</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">未找到可添加的题目</p>
                <p className="text-xs mt-1">请尝试调整搜索条件</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            添加选中题目 ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
