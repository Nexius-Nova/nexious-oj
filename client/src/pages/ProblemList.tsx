import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Edit3, Filter, Plus, Search, Trash2, X, Lock, Globe, XCircle, Tag as TagIcon, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { problemApi, statsApi, categoryApi } from '@/api';
import { useAuthStore } from '@/store';
import type { ProblemList as ProblemListItem } from '@/types/problem';
import type { ProblemProgress } from '@/api/stats';
import type { Tag } from '@/api/category';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/oj/DifficultyBadge';
import { toast } from '@/components/common/Toast';
import { formatAcceptance } from '@/lib/oj';

export default function ProblemList() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [problemProgress, setProblemProgress] = useState<Map<number, string>>(new Map());
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showAllTags, setShowAllTags] = useState(false);

  const displayTags = showAllTags ? tags : tags.slice(0, 10);

  useEffect(() => {
    void fetchProblems();
  }, [page, difficulty, search, selectedTag]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchProblemProgress();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const tagsData = await categoryApi.getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }

  async function fetchProblemProgress() {
    try {
      const progress = await statsApi.getMyProblemProgress();
      const progressMap = new Map<number, string>();
      progress.forEach((p: ProblemProgress) => {
        progressMap.set(p.problem_id, p.status);
      });
      setProblemProgress(progressMap);
    } catch (error) {
      console.error('Failed to fetch problem progress:', error);
    }
  }

  async function fetchProblems() {
    setLoading(true);
    try {
      const response = await problemApi.getProblems({
        page,
        limit: 20,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        search: search || undefined,
        tag_name: selectedTag || undefined,
      });
      setProblems(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  function handleTagClick(tagName: string) {
    if (selectedTag === tagName) {
      setSelectedTag('');
    } else {
      setSelectedTag(tagName);
    }
    setPage(1);
  }

  async function handleDelete(problemId: number, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!confirm('确定要删除这道题目吗？此操作不可撤销。')) {
      return;
    }

    setDeleting(problemId);
    try {
      await problemApi.deleteProblem(problemId);
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    } finally {
      setDeleting(null);
    }
  }

  function handleEdit(problemId: number, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/problems/${problemId}/edit`);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">题库</h1>
          <p className="text-sm text-muted-foreground">
            浏览所有题目，选择难度并开始编码挑战
          </p>
        </div>
        {isAuthenticated ? (
          <Link to="/problems/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              创建题目
            </Button>
          </Link>
        ) : null}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="搜索题目标题或描述..."
                  className="pl-9 pr-9"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  setDifficulty(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-36">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="lg:w-auto">
                搜索
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                {displayTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTag === tag.name ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedTag === tag.name
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-secondary'
                    }`}
                    style={{
                      borderColor: selectedTag === tag.name ? undefined : tag.color || undefined,
                      color: selectedTag === tag.name ? undefined : tag.color || undefined,
                    }}
                    onClick={() => handleTagClick(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllTags(!showAllTags)}
                  >
                    {showAllTags ? (
                      <>
                        收起 <ChevronUp className="ml-1 h-3 w-3" />
                      </>
                    ) : (
                      <>
                        更多 {tags.length - 10} 个 <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-border shadow-sm">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 border-b border-border py-3 md:grid-cols-[72px_minmax(0,1fr)_120px_120px_120px]"
              >
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : problems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <LayoutGrid className="h-12 w-12 text-[#CBD5E1]" />
          <p className="mt-4 text-sm text-[#94A3B8]">没有找到符合条件的题目</p>
          <p className="text-xs text-[#CBD5E1]">可以换一个关键词，或者清空筛选后重新浏览题库</p>
        </div>
      ) : (
        <Card className="border-border shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                共找到 <span className="text-primary">{problems.length}</span> 道题目
              </p>
              <span className="text-sm text-muted-foreground">
                第 {page} 页 / 共 {totalPages} 页
              </span>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="hidden grid-cols-[40px_72px_minmax(0,1fr)_100px_100px_100px_100px] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>状态</span>
              <span>ID</span>
              <span>标题</span>
              <span>难度</span>
              <span>通过率</span>
              <span>提交数</span>
              <span>操作</span>
            </div>

            {problems.map((problem) => {
              const isCreator = user?.id === problem.creator_id;
              const progressStatus = problemProgress.get(problem.id);
              
              return (
              <Link key={problem.id} to={`/problems/${problem.id}`}>
                <div className="group grid gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-secondary/50 md:grid-cols-[40px_72px_minmax(0,1fr)_100px_100px_100px_100px] md:items-center">
                  <div className="flex items-center">
                    {progressStatus === 'accepted' ? (
                      <span title="已通过">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </span>
                    ) : progressStatus === 'wrong' ? (
                      <span title="未通过">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    #{problem.id}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="truncate font-medium group-hover:text-primary">
                      {problem.title}
                    </p>
                    {problem.is_public ? (
                      <span title="公开题目">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    ) : (
                      <span title="私有题目">
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <div>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatAcceptance(problem.acceptance)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {problem.submission_count}
                  </div>
                  <div className="flex items-center gap-1">
                    {isAuthenticated && isCreator && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => handleEdit(problem.id, e)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(problem.id, e)}
                          disabled={deleting === problem.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            上一页
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
