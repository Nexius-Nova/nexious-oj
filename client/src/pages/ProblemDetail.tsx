import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock3,
  Copy,
  Edit3,
  FileCode2,
  Globe,
  GripVertical,
  Lightbulb,
  Loader2,
  Lock,
  Maximize2,
  MemoryStick,
  Minimize2,
  Play,
  Send,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { problemApi, submissionApi } from '@/api';
import { useAuthStore, useThemeStore } from '@/store';
import type { Problem } from '@/types/problem';
import type { Submission, SubmissionCaseResult } from '@/types/submission';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { DifficultyBadge } from '@/components/oj/DifficultyBadge';

import { SubmissionStatusBadge } from '@/components/oj/SubmissionStatusBadge';
import { formatDateTime, normalizeCodeOutput, generateRandomInput } from '@/lib/oj';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { toast } from '@/components/common/Toast';

const LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
];

const EDITOR_LANGUAGE_STORAGE_KEY = 'oj-editor-language';

const DEFAULT_CODE: Record<string, string> = {
  c: `#include <stdio.h>

int main(void) {
  char buffer[4096];
  if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
    printf("%s", buffer);
  }
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

tokens = sys.stdin.read().strip().split()

def solve(items):
    return " ".join(items)

print(solve(tokens))`,
};

function getStatusPanelClass(status?: string) {
  switch (status) {
    case 'Accepted':
      return 'border-emerald-200 bg-emerald-50';
    case 'Wrong Answer':
    case 'Compilation Error':
    case 'Runtime Error':
    case 'System Error':
      return 'border-rose-200 bg-rose-50';
    case 'Time Limit Exceeded':
      return 'border-amber-200 bg-amber-50';
    default:
      return 'border-slate-200 bg-slate-50';
  }
}

function renderResultText(result: SubmissionCaseResult) {
  return result.actual_output && result.actual_output.length > 0 ? result.actual_output : '(空输出)';
}

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { theme } = useThemeStore();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(() => localStorage.getItem(EDITOR_LANGUAGE_STORAGE_KEY) || 'cpp');
  const [code, setCode] = useState(() => {
    const savedLanguage = localStorage.getItem(EDITOR_LANGUAGE_STORAGE_KEY) || 'cpp';
    return DEFAULT_CODE[savedLanguage] || DEFAULT_CODE.cpp;
  });
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
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollingSubmissionId, setPollingSubmissionId] = useState<number | null>(null);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(260);
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isConsoleResizing, setIsConsoleResizing] = useState(false);
  const [activeTab, setActiveTab] = useState('statement');
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleResizerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!id) {
      return;
    }
    void fetchProblem(Number(id));
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated || !user?.id) {
      return;
    }
    void fetchSubmissionHistory();
    void fetchCodeDraft();
  }, [id, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!LANGUAGES.some((item) => item.value === language)) {
      localStorage.setItem(EDITOR_LANGUAGE_STORAGE_KEY, 'cpp');
      setLanguage('cpp');
      setCode(DEFAULT_CODE.cpp);
    }
  }, [language]);

  useEffect(() => {
    if (!id || !isAuthenticated || !code) return;
    
    const saveTimeout = setTimeout(() => {
      void saveCodeDraft();
    }, 2000);
    
    return () => clearTimeout(saveTimeout);
  }, [code, language, id, isAuthenticated]);

  useEffect(() => {
    if (!pollingSubmissionId) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const latest = await submissionApi.getSubmission(pollingSubmissionId);
        setSubmissionResult(latest);

        if (!['Pending', 'Compiling', 'Running'].includes(latest.status)) {
          window.clearInterval(timer);
          setPollingSubmissionId(null);
          setSubmitting(false);
          await fetchSubmissionHistory();
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          void handleSubmit();
        } else if (e.key === 's') {
          e.preventDefault();
          void saveCodeDraft();
          toast.success('代码已保存');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, language, problem]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const minWidth = 350;
    const maxWidth = containerRect.width - 500;
    
    setLeftPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleConsoleMouseMove = useCallback((e: MouseEvent) => {
    if (!isConsoleResizing) return;
    
    const container = consoleResizerRef.current?.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    const minHeight = 120;
    const maxHeight = 500;
    
    setConsoleHeight(Math.min(Math.max(newHeight, minHeight), maxHeight));
  }, [isConsoleResizing]);

  const handleConsoleMouseUp = useCallback(() => {
    setIsConsoleResizing(false);
  }, []);

  useEffect(() => {
    if (isConsoleResizing) {
      document.addEventListener('mousemove', handleConsoleMouseMove);
      document.addEventListener('mouseup', handleConsoleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleConsoleMouseMove);
      document.removeEventListener('mouseup', handleConsoleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleConsoleMouseMove);
      document.removeEventListener('mouseup', handleConsoleMouseUp);
    };
  }, [isConsoleResizing, handleConsoleMouseMove, handleConsoleMouseUp]);

  async function fetchProblem(problemId: number) {
    setLoading(true);
    try {
      const data = await problemApi.getProblem(problemId);
      setProblem(data);
      const defaultSample =
        data.sample_cases && data.sample_cases.length > 0
          ? data.sample_cases[0]
          : { input: data.sample_input || '', output: data.sample_output || '' };
      setTestInput(defaultSample.input || '');
      setTestExpected(defaultSample.output || '');
    } catch (error) {
      console.error('Failed to fetch problem:', error);
      setProblem(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubmissionHistory() {
    if (!user?.id || !id) {
      return;
    }

    try {
      const response = await submissionApi.getSubmissions({
        user_id: user.id,
        problem_id: Number(id),
        limit: 10,
      });
      setSubmissions(response.data);
    } catch (error) {
      console.error('Failed to fetch submission history:', error);
    }
  }

  function ensureCppHeaders(codeStr: string, lang: string): string {
    if (lang !== 'cpp' && lang !== 'c') return codeStr;

    const requiredHeaders: Record<string, string[]> = {
      cpp: ['<iostream>', '<cstdio>', '<string>', '<vector>', '<algorithm>'],
      c: ['<stdio.h>', '<stdlib.h>', '<string.h>'],
    };

    const headers = requiredHeaders[lang] || [];
    const existingIncludes: string[] = [];
    const lines = codeStr.split('\n');
    const nonIncludeLines: string[] = [];
    let hasUsingNamespaceStd = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#include')) {
        existingIncludes.push(trimmed);
      } else if (trimmed === 'using namespace std;') {
        hasUsingNamespaceStd = true;
      } else {
        nonIncludeLines.push(line);
      }
    }

    const missingHeaders = headers.filter((h) => !existingIncludes.some((inc) => inc.includes(h)));

    if (missingHeaders.length === 0 && (lang === 'c' || hasUsingNamespaceStd)) {
      return codeStr;
    }

    const newIncludeLines = missingHeaders.map((h) => `#include ${h}`);
    const allIncludes = [...existingIncludes, ...newIncludeLines];

    let newCode = allIncludes.join('\n') + '\n';
    if (lang === 'cpp' && !hasUsingNamespaceStd) {
      newCode += '\nusing namespace std;\n';
    }
    newCode += nonIncludeLines.join('\n');

    return newCode;
  }

  async function fetchCodeDraft() {
    if (!id) return;
    
    try {
      const draft = await problemApi.getCodeDraft(Number(id));
      if (draft) {
        const fixedCode = ensureCppHeaders(draft.code, draft.language);
        setCode(fixedCode);
        setLanguage(draft.language);
        localStorage.setItem(EDITOR_LANGUAGE_STORAGE_KEY, draft.language);
      }
    } catch (error) {
      console.error('Failed to fetch code draft:', error);
    }
  }

  async function saveCodeDraft() {
    if (!id || !code.trim()) return;
    
    try {
      await problemApi.saveCodeDraft(Number(id), { code, language });
    } catch (error) {
      console.error('Failed to save code draft:', error);
    }
  }

  async function handleRunCode() {
    if (!problem || !code.trim()) {
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
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
    if (!problem || !code.trim()) {
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const response = await submissionApi.submitCode({
        problem_id: problem.id,
        language,
        code,
      });

      const latest = await submissionApi.getSubmission(response.id);
      setSubmissionResult(latest);
      setActiveTab('result');

      if (['Pending', 'Compiling', 'Running'].includes(response.status)) {
        setPollingSubmissionId(response.id);
      } else {
        setSubmitting(false);
        await fetchSubmissionHistory();
      }
    } catch (error: any) {
      setSubmissionResult({
        id: 0,
        user_id: user?.id ?? 0,
        problem_id: problem.id,
        language,
        code,
        status: 'System Error',
        runtime: 0,
        memory: 0,
        test_cases_passed: 0,
        test_cases_total: 0,
        error_message: error.response?.data?.message || '提交失败，请稍后再试。',
        created_at: new Date().toISOString(),
        results: [],
      });
      setSubmitting(false);
    }
  }

  async function handleSelectSubmission(submissionId: number) {
    try {
      const detail = await submissionApi.getSubmission(submissionId);
      setSubmissionResult(detail);
      setActiveTab('result');
    } catch (error) {
      console.error('Failed to load submission detail:', error);
    }
  }

  async function handleGenerateAiAnalysis() {
    if (!problem) {
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLoadingAiAnalysis(true);
    try {
      const analysis = await problemApi.generateAiAnalysis(problem.id);
      setAiAnalysis(analysis);
    } catch (error: any) {
      setAiAnalysis(error.response?.data?.message || 'AI 解析生成失败，请先检查个人中心的 API 配置。');
    } finally {
      setLoadingAiAnalysis(false);
    }
  }

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

  const summaryStats = useMemo(() => {
    if (!problem) {
      return [];
    }

    return [
      { icon: Clock3, label: '时间限制', value: `${problem.time_limit} ms` },
      { icon: MemoryStick, label: '内存限制', value: `${problem.memory_limit} MB` },
      { icon: FileCode2, label: '通过数', value: `${problem.accepted_count}` },
      { icon: Send, label: '提交数', value: `${problem.submission_count}` },
    ];
  }, [problem]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-[#CBD5E1]" />
        <p className="mt-4 text-sm text-[#94A3B8]">题目不存在</p>
        <p className="text-xs text-[#CBD5E1]">这个题目可能未发布或已经被删除</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="h-8 w-fit gap-2 px-0" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
            返回
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">
              #{problem.id} {problem.title}
            </h1>
            <DifficultyBadge difficulty={problem.difficulty} />
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
        </div>

        <div className="flex items-center gap-2">
          {user?.id === problem.creator_id && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => navigate(`/problems/${problem.id}/edit`)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              编辑
            </Button>
          )}
          {summaryStats.map((item) => (
            <div
              key={item.label}
              className="hidden items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground lg:inline-flex"
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        <div 
          className="flex flex-col border-r border-border bg-card"
          style={{ width: isFullscreen ? 0 : leftPanelWidth, minWidth: isFullscreen ? 0 : leftPanelWidth }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <TabsList className="grid h-8 grid-cols-4 gap-1">
                <TabsTrigger className="px-3 text-xs" value="statement">题面</TabsTrigger>
                <TabsTrigger className="px-3 text-xs" value="solution">题解</TabsTrigger>
                <TabsTrigger className="px-3 text-xs" value="result">结果</TabsTrigger>
                <TabsTrigger className="px-3 text-xs" value="history">提交</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className="min-h-0 flex-1">
              <TabsContent value="statement" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-6 p-5">
                    <section className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">题目描述</h3>
                      <MarkdownRenderer content={problem.description || ''} className="text-foreground/90" />
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">输入描述</h3>
                      <MarkdownRenderer content={problem.input_description || '暂无输入描述。'} className="text-sm text-foreground/85" />
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground">输出描述</h3>
                      <MarkdownRenderer content={problem.output_description || '暂无输出描述。'} className="text-sm text-foreground/85" />
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-base font-semibold text-foreground">输入 / 输出样例</h3>
                      {sampleCases.length > 0 ? (
                        sampleCases.map((sampleCase, index) => (
                          <div key={index} className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">样例 {index + 1}</p>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">输入</p>
                                <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-sm">
                                  {sampleCase.input || '(空输入)'}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">输出</p>
                                <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-sm">
                                  {sampleCase.output || '(空输出)'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">当前没有样例。</p>
                      )}
                    </section>

                    {problem.hints ? (
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">说明 / 提示</h3>
                        <MarkdownRenderer content={problem.hints} className="text-sm text-muted-foreground" />
                      </section>
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="solution" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-5 p-5">
                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">官方题解</Label>
                        <Button variant="outline" size="sm" onClick={handleGenerateAiAnalysis} disabled={loadingAiAnalysis}>
                          {loadingAiAnalysis ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              生成中
                            </>
                          ) : (
                            <>
                              <Lightbulb className="mr-2 h-4 w-4" />
                              AI 解析
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-4">
                        <MarkdownRenderer content={problem.solution || '当前还没有官方题解。'} className="text-sm text-muted-foreground" />
                      </div>
                    </section>

                    <section className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI 解析</Label>
                      <div className="rounded-lg border border-border bg-background p-4">
                        <MarkdownRenderer content={aiAnalysis || '点击上方按钮后，这里会生成 AI 辅助解析。'} className="text-sm text-muted-foreground" />
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="result" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-5">
                    {!submissionResult ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <FileCode2 className="h-10 w-10 text-[#CBD5E1]" />
                        <p className="mt-3 text-sm text-[#94A3B8]">还没有查看中的提交</p>
                        <p className="text-xs text-[#CBD5E1]">提交代码后，这里会显示状态、耗时、代码和测试点明细</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`rounded-lg border p-4 ${getStatusPanelClass(submissionResult.status)}`}>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">本次提交</p>
                              <p className="text-sm text-muted-foreground">
                                {submissionResult.test_cases_passed}/{submissionResult.test_cases_total} 个测试点
                              </p>
                            </div>
                            <SubmissionStatusBadge status={submissionResult.status} />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground">运行时间</p>
                            <p className="mt-1 text-xl font-semibold">{submissionResult.runtime ?? 0} ms</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground">内存</p>
                            <p className="mt-1 text-xl font-semibold">{submissionResult.memory ?? 0} KB</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground">语言</p>
                            <p className="mt-1 text-xl font-semibold">{submissionResult.language}</p>
                          </div>
                        </div>

                        <section className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">提交代码</Label>
                          <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-[#111827] p-4 text-xs text-slate-100">
                            {submissionResult.code || '(无代码)'}
                          </pre>
                        </section>

                        {submissionResult.error_message ? (
                          <div className="rounded-lg border border-border bg-background px-4 py-4 text-sm text-foreground/80">
                            {submissionResult.error_message}
                          </div>
                        ) : null}

                        {submissionResult.results?.length ? (
                          <div className="space-y-3">
                            {submissionResult.results.map((result) => (
                              <div key={result.id} className="rounded-lg border border-border bg-background px-4 py-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium">测试点 #{result.order || result.test_case_id}</p>
                                    <p className="text-sm text-muted-foreground">{result.runtime} ms</p>
                                  </div>
                                  <SubmissionStatusBadge status={result.status} />
                                </div>

                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">输入</p>
                                    <pre className="max-h-36 overflow-auto rounded-md bg-secondary p-3 text-xs">
                                      {result.input || '(空输入)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">期望输出</p>
                                    <pre className="max-h-36 overflow-auto rounded-md bg-secondary p-3 text-xs">
                                      {result.expected_output || '(空输出)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">实际输出</p>
                                    <pre className="max-h-36 overflow-auto rounded-md bg-secondary p-3 text-xs">
                                      {renderResultText(result)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-3 p-5">
                    {!isAuthenticated ? (
                      <p className="text-sm text-muted-foreground">登录后可查看本题历史提交。</p>
                    ) : submissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂时还没有提交记录。</p>
                    ) : (
                      submissions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full flex-col gap-3 rounded-lg border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-secondary"
                          onClick={() => handleSelectSubmission(item.id)}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">提交 #{item.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.language} · {formatDateTime(item.created_at)}
                              </p>
                            </div>
                            <SubmissionStatusBadge status={item.status} />
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>{item.test_cases_passed}/{item.test_cases_total} 个测试点</span>
                            <span>{item.runtime ?? 0} ms</span>
                            <span className="text-foreground">点击可查看代码</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {!isFullscreen && (
          <div
            className="group flex w-1 cursor-col-resize items-center justify-center bg-border hover:bg-primary/20"
            onMouseDown={() => setIsResizing(true)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">代码编辑器</span>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  setCode(DEFAULT_CODE[value] || '');
                  localStorage.setItem(EDITOR_LANGUAGE_STORAGE_KEY, value);
                }}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
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
              <Button size="sm" onClick={handleSubmit} disabled={running || submitting}>
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
        </div>
      </div>
    </div>
  );
}
