import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Trophy,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { contestApi, statsApi, submissionApi } from "@/api";
import { useAuthStore } from "@/store";
import type { Contest } from "@/types/contest";
import type { Submission } from "@/types/submission";
import type { DashboardStats, UserStats } from "@/api/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, contestsRes] = await Promise.all([
        statsApi.getDashboardStats(),
        contestApi.getContests({ limit: 3 }),
      ]);
      setDashboardStats(statsRes);
      setContests(contestsRes.data);

      if (isAuthenticated && user) {
        const [submissionsRes, userStatsRes] = await Promise.all([
          submissionApi.getSubmissions({ limit: 5 }),
          statsApi.getUserStats(user.id),
        ]);
        setSubmissions(submissionsRes.data);
        setUserStats(userStatsRes);
      }
    } catch (error) {
      console.error("Failed to fetch home data:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      icon: BookOpen,
      value: dashboardStats?.totalProblems ?? 0,
      label: "题目总数",
      sublabel: "持续更新中",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: CheckCircle2,
      value: dashboardStats?.totalSubmissions ?? 0,
      label: "提交总数",
      sublabel: `通过率 ${dashboardStats?.acceptanceRate ?? 0}%`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Trophy,
      value: dashboardStats?.totalContests ?? 0,
      label: "比赛总数",
      sublabel: "持续更新中",
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      icon: CheckCircle2,
      value: userStats?.solvedProblems ?? 0,
      label: "通过题目",
      sublabel: isAuthenticated ? `个人通过率 ${userStats?.acceptanceRate ?? 0}%` : "登录后查看",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "Wrong Answer":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Time Limit Exceeded":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-sky-500/10 to-amber-500/10 p-8 dark:from-primary/5 dark:via-sky-500/5 dark:to-amber-500/5">
        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] bg-clip-text text-transparent">
                Nexious OJ
              </span>
            </h1>
            <p className="text-xl font-semibold text-foreground">个人在线OJ平台</p>
            <p className="text-sm font-medium text-primary">简洁 · 高效 · 强大</p>
            <p className="text-sm text-muted-foreground">
              专为算法学习和编程竞赛打造的在线评测系统
            </p>
            <div className="flex gap-3 pt-2">
              <Link to="/problems">
                <Button className="bg-[#3B82F6] px-5 hover:bg-[#2563EB]">
                  <Code2 className="mr-2 h-4 w-4" />
                  开始刷题
                </Button>
              </Link>
              <Link to="/contests">
                <Button variant="outline" className="border-border px-5 hover:bg-secondary">
                  <Trophy className="mr-2 h-4 w-4" />
                  创建比赛
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Illustration - CSS only, theme aware */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="flex h-48 w-72 items-center justify-center rounded-xl bg-card/60 shadow-lg backdrop-blur dark:bg-card/40">
                <div className="text-center">
                  <div className="mb-3 flex justify-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="space-y-1.5 text-left font-mono text-xs text-muted-foreground">
                    <div className="text-primary">&lt;/&gt;</div>
                    <div>function solve() {"{"}</div>
                    <div className="pl-4">return &quot;AC&quot;;</div>
                    <div>{"}"}</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="absolute -bottom-3 -left-3 flex h-10 w-10 items-center justify-center rounded-lg bg-card shadow-lg">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-6 w-12" /> : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/70">{stat.sublabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left - Recent Submissions */}
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">最近提交</h3>
              <Link
                to="/submissions"
                className="flex items-center text-xs text-primary hover:underline"
              >
                查看全部
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[60px_1fr_80px_60px_60px_100px] gap-3 px-5 py-3 text-xs text-muted-foreground">
                  <span>状态</span>
                  <span>题目</span>
                  <span>语言</span>
                  <span>耗时</span>
                  <span>内存</span>
                  <span>提交时间</span>
                </div>

                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/problems/${sub.problem_id}`}
                      className="grid grid-cols-[60px_1fr_80px_60px_60px_100px] items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/50"
                    >
                      <span>{getStatusIcon(sub.status)}</span>
                      <span className="truncate text-sm text-primary">
                        {sub.problem_title}
                      </span>
                      <span className="text-xs text-muted-foreground">{sub.language}</span>
                      <span className="text-xs text-muted-foreground">
                        {sub.runtime ? `${sub.runtime} ms` : "--"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sub.memory ? `${sub.memory} MB` : "--"}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {new Date(sub.created_at).toLocaleString("zh-CN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    暂无提交记录
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border px-5 py-3">
              <Link
                to="/submissions"
                className="flex items-center justify-center text-xs text-primary hover:underline"
              >
                查看全部提交
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Right - Upcoming Contests */}
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">即将到来的比赛</h3>
              <Link
                to="/contests"
                className="flex items-center text-xs text-primary hover:underline"
              >
                查看全部
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {contests.length > 0 ? (
                  contests.map((contest) => {
                    const now = new Date();
                    const start = new Date(contest.start_time);
                    const end = new Date(contest.end_time);
                    const isUpcoming = start > now;
                    const isOngoing = start <= now && end > now;

                    return (
                      <Link
                        key={contest.id}
                        to={`/contests/${contest.id}`}
                        className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
                          <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {contest.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(contest.start_time).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                            isOngoing
                              ? "bg-emerald-500/10 text-emerald-500"
                              : isUpcoming
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isOngoing ? "进行中" : isUpcoming ? "即将开始" : "已结束"}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    暂无比赛
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
