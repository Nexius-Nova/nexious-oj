import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock3,
  Filter,
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';
import { contestApi } from '@/api';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/common/Toast';

interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_public: boolean;
  problem_count?: number;
  creator_id: number;
}

function getContestStatus(startTime: string, endTime: string) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return { label: '即将开始', color: 'bg-primary/10 text-primary' };
  if (now > end) return { label: '已结束', color: 'bg-muted text-muted-foreground' };
  return { label: '进行中', color: 'bg-emerald-500/10 text-emerald-500' };
}

export default function ContestList() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [contests, setContests] = useState<Contest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    void contestApi
      .getContests({
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      .then((response) => setContests(response.data || []))
      .catch((error) => {
        console.error('Failed to fetch contests:', error);
        setContests([]);
      });
  }, [statusFilter]);

  async function handleDelete(id: number, title: string) {
    if (!confirm(`确定要删除比赛"${title}"吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await contestApi.deleteContest(id);
      setContests((prev) => prev.filter((c) => c.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">比赛中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看所有比赛，按状态筛选，快速参与。</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 border-border bg-card text-sm">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部比赛</SelectItem>
              <SelectItem value="ongoing">进行中</SelectItem>
              <SelectItem value="upcoming">即将开始</SelectItem>
              <SelectItem value="ended">已结束</SelectItem>
            </SelectContent>
          </Select>
          {isAuthenticated && (
            <Button onClick={() => navigate('/contests/create')} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              创建比赛
            </Button>
          )}
        </div>
      </div>

      {contests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">暂无符合条件的比赛</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contests.map((contest) => {
            const status = getContestStatus(contest.start_time, contest.end_time);
            return (
              <Card key={contest.id} className="border-border shadow-none transition-colors hover:bg-secondary/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <Link to={`/contests/${contest.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-foreground">{contest.title}</h3>
                        {!contest.is_public && (
                          <span className="flex items-center gap-1 shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            <Lock className="h-3 w-3" />
                            私有
                          </span>
                        )}
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {contest.description || '暂无比赛描述'}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(contest.start_time).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(contest.end_time).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>题目数：{contest.problem_count ?? 0}</span>
                      </div>
                    </div>
                  </Link>

                  {isAuthenticated && user?.id === contest.creator_id && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/contests/${contest.id}/edit`);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(contest.id, contest.title);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
