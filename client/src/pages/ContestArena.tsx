import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Clock3,
  Copy,
  Loader2,
  LogOut,
  Play,
  Send,
  Shuffle,
  Trash2,
  Trophy,
} from 'lucide-react';
import { contestApi, problemApi, submissionApi } from '@/api';
import { useAuthStore, useThemeStore } from '@/store';
import type { Problem } from '@/types/problem';
import type { Submission } from '@/types/submission';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DifficultyBadge } from '@/components/oj/DifficultyBadge';
import { SubmissionStatusBadge } from '@/components/oj/SubmissionStatusBadge';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { toast } from '@/components/common/Toast';
import { normalizeCodeOutput, generateRandomInput } from '@/lib/oj';

const LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
];

const DEFAULT_CODE: Record<string, string> = {
  c: `#include <stdio.h>

int main(void) {
  return 0;
}`,
  cpp: `#include <iostream>
#include <cstdio>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
  // 你的代码
  return 0;
}`,
  python: `import sys

def solve():
    pass

if __name__ == "__main__":
    solve()`,
};

interface ContestProblem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
}

interface ContestSession {
  id: number;
  contest_id: number;
  user_id: number;
  started_at: string;
  submitted_at: string | null;
  contest: {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    duration: number;
    problems: ContestProblem[];
  };
  answers: Array<{
    id: number;
    problem_id: number;
    code: string;
    language: string;
    submission_id: number | null;
    submission_status: string | null;
  }>;
}

function getProblemLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function ContestArena() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ContestSession | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pollingSubmissionId, setPollingSubmissionId] = useState<number | null>(null);

  const [running, setRunning] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testExpected, setTestExpected] = useState('');
  const [testResult, setTestResult] = useState<{
    status: string;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    runtime: number;
    errorMessage?: string;
  } | null>(null);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(260);
  const [isConsoleResizing, setIsConsoleResizing] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  const consoleResizerRef = useRef<HTMLDivElement>(null);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const currentProblem = useMemo(() => {
    if (!session?.contest.problems) return null;
    return session.contest.problems[currentProblemIndex];
  }, [session, currentProblemIndex]);

  const problemStatuses = useMemo(() => {
    if (!session?.answers) return new Map<number, string>();
    const statusMap = new Map<number, string>();
    session.answers.forEach((answer) => {
      if (answer.submission_status === 'Accepted') {
        statusMap.set(answer.problem_id, 'accepted');
      } else if (answer.submission_status) {
        statusMap.set(answer.problem_id, 'rejected');
      } else if (answer.code) {
        statusMap.set(answer.problem_id, 'unsubmitted');
      }
    });
    return statusMap;
  }, [session]);

  useEffect(() => {
    if (!id || !isAuthenticated) {
      navigate('/auth');
      return;
    }
    void initSession();
  }, [id, isAuthenticated]);

  async function initSession() {
    setLoading(true);
    try {
      const response = await contestApi.getContestSession(Number(id));
      if (response.data && response.data.id) {
        setSession(response.data);
      } else {
        try {
          const startResponse = await contestApi.startContest(Number(id));
          setSession(startResponse.data);
        } catch (startError: any) {
          const message = startError.response?.data?.message || '无法参加比赛';
          toast.error(message);
          navigate(`/contests/${id}`);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '无法参加比赛';
      toast.error(message);
      navigate(`/contests/${id}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;

    const startedAt = new Date(session.started_at).getTime();
    const durationMs = (session.contest.duration || 180) * 60 * 1000;
    const deadline = startedAt + durationMs;

    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemainingTime(remaining);

      if (remaining === 0) {
        void handleFinishContest();
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (currentProblem) {
      void fetchProblem(currentProblem.id);
      const savedAnswer = session?.answers.find((a) => a.problem_id === currentProblem.id);
      if (savedAnswer) {
        setCode(savedAnswer.code);
        setLanguage(savedAnswer.language);
      } else {
        setCode(DEFAULT_CODE[language]);
      }
      setSubmissionResult(null);
    }
  }, [currentProblem]);

  useEffect(() => {
    if (!pollingSubmissionId) return;

    const timer = window.setInterval(async () => {
      try {
        const latest = await submissionApi.getSubmission(pollingSubmissionId);
        setSubmissionResult(latest);

        if (!['Pending', 'Compiling', 'Running'].includes(latest.status)) {
          window.clearInterval(timer);
          setPollingSubmissionId(null);
          setSubmitting(false);
          void refreshSession();
        }
      } catch (error) {
        console.error('Failed to poll submission:', error);
        window.clearInterval(timer);
        setPollingSubmissionId(null);
        setSubmitting(false);
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [pollingSubmissionId]);

  const handleConsoleMouseMove = useCallback((e: MouseEvent) => {
    if (!isConsoleResizing) return;
    const container = consoleResizerRef.current?.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    const minHeight = 120;
    const maxHeight = containerRect.height - 200;
    setConsoleHeight(Math.min(Math.max(newHeight, minHeight), maxHeight));
  }, [isConsoleResizing]);

  const handleConsoleMouseUp = useCallback(() => {
    setIsConsoleResizing(false);
  }, []);

  useEffect(() => {
    if (isConsoleResizing) {
      document.addEventListener('mousemove', handleConsoleMouseMove);
      document.addEventListener('mouseup', handleConsoleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleConsoleMouseMove);
      document.removeEventListener('mouseup', handleConsoleMouseUp);
    };
  }, [isConsoleResizing, handleConsoleMouseMove, handleConsoleMouseUp]);

  async function refreshSession() {
    try {
      const response = await contestApi.getContestSession(Number(id));
      setSession(response.data);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }

  async function fetchProblem(problemId: number) {
    try {
      const data = await problemApi.getProblem(problemId);
      setProblem(data);
    } catch (error) {
      console.error('Failed to fetch problem:', error);
      setProblem(null);
    }
  }

  async function handleSaveAnswer() {
    if (!currentProblem || !code.trim()) return;

    try {
      await contestApi.saveAnswer(Number(id), {
        problemId: currentProblem.id,
        code,
        language,
      });
    } catch (error: any) {
      console.error('Failed to save answer:', error);
    }
  }

  const sampleCases = useMemo(() => {
    if (!problem) {
      return [];
    }

    if (problem.sample_cases && problem.sample_cases.length > 0) {
      return problem.sample_cases;
    }

    if (problem.sample_input || problem.sample_output) {
      return [{ input: problem.sample_input || '', output: problem.sample_output || '' }];
    }

    return [];
  }, [problem]);

  function handleSelectSample(index: number) {
    if (sampleCases[index]) {
      setTestInput(sampleCases[index].input || '');
      setTestExpected(sampleCases[index].output || '');
      setSelectedSampleIndex(index);
    }
  }

  async function handleGenerateRandomInput() {
    if (!problem) return;

    if (!problem.generator_code) {
      const randomInput = generateRandomInput(problem);
      setTestInput(randomInput);
      setTestExpected('');
      setSelectedSampleIndex(-1);
      return;
    }

    setGeneratingRandom(true);
    try {
      const result = await problemApi.runGenerator(problem.id);
      setTestInput(result.input);
      setTestExpected(result.output || '');
      setSelectedSampleIndex(-1);
    } catch (error: any) {
      console.error('运行生成器失败:', error);
      toast.error(error.response?.data?.message || '运行生成器失败');
      const randomInput = generateRandomInput(problem);
      setTestInput(randomInput);
      setTestExpected('');
      setSelectedSampleIndex(-1);
    } finally {
      setGeneratingRandom(false);
    }
  }

  function handleClearInput() {
    setTestInput('');
    setTestExpected('');
    setSelectedSampleIndex(-1);
  }

  function handleCopyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  async function handleRunCode() {
    if (!problem || !code.trim()) {
      toast.error('请编写代码后再运行');
      return;
    }

    setRunning(true);
    setTestResult(null);
    setConsoleTab('output');
    if (consoleCollapsed) {
      setConsoleCollapsed(false);
    }
    try {
      const result = await problemApi.runCode(problem.id, {
        code,
        language,
        input: testInput,
        expected_output: testExpected,
      });
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        status: 'System Error',
        input: testInput,
        expectedOutput: testExpected,
        actualOutput: '',
        runtime: 0,
        errorMessage: error.response?.data?.message || '运行失败，请稍后再试。',
      });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!currentProblem || !code.trim()) {
      toast.error('请编写代码后再提交');
      return;
    }

    setSubmitting(true);
    try {
      await handleSaveAnswer();

      const response = await contestApi.submitAnswer(Number(id), {
        problemId: currentProblem.id,
        code,
        language,
      });

      if (response.data.submissionId) {
        const latest = await submissionApi.getSubmission(response.data.submissionId);
        setSubmissionResult(latest);

        if (['Pending', 'Compiling', 'Running'].includes(latest.status)) {
          setPollingSubmissionId(response.data.submissionId);
        } else {
          setSubmitting(false);
          void refreshSession();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '提交失败');
      setSubmitting(false);
    }
  }

  function handleFinishContest() {
    setShowFinishDialog(true);
  }

  async function confirmFinishContest() {
    setShowFinishDialog(false);
    try {
      await handleSaveAnswer();
      await contestApi.finishContest(Number(id));
      toast.success('比赛已结束，答案已提交');
      navigate(`/contests/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '提交失败');
    }
  }

  function handleProblemSwitch(index: number) {
    void handleSaveAnswer();
    setCurrentProblemIndex(index);
  }

  function handleLanguageChange(newLang: string) {
    const savedAnswer = session?.answers.find((a) => a.problem_id === currentProblem?.id);
    if (!savedAnswer || !savedAnswer.code) {
      setCode(DEFAULT_CODE[newLang]);
    }
    setLanguage(newLang);
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">无法加载比赛</p>
        <Button variant="outline" onClick={() => navigate(`/contests/${id}`)}>
          返回比赛详情
        </Button>
      </div>
    );
  }

  const isSubmitted = session.submitted_at != null && session.submitted_at !== '';

  if (isSubmitted) {
    return (
      <div className="flex h-screen w-full flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="h-8 w-fit gap-2 px-0"
              onClick={() => navigate(`/contests/${id}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              返回比赛详情
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-semibold">{session.contest.title}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">比赛已结束</div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Card className="border-border shadow-none">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold">作答记录</h2>
              <div className="space-y-4">
                {session.contest.problems.map((p, index) => {
                  const answer = session.answers.find((a) => a.problem_id === p.id);
                  const status = answer?.submission_status;
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                          status === 'Accepted' ? 'bg-emerald-500 text-white' :
                          status ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {getProblemLetter(index)}
                        </span>
                        <div>
                          <p className="font-medium">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {answer?.language || '未作答'}
                          </p>
                        </div>
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
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">无法加载题目</p>
        <Button variant="outline" onClick={() => navigate(`/contests/${id}`)}>
          返回比赛详情
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="h-8 w-fit gap-2 px-0"
            onClick={() => {
              void handleSaveAnswer();
              navigate(`/contests/${id}`);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            退出比赛
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-semibold">{session.contest.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${remainingTime < 300 ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
            <Clock3 className="h-4 w-4" />
            <span className="font-mono font-medium">{formatTime(remainingTime)}</span>
          </div>
          <Button variant="destructive" onClick={handleFinishContest}>
            <LogOut className="mr-2 h-4 w-4" />
            交卷
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-12 flex-col items-center gap-1 border-r border-border bg-card py-3">
          {session.contest.problems.map((p, index) => {
            const status = problemStatuses.get(p.id);
            let bgClass = 'bg-muted hover:bg-muted/80';
            if (status === 'accepted') {
              bgClass = 'bg-emerald-500 text-white';
            } else if (status === 'rejected') {
              bgClass = 'bg-red-500 text-white';
            } else if (status === 'unsubmitted') {
              bgClass = 'bg-amber-500 text-white';
            }

            return (
              <button
                key={p.id}
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  index === currentProblemIndex ? 'ring-2 ring-primary ring-offset-2' : ''
                } ${bgClass}`}
                onClick={() => handleProblemSwitch(index)}
              >
                {getProblemLetter(index)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-[400px] flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {getProblemLetter(currentProblemIndex)}. {problem.title}
                </span>
                <DifficultyBadge difficulty={problem.difficulty} />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">题目描述</h3>
                  <MarkdownRenderer content={problem.description || ''} className="text-sm text-muted-foreground" />
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">输入描述</h3>
                  <MarkdownRenderer content={problem.input_description || '暂无'} className="text-sm text-muted-foreground" />
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">输出描述</h3>
                  <MarkdownRenderer content={problem.output_description || '暂无'} className="text-sm text-muted-foreground" />
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">样例</h3>
                  {sampleCases.length > 0 ? (
                    sampleCases.map((sample, index) => (
                      <div key={index} className="space-y-2">
                        <p className="text-xs text-muted-foreground">样例 {index + 1}</p>
                        <div className="grid gap-2">
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">输入</p>
                            <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-xs">
                              {sample.input || '(空)'}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">输出</p>
                            <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-xs">
                              {sample.output || '(空)'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无样例</p>
                  )}
                </section>

                {problem.hints && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">提示</h3>
                    <MarkdownRenderer content={problem.hints} className="text-sm text-muted-foreground" />
                  </section>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">代码编辑器</span>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRunCode} disabled={running || submitting}>
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      运行中
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      运行
                    </>
                  )}
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || running}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交中
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      提交
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={language}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 22,
                  automaticLayout: true,
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>

            <div
              ref={consoleResizerRef}
              className={`flex flex-col border-t border-border bg-card ${consoleCollapsed ? 'h-10' : ''}`}
              style={{ height: consoleCollapsed ? 40 : consoleHeight }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">控制台</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setConsoleCollapsed((value) => !value)}
                  >
                    {consoleCollapsed ? (
                      <>
                        <ChevronUp className="mr-1 h-3 w-3" />
                        展开
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-3 w-3" />
                        收起
                      </>
                    )}
                  </Button>
                </div>

                {!consoleCollapsed && (
                  <Tabs value={consoleTab} onValueChange={setConsoleTab} className="w-full max-w-xs">
                    <TabsList className="h-7 w-full">
                      <TabsTrigger value="testcase" className="text-xs">测试用例</TabsTrigger>
                      <TabsTrigger value="output" className="text-xs">输出结果</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {!consoleCollapsed && (
                <>
                  <div
                    className="h-1 cursor-row-resize bg-border hover:bg-primary/20"
                    onMouseDown={() => setIsConsoleResizing(true)}
                  />

                  <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex-1 overflow-hidden">
                    <TabsContent value="testcase" className="m-0 h-full">
                      <div className="flex h-full flex-col">
                        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                          {sampleCases.length > 0 && (
                            <Select
                              value={selectedSampleIndex.toString()}
                              onValueChange={(value) => handleSelectSample(Number(value))}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sampleCases.map((_, index) => (
                                  <SelectItem key={index} value={index.toString()}>
                                    样例 {index + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-muted-foreground"
                            onClick={handleGenerateRandomInput}
                            disabled={generatingRandom}
                            title={problem?.generator_code ? "使用题目生成器随机生成测试输入" : "根据题目描述随机生成测试输入"}
                          >
                            {generatingRandom ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                生成中
                              </>
                            ) : (
                              <>
                                <Shuffle className="h-3 w-3" />
                                随机
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-muted-foreground"
                            onClick={handleClearInput}
                          >
                            <Trash2 className="h-3 w-3" />
                            清空
                          </Button>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="grid h-full gap-3 p-3 lg:grid-cols-2">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">输入</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleCopyToClipboard(testInput)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={testInput}
                                onChange={(event) => setTestInput(event.target.value)}
                                placeholder="输入测试数据"
                                className="min-h-[120px] resize-none border-border bg-background text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">期望输出</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleCopyToClipboard(testExpected)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={testExpected}
                                onChange={(event) => setTestExpected(event.target.value)}
                                placeholder="预期输出（可选）"
                                className="min-h-[120px] resize-none border-border bg-background text-xs"
                              />
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="output" className="m-0 h-full">
                      <ScrollArea className="h-full">
                        <div className="space-y-3 p-3">
                          {testResult ? (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <SubmissionStatusBadge status={testResult.status} />
                                  <span className="text-xs text-muted-foreground">{testResult.runtime} ms</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleCopyToClipboard(testResult.actualOutput || '')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>

                              <div>
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">实际输出</p>
                                <pre className="max-h-28 overflow-auto rounded-md bg-background border border-border p-2.5 text-xs">
                                  {testResult.actualOutput || '(空输出)'}
                                </pre>
                              </div>

                              {normalizeCodeOutput(testResult.actualOutput) !==
                              normalizeCodeOutput(testResult.expectedOutput) ? (
                                <div className="grid gap-2 lg:grid-cols-2">
                                  <div>
                                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">期望输出</p>
                                    <pre className="max-h-20 overflow-auto rounded-md bg-background border border-border p-2.5 text-xs">
                                      {testResult.expectedOutput || '(空输出)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">输入</p>
                                    <pre className="max-h-20 overflow-auto rounded-md bg-background border border-border p-2.5 text-xs">
                                      {testResult.input || '(空输入)'}
                                    </pre>
                                  </div>
                                </div>
                              ) : null}

                              {testResult.errorMessage ? (
                                <div className="rounded-md border border-border bg-background p-2.5 text-xs text-foreground/80">
                                  {testResult.errorMessage}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-xs text-muted-foreground">
                              填写输入后点击"运行"，查看输出结果
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>

            {submissionResult && (
              <div className="border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SubmissionStatusBadge status={submissionResult.status} />
                    <span className="text-sm text-muted-foreground">
                      {submissionResult.test_cases_passed}/{submissionResult.test_cases_total} 测试点
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {submissionResult.runtime ?? 0} ms
                    </span>
                  </div>
                </div>
                {submissionResult.error_message && (
                  <div className="mt-2 rounded-md bg-red-500/10 p-2 text-xs text-red-500">
                    {submissionResult.error_message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认交卷</AlertDialogTitle>
            <AlertDialogDescription>
              确定要交卷吗？交卷后将无法继续修改答案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinishContest}>确认交卷</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
