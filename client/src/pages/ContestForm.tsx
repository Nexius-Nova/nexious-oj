import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Wand2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { contestApi, problemApi } from '@/api';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ProblemSelectDialog from '@/components/common/ProblemSelectDialog';
import { toast } from '@/components/common/Toast';

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  order?: number;
}

export default function ContestForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    duration: 180,
    is_public: true,
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadContest();
    }
  }, [id, isEditMode]);

  async function loadContest() {
    try {
      const response = await contestApi.getContest(Number(id));
      const contest = response.data;

      const startTime = new Date(contest.start_time);
      const endTime = new Date(contest.end_time);

      setFormData({
        title: contest.title,
        description: contest.description || '',
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        duration: contest.duration || 180,
        is_public: contest.is_public,
      });

      setProblems(contest.problems || []);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载比赛失败');
    } finally {
      setLoading(false);
    }
  }

  function updateFormField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddProblems(problemIds: number[]) {
    try {
      if (isEditMode && id) {
        for (const problemId of problemIds) {
          await contestApi.addProblem(Number(id), problemId);
        }
      }

      const response = await problemApi.getProblems({ limit: 100 });
      const allProblems = response.data;

      setProblems(prev => {
        const newProblems = [...prev];
        for (const problemId of problemIds) {
          const problem = allProblems.find((p: Problem) => p.id === problemId);
          if (problem && !newProblems.find(p => p.id === problemId)) {
            newProblems.push({ ...problem, order: newProblems.length + 1 });
          }
        }
        return newProblems;
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '添加题目失败');
    }
  }

  async function handleRemoveProblem(problemId: number) {
    try {
      if (isEditMode && id) {
        await contestApi.removeProblem(Number(id), problemId);
      }
      setProblems(problems.filter(p => p.id !== problemId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除题目失败');
    }
  }

  async function moveProblem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    const newProblems = [...problems];
    const [movedProblem] = newProblems.splice(fromIndex, 1);
    newProblems.splice(toIndex, 0, movedProblem);

    setProblems(newProblems);

    if (isEditMode && id) {
      try {
        for (let i = 0; i < newProblems.length; i++) {
          await contestApi.updateProblemOrder(Number(id), newProblems[i].id, i + 1);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || '更新顺序失败');
        loadContest();
      }
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveProblem(draggedIndex, index);
    setDraggedIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
        <div className="text-center text-muted-foreground">请登录后{isEditMode ? '编辑' : '创建'}比赛</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isEditMode && id) {
        await contestApi.updateContest(Number(id), formData);
        navigate(`/contests/${id}`);
      } else {
        const response = await contestApi.createContest(formData);
        const contestId = response.data.id;

        for (let i = 0; i < problems.length; i++) {
          await contestApi.addProblem(contestId, problems[i].id, i + 1);
        }

        navigate(`/contests/${contestId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (isEditMode ? '保存失败' : '创建失败'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEditMode ? `/contests/${id}` : '/contests')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{isEditMode ? '编辑比赛' : '创建比赛'}</h1>
          <p className="text-sm text-muted-foreground">{isEditMode ? '修改比赛信息和题目。' : '创建新的编程比赛。'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">比赛名称</Label>
              <Input
                id="title"
                placeholder="例如：算法竞赛第一场"
                value={formData.title}
                onChange={(e) => updateFormField('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">比赛描述</Label>
              <Textarea
                id="description"
                placeholder={`【比赛规则】
• 比赛时长：3 小时
• 比赛形式：个人赛，ACM 赛制
• 排名规则：按解题数和罚时排名

【奖项设置】
• 一等奖：前 10%
• 二等奖：前 30%
• 三等奖：前 60%`}
                rows={6}
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">参赛开始时间</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => updateFormField('start_time', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">用户可以开始答题的时间</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">参赛截止时间</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => updateFormField('end_time', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">用户最后可以开始答题的时间</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">比赛时长（分钟）</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="720"
                value={formData.duration}
                onChange={(e) => updateFormField('duration', parseInt(e.target.value) || 180)}
                required
              />
              <p className="text-xs text-muted-foreground">
                用户开始答题后，需要在 {formData.duration} 分钟内完成（{Math.floor(formData.duration / 60)} 小时 {formData.duration % 60} 分钟）
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">公开比赛</Label>
                <p className="text-sm text-muted-foreground">公开比赛所有用户可见，私有比赛需要邀请链接</p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => updateFormField('is_public', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>比赛题目</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加题目
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {problems.length > 0 ? (
                problems.map((problem, index) => (
                  <div
                    key={problem.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 rounded-lg border border-border bg-background p-3 cursor-move transition-all ${
                      draggedIndex === index ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1 text-sm font-medium">{problem.title}</span>
                    <span className="text-xs text-muted-foreground">{problem.difficulty}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveProblem(index, index - 1)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === problems.length - 1}
                        onClick={() => moveProblem(index, index + 1)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveProblem(problem.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">
                  暂无题目，点击上方"添加题目"按钮开始添加
                </div>
              )}
            </div>

            {problems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                💡 提示：拖拽题目可调整顺序，或使用上下箭头移动
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-500/10 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(isEditMode ? `/contests/${id}` : '/contests')}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? '保存中...' : '创建中...'}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {isEditMode ? '保存修改' : '创建比赛'}
              </>
            )}
          </Button>
        </div>
      </form>

      <ProblemSelectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleAddProblems}
        existingProblemIds={problems.map(p => p.id)}
      />
    </div>
  );
}
