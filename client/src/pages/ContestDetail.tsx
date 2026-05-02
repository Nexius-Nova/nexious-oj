import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock3,
  Eye,
  FileText,
  Link2,
  Lock,
  Play,
  Trophy,
  Unlock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { contestApi } from '@/api';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DifficultyBadge } from '@/components/oj/DifficultyBadge';
import { SubmissionStatusBadge } from '@/components/oj/SubmissionStatusBadge';
import { toast } from '@/components/common/Toast';

interface ContestProblem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
  status?: 'unsubmitted' | 'accepted' | 'rejected';
}

interface ContestDetailData {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  creator_name: string;
  creator_id: number;
  is_public: boolean;
  invite_code: string;
  problems: ContestProblem[];
}

interface ContestSession {
  id: number;
  submitted_at: string | null;
  answers: Array<{
    problem_id: number;
    submission_status: string | null;
  }>;
}

interface Participant {
  id: number;
  username: string;
  joined_at: string;
  started_at: string | null;
  submitted_at: string | null;
  accepted_count: number;
  attempted_count: number;
}

interface ProblemStat {
  id: number;
  title: string;
  order: number;
  total: number;
  accepted: number;
  wrongAnswer: number;
  tle: number;
  rte: number;
  ce: number;
}

interface ContestStatistics {
  problems: ProblemStat[];
  participants: {
    total_participants: number;
    started: number;
    submitted: number;
  };
  languages: Array<{ language: string; count: number }>;
}

function getContestStatus(startTime: string, endTime: string) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return { label: '即将开始', color: 'bg-primary/10 text-primary', canJoin: false, isEnded: false };
  if (now > end) return { label: '已结束', color: 'bg-muted text-muted-foreground', canJoin: false, isEnded: true };
  return { label: '进行中', color: 'bg-emerald-500/10 text-emerald-500', canJoin: true, isEnded: false };
}

function getProblemLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [contest, setContest] = useState<ContestDetailData | null>(null);
  const [session, setSession] = useState<ContestSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [participantSession, setParticipantSession] = useState<any>(null);
  const [statistics, setStatistics] = useState<ContestStatistics | null>(null);

  const isCreator = user?.id === contest?.creator_id;

  useEffect(() => {
    if (!id) return;
    void fetchContest();
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    void fetchSession();
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!id || !isCreator) return;
    void fetchParticipants();
    void fetchStatistics();
  }, [id, isCreator]);

  async function fetchContest() {
    try {
      const response = await contestApi.getContest(Number(id));
      setContest(response.data);
    } catch (err: any) {
      console.error('Failed to fetch contest:', err);
      toast.error(err.response?.data?.message || '获取比赛详情失败');
    }
  }

  async function fetchSession() {
    try {
      const response = await contestApi.getContestSession(Number(id));
      setSession(response.data);
    } catch {
      setSession(null);
    }
  }

  async function fetchParticipants() {
    try {
      const response = await contestApi.getParticipants(Number(id));
      setParticipants(response.data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  }

  async function fetchStatistics() {
    try {
      const response = await contestApi.getStatistics(Number(id));
      setStatistics(response.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }

  async function viewParticipantSession(participant: Participant) {
    try {
      const response = await contestApi.getParticipantSession(Number(id), participant.id);
      setParticipantSession(response.data);
      setSelectedParticipant(participant);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '获取作答记录失败');
    }
  }

  function getProblemStatus(problemId: number): 'unsubmitted' | 'accepted' | 'rejected' | undefined {
    if (!session?.answers) return undefined;
    const answer = session.answers.find((a) => a.problem_id === problemId);
    if (!answer?.submission_status) return answer ? 'unsubmitted' : undefined;
    if (answer.submission_status === 'Accepted') return 'accepted';
    return 'rejected';
  }

  function handleJoinContest() {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    navigate(`/contests/${id}/arena`);
  }

  function handleViewResults() {
    navigate(`/contests/${id}/arena`);
  }

  function copyInviteLink() {
    if (!contest?.invite_code) {
      toast.error('邀请码不存在，请刷新页面重试');
      return;
    }
    const link = `${window.location.origin}/contests/invite/${contest.invite_code}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('邀请链接已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  }

  if (!contest) {
    return (
      <div className="space-y-4">
        <Link to="/contests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          返回比赛列表
        </Link>
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">比赛详情暂不可用</p>
        </div>
      </div>
    );
  }

  const status = getContestStatus(contest.start_time, contest.end_time);
  const hasJoined = session !== null && session.id !== undefined;
  const hasSubmitted = session?.submitted_at != null && session.submitted_at !== '';

  return (
    <div className="space-y-6">
      <Link to="/contests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        返回比赛列表
      </Link>

      <Card className="border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{contest.title}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status.color}`}>
                  {status.label}
                </span>
                {contest.is_public ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Unlock className="h-3 w-3" />
                    公开
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    私有
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{contest.description || '暂无比赛描述'}</p>
            </div>

            <div className="flex items-center gap-2">
              {isCreator && !contest.is_public && (
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  复制邀请链接
                </Button>
              )}
              {status.canJoin ? (
                <>
                  {hasSubmitted ? (
                    <Button variant="outline" onClick={handleViewResults}>
                      <FileText className="mr-2 h-4 w-4" />
                      查看作答记录
                    </Button>
                  ) : hasJoined ? (
                    <Button onClick={handleJoinContest}>
                      <Play className="mr-2 h-4 w-4" />
                      继续答题
                    </Button>
                  ) : (
                    <Button onClick={handleJoinContest}>
                      <Trophy className="mr-2 h-4 w-4" />
                      参加比赛
                    </Button>
                  )}
                </>
              ) : hasSubmitted ? (
                <Button variant="outline" onClick={handleViewResults}>
                  <FileText className="mr-2 h-4 w-4" />
                  查看作答记录
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">参赛开始时间</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {new Date(contest.start_time).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">参赛截止时间</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                {new Date(contest.end_time).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">比赛时长</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                {Math.floor((contest.duration || 180) / 60)} 小时 {(contest.duration || 180) % 60} 分钟
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">创建者</p>
              <p className="mt-1 text-sm font-medium text-foreground">{contest.creator_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">比赛题目</h2>
          </div>
          <div className="divide-y divide-border">
            {contest.problems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                当前比赛还没有配置题目
              </div>
            ) : (
              contest.problems.map((problem, index) => {
                const problemStatus = getProblemStatus(problem.id);
                let statusBg = 'bg-primary/10 text-primary';
                let StatusIcon = null;

                if (problemStatus === 'accepted') {
                  statusBg = 'bg-emerald-500 text-white';
                  StatusIcon = CheckCircle2;
                } else if (problemStatus === 'rejected') {
                  statusBg = 'bg-red-500 text-white';
                  StatusIcon = XCircle;
                } else if (problemStatus === 'unsubmitted') {
                  statusBg = 'bg-amber-500 text-white';
                  StatusIcon = AlertCircle;
                }

                return (
                  <Link
                    key={problem.id}
                    to={`/problems/${problem.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${statusBg}`}>
                        {getProblemLetter(index)}
                      </span>
                      <span className="text-sm font-medium text-foreground">{problem.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DifficultyBadge difficulty={problem.difficulty} />
                      {StatusIcon && <StatusIcon className="h-4 w-4 text-muted-foreground" />}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {isCreator && (
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">参赛人员 ({participants.length})</h2>
              </div>
            </div>
            {participants.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                暂无参赛人员
              </div>
            ) : (
              <div className="divide-y divide-border">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
                        <span className="text-xs font-medium text-white">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{participant.username}</p>
                        <p className="text-xs text-muted-foreground">
                          加入时间：{new Date(participant.joined_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-emerald-500 font-medium">{participant.accepted_count}</span>
                          <span className="text-muted-foreground"> / {participant.attempted_count}</span>
                          <span className="text-xs text-muted-foreground ml-1">题</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.submitted_at ? '已交卷' : participant.started_at ? '答题中' : '未开始'}
                        </p>
                      </div>
                      {participant.started_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewParticipantSession(participant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedParticipant && participantSession && (
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {selectedParticipant.username} 的作答记录
                </h2>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedParticipant(null);
                  setParticipantSession(null);
                }}>
                  关闭
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {contest.problems.map((problem, index) => {
                const answer = participantSession.answers?.find((a: any) => a.problem_id === problem.id);
                const status = answer?.submission_status;
                return (
                  <div key={problem.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                        status === 'Accepted' ? 'bg-emerald-500 text-white' :
                        status ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {getProblemLetter(index)}
                      </span>
                      <span className="text-sm font-medium">{problem.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {status ? (
                        <SubmissionStatusBadge status={status} />
                      ) : (
                        <span className="text-sm text-muted-foreground">未提交</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isCreator && statistics && (
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">比赛统计</h2>
              </div>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">参赛情况</h3>
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'item' },
                    legend: { bottom: 0, left: 'center', textStyle: { fontSize: 11 } },
                    series: [{
                      type: 'pie',
                      radius: ['40%', '65%'],
                      avoidLabelOverlap: false,
                      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
                      label: { show: false },
                      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
                      data: [
                        { value: statistics.participants.started - statistics.participants.submitted, name: '答题中', itemStyle: { color: '#3B82F6' } },
                        { value: statistics.participants.submitted, name: '已交卷', itemStyle: { color: '#10B981' } },
                        { value: statistics.participants.total_participants - statistics.participants.started, name: '未开始', itemStyle: { color: '#6B7280' } },
                      ].filter(d => d.value > 0),
                    }],
                  }}
                  style={{ height: 200 }}
                />
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="text-lg font-semibold">{statistics.participants.total_participants}</p>
                    <p className="text-xs text-muted-foreground">总参与</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="text-lg font-semibold text-blue-500">{statistics.participants.started}</p>
                    <p className="text-xs text-muted-foreground">已开始</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="text-lg font-semibold text-emerald-500">{statistics.participants.submitted}</p>
                    <p className="text-xs text-muted-foreground">已交卷</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">题目通过率</h3>
                {statistics.problems.length > 0 ? (
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                      grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
                      xAxis: { 
                        type: 'category', 
                        data: statistics.problems.map(p => `${String.fromCharCode(65 + p.order - 1)}`),
                        axisLabel: { fontSize: 11 }
                      },
                      yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
                      series: [
                        {
                          name: '提交',
                          type: 'bar',
                          data: statistics.problems.map(p => p.total),
                          itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] },
                        },
                        {
                          name: '通过',
                          type: 'bar',
                          data: statistics.problems.map(p => p.accepted),
                          itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
                        },
                      ],
                    }}
                    style={{ height: 200 }}
                  />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                    暂无题目数据
                  </div>
                )}
              </div>

              {statistics.languages.length > 0 && (
                <div className="lg:col-span-2">
                  <h3 className="mb-3 text-xs font-medium text-muted-foreground">编程语言分布</h3>
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                      grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
                      xAxis: { 
                        type: 'category', 
                        data: statistics.languages.map(l => l.language.toUpperCase()),
                        axisLabel: { fontSize: 11 }
                      },
                      yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
                      series: [{
                        type: 'bar',
                        data: statistics.languages.map(l => l.count),
                        itemStyle: { 
                          color: '#3B82F6', 
                          borderRadius: [4, 4, 0, 0],
                        },
                        label: { show: true, position: 'top', fontSize: 11 },
                      }],
                    }}
                    style={{ height: 160 }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
