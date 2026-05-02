import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  FileText,
  Globe,
  Mail,
  Save,
  Sparkles,
  Trophy,
  User2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Code2,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAuthStore } from '@/store';
import { authApi, submissionApi, statsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/oj';
import type { Submission } from '@/types/submission';
import type { SubmissionTrend, LanguageDistribution } from '@/api/stats';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bio, setBio] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [submissionTrend, setSubmissionTrend] = useState<SubmissionTrend[]>([]);
  const [languageDistribution, setLanguageDistribution] = useState<LanguageDistribution[]>([]);
  const [userStats, setUserStats] = useState<{ totalSubmissions: number; acceptedSubmissions: number; solvedProblems: number; acceptanceRate: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setBio(user?.bio || '');
    setBaseUrl(user?.ai_base_url || '');
    setAiModel(user?.ai_model || '');
  }, [user?.bio, user?.ai_base_url, user?.ai_model]);

  useEffect(() => {
    if (!user?.id) return;
    void submissionApi
      .getUserSubmissions(user.id, { limit: 10 })
      .then((response) => setSubmissions(response.data))
      .catch((error) => console.error('Failed to fetch user submissions:', error));
    
    void statsApi
      .getMyStats()
      .then((stats) => setUserStats(stats))
      .catch((error) => console.error('Failed to fetch user stats:', error));
    
    void statsApi
      .getMySubmissionTrend(30)
      .then((trend) => setSubmissionTrend(trend))
      .catch((error) => console.error('Failed to fetch submission trend:', error));
    
    void statsApi
      .getMyLanguageDistribution()
      .then((distribution) => setLanguageDistribution(distribution))
      .catch((error) => console.error('Failed to fetch language distribution:', error));
  }, [user?.id]);

  if (!user) return null;

  async function handleSaveProfile() {
    setSaving(true);
    setMessage('');
    try {
      const updatedUser = await authApi.updateProfile({
        bio,
        ai_api_key: apiKey.trim(),
        ai_base_url: baseUrl.trim(),
        ai_model: aiModel.trim(),
      });
      setUser(updatedUser);
      setApiKey('');
      setMessage('个人资料和 AI 配置已保存。');
    } catch (error: any) {
      setMessage(error.response?.data?.message || '保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  }

  const acceptedProblems = new Set(
    submissions.filter((item) => item.status === 'Accepted').map((item) => item.problem_id)
  ).size;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'Wrong Answer':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Time Limit Exceeded':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
          <span className="text-2xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{user.username}</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5" />
              {user.rank}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{userStats?.totalSubmissions ?? submissions.length}</p>
              <p className="text-xs text-muted-foreground">总提交</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Trophy className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{userStats?.solvedProblems ?? acceptedProblems}</p>
              <p className="text-xs text-muted-foreground">通过题目</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{userStats?.acceptanceRate.toFixed(1) ?? 0}%</p>
              <p className="text-xs text-muted-foreground">通过率</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <CalendarDays className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{user.rating}</p>
              <p className="text-xs text-muted-foreground">当前分数</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">提交趋势（近30天）</h3>
            </div>
            <ReactECharts
              option={{
                tooltip: {
                  trigger: 'axis',
                },
                legend: {
                  data: ['总提交', '通过'],
                  bottom: 0,
                },
                grid: {
                  left: '3%',
                  right: '4%',
                  bottom: '15%',
                  containLabel: true,
                },
                xAxis: {
                  type: 'category',
                  boundaryGap: false,
                  data: submissionTrend.map((item) => item.date),
                },
                yAxis: {
                  type: 'value',
                },
                series: [
                  {
                    name: '总提交',
                    type: 'line',
                    data: submissionTrend.map((item) => item.total),
                    smooth: true,
                    lineStyle: { color: '#3B82F6' },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                          { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                        ],
                      },
                    },
                  },
                  {
                    name: '通过',
                    type: 'line',
                    data: submissionTrend.map((item) => item.accepted),
                    smooth: true,
                    lineStyle: { color: '#10B981' },
                    areaStyle: {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                          { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
                        ],
                      },
                    },
                  },
                ],
              }}
              style={{ height: '250px' }}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">语言分布</h3>
            </div>
            <ReactECharts
              option={{
                tooltip: {
                  trigger: 'item',
                  formatter: '{b}: {c} ({d}%)',
                },
                legend: {
                  orient: 'vertical',
                  right: '5%',
                  top: 'center',
                },
                series: [
                  {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['40%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                      borderRadius: 10,
                      borderColor: '#fff',
                      borderWidth: 2,
                    },
                    label: {
                      show: false,
                    },
                    emphasis: {
                      label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                      },
                    },
                    labelLine: {
                      show: false,
                    },
                    data: languageDistribution.map((item, index) => ({
                      value: item.count,
                      name: item.language,
                      itemStyle: {
                        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][index % 6],
                      },
                    })),
                  },
                ],
              }}
              style={{ height: '250px' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left - Settings */}
        <Card className="border-border shadow-none">
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-foreground">个人资料设置</h2>
            <p className="mt-1 text-xs text-muted-foreground">维护简介，以及 AI Key、Base URL 和模型名。</p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm text-foreground">个人简介</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="简单介绍一下自己，或者记录刷题方向。"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="border-border bg-muted text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-sm text-foreground">AI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder={user.has_ai_api_key ? '已保存，输入新值可覆盖' : '输入你的 AI API Key'}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="border-border bg-muted text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url" className="text-sm text-foreground">AI Base URL</Label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="base-url"
                    className="border-border bg-muted pl-9 text-sm"
                    placeholder="例如：https://api.openai.com/v1"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-model" className="text-sm text-foreground">AI Model</Label>
                <div className="relative">
                  <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ai-model"
                    className="border-border bg-muted pl-9 text-sm"
                    placeholder="例如：gpt-4o-mini / deepseek-chat"
                    value={aiModel}
                    onChange={(event) => setAiModel(event.target.value)}
                  />
                </div>
              </div>

              {message && (
                <p className={`text-sm ${message.includes('失败') ? 'text-red-500' : 'text-emerald-500'}`}>
                  {message}
                </p>
              )}

              <Button onClick={handleSaveProfile} disabled={saving} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right - Recent Submissions */}
        <Card className="border-border shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">最近提交</h3>
              <Link to="/submissions" className="text-xs text-primary hover:underline">
                查看全部
              </Link>
            </div>

            <div className="divide-y divide-border">
              {submissions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  还没有提交记录，先去题库试一道题吧。
                </div>
              ) : (
                submissions.map((submission) => (
                  <Link
                    key={submission.id}
                    to={`/problems/${submission.problem_id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(submission.status)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {submission.problem_title ?? `题目 #${submission.problem_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.language} · {formatDateTime(submission.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {submission.test_cases_passed}/{submission.test_cases_total}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
