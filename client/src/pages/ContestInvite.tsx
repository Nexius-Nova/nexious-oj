import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Lock, Trophy } from 'lucide-react';
import { contestApi } from '@/api';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/common/Toast';

interface ContestInfo {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  creator_name: string;
  is_public: boolean;
}

export default function ContestInvite() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [contest, setContest] = useState<ContestInfo | null>(null);
  const [error, setError] = useState('');
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;
    void fetchContest();
  }, [inviteCode]);

  async function fetchContest() {
    setLoading(true);
    setError('');
    try {
      const response = await contestApi.getContestByInvite(inviteCode!);
      setContest(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '邀请链接无效或已过期');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (!inviteCode) return;

    setJoining(true);
    try {
      const response = await contestApi.joinByInvite(inviteCode);
      if (response.data.alreadyJoined) {
        setAlreadyJoined(true);
        toast.success('您已参加过此比赛');
      } else {
        toast.success('成功加入比赛');
        navigate(`/contests/${contest?.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '加入比赛失败');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500/50" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={() => navigate('/contests')}>
          返回比赛列表
        </Button>
      </div>
    );
  }

  if (!contest) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{contest.title}</h1>
              <p className="text-sm text-muted-foreground">创建者：{contest.creator_name}</p>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">这是一个私有比赛</span>
            </div>
            <p className="mt-1 text-xs text-amber-600/80">
              您需要加入比赛才能参与答题
            </p>
          </div>

          {contest.description && (
            <p className="mb-6 text-sm text-muted-foreground">
              {contest.description}
            </p>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">比赛时长</p>
              <p className="mt-1 text-sm font-medium">
                {Math.floor(contest.duration / 60)} 小时 {contest.duration % 60} 分钟
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">参赛时间</p>
              <p className="mt-1 text-sm font-medium">
                {new Date(contest.start_time).toLocaleDateString()} - {new Date(contest.end_time).toLocaleDateString()}
              </p>
            </div>
          </div>

          {alreadyJoined ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>您已参加过此比赛</span>
            </div>
          ) : (
            <Button className="w-full" onClick={handleJoin} disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  加入中...
                </>
              ) : (
                '加入比赛'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
