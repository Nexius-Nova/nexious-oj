import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Wand2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { problemApi, categoryApi } from '@/api';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import RichTextEditor from '@/components/common/RichTextEditor';
import ProblemTOC from '@/components/common/ProblemTOC';
import { toast } from '@/components/common/Toast';
import type { Tag } from '@/api/category';

interface TestCase {
  id?: number;
  input: string;
  output: string;
}

interface SampleCase {
  input: string;
  output: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'python', label: 'Python' },
];

const DEFAULT_GENERATOR_CODE: Record<string, string> = {
  cpp: `#include <iostream>
#include <cstdlib>
#include <ctime>

using namespace std;

int main() {
    const char* seed_env = getenv("NEXIOUS_SEED");
    unsigned int seed = seed_env ? (unsigned int)atoi(seed_env) : (unsigned int)time(NULL);
    srand(seed);

    int a = rand() % 100 + 1;
    int b = rand() % 100 + 1;
    cout << a << " " << b << endl;
    return 0;
}`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main() {
    const char* seed_env = getenv("NEXIOUS_SEED");
    unsigned int seed = seed_env ? (unsigned int)atoi(seed_env) : (unsigned int)time(NULL);
    srand(seed);

    int a = rand() % 100 + 1;
    int b = rand() % 100 + 1;
    printf("%d %d\\n", a, b);
    return 0;
}`,
  python: `import random

def generate():
    a = random.randint(1, 100)
    b = random.randint(1, 100)
    return f"{a} {b}"`,
};

const DEFAULT_SOLUTION_CODE: Record<string, string> = {
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
  c: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`,
  python: `import sys

def main():
    line = sys.stdin.readline().strip()
    a, b = map(int, line.split())
    print(a + b)

if __name__ == "__main__":
    main()`,
};

const PLACEHOLDERS = {
  description: `【题目描述】
给定一个长度为 N 的数组 A，求数组中所有元素的和。
`,
  input_description: `第一行输入两个整数 N 和 M，表示矩阵的行数和列数。
接下来 N 行，每行输入 M 个整数，表示矩阵中的元素。

数据范围：
• 1 ≤ N, M ≤ 1000
• -10⁹ ≤ 矩阵元素 ≤ 10⁹`,
  output_description: `输出一个整数，表示计算结果。
如果有多组解，输出其中任意一组即可。
答案保证在 64 位整数范围内。`,
  hints: `【评测用例规模与约定】
对于 20% 的评测用例，1 ≤ N ≤ 10。
对于 50% 的评测用例，1 ≤ N ≤ 10³。
对于 100% 的评测用例，1 ≤ N ≤ 10⁵。

【提示】
可以使用前缀和优化计算，时间复杂度 O(N)。
注意边界条件的处理。`,
  solution: `【解题思路】
本题可以使用贪心算法解决。

1. 首先对数组进行排序
2. 从左到右遍历，维护当前最优解
3. 时间复杂度 O(N log N)，空间复杂度 O(1)

【参考代码】
\`\`\`cpp
#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    // 实现代码
    return 0;
}
\`\`\``,
  sample_input: `5
1 2 3 4 5`,
  sample_output: `15`,
};

export default function ProblemForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    input_description: '',
    output_description: '',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    sample_input: '',
    sample_output: '',
    hints: '',
    solution: '',
    is_public: true,
  });

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '' }]);
  const [sampleCases, setSampleCases] = useState<SampleCase[]>([{ input: '', output: '' }]);
  const [generatorLanguage, setGeneratorLanguage] = useState('cpp');
  const [generatorCode, setGeneratorCode] = useState(DEFAULT_GENERATOR_CODE.cpp);
  const [solutionLanguage, setSolutionLanguage] = useState('cpp');
  const [solutionCode, setSolutionCode] = useState(DEFAULT_SOLUTION_CODE.cpp);
  const [generateCount, setGenerateCount] = useState(20);

  useEffect(() => {
    if (isEditMode && id) {
      fetchProblem(Number(id));
    }
  }, [id, isEditMode]);

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

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    
    setCreatingTag(true);
    try {
      const tag = await categoryApi.createTag({
        name: newTagName.trim(),
        slug: newTagName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      });
      setTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag.id]);
      setNewTagName('');
      toast.success('标签创建成功');
    } catch (error) {
      toast.error('创建标签失败');
    } finally {
      setCreatingTag(false);
    }
  }

  async function fetchProblem(problemId: number) {
    setLoading(true);
    try {
      const problem = await problemApi.getProblem(problemId);

      setFormData({
        title: problem.title,
        description: problem.description || '',
        input_description: problem.input_description || '',
        output_description: problem.output_description || '',
        difficulty: problem.difficulty,
        time_limit: problem.time_limit,
        memory_limit: problem.memory_limit,
        sample_input: problem.sample_input || '',
        sample_output: problem.sample_output || '',
        hints: problem.hints || '',
        solution: problem.solution || '',
        is_public: problem.is_public ?? true,
      });

      if (problem.sample_cases && problem.sample_cases.length > 0) {
        setSampleCases(problem.sample_cases);
      }

      if (problem.generator_code) {
        setGeneratorCode(problem.generator_code);
        setGeneratorLanguage(problem.generator_language || 'cpp');
      }

      if (problem.solution_code) {
        setSolutionCode(problem.solution_code);
        setSolutionLanguage(problem.solution_language || 'cpp');
      }

      try {
        const problemTags = await categoryApi.getProblemTags(problemId);
        setSelectedTags(problemTags.map((t) => t.id));
      } catch (error) {
        console.error('Failed to fetch problem tags:', error);
      }

      const testCasesData = await problemApi.getTestCases(problemId);
      if (testCasesData && testCasesData.length > 0) {
        setTestCases(testCasesData.map((tc: any) => ({
          id: tc.id,
          input: tc.input,
          output: tc.expected_output,
        })));
      } else {
        setTestCases([{ input: '', output: '' }]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '加载题目失败');
    } finally {
      setLoading(false);
    }
  }

  function updateFormField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleGeneratorLanguageChange(lang: string) {
    setGeneratorLanguage(lang);
    setGeneratorCode(DEFAULT_GENERATOR_CODE[lang] || '');
  }

  function handleSolutionLanguageChange(lang: string) {
    setSolutionLanguage(lang);
    setSolutionCode(DEFAULT_SOLUTION_CODE[lang] || '');
  }

  async function handleGenerateAiGenerator() {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (
      !formData.title ||
      !formData.description ||
      !formData.input_description ||
      !formData.output_description
    ) {
      toast.error('请先补全题目名称、题目描述、输入描述和输出描述。');
      return;
    }

    setAiGenerating(true);
    try {
      const result = await problemApi.generateAiGenerator({
        title: formData.title,
        description: formData.description,
        input_description: formData.input_description,
        output_description: formData.output_description,
        sample_cases: sampleCases.filter((item) => item.input && item.output),
        hints: formData.hints,
        solution: formData.solution,
        preferred_language: generatorLanguage,
      });

      setGeneratorCode(result.generator_code);
      setGeneratorLanguage(result.generator_language);
      setSolutionCode(result.solution_code);
      setSolutionLanguage(result.solution_language);

      if (result.self_check?.issues && result.self_check.issues.length > 0) {
        toast.info(`AI 自检发现问题：${result.self_check.issues.join('、')}`);
      } else {
        toast.success('AI 已生成生成器和标准解代码，请检查并预览测试用例');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'AI 生成失败';
      if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        toast.error('AI 生成超时，请稍后重试。AI 生成代码可能需要 1-3 分钟，请耐心等待。');
      } else if (errorMessage.includes('API Key')) {
        toast.error('请先在个人中心设置 AI API Key');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleGenerateTestCases() {
    if (!generatorCode || !solutionCode) {
      toast.error('请先填写生成器代码和标准解代码。');
      return;
    }

    setPreviewing(true);
    try {
      const response = await problemApi.previewTestCases({
        generator_code: generatorCode,
        generator_language: generatorLanguage,
        solution: solutionCode,
        solution_language: solutionLanguage,
        count: generateCount,
      });

      if (response.success) {
        setTestCases(response.data.map((tc: { input: string; output: string }) => ({ input: tc.input, output: tc.output })));
        toast.success(`已生成 ${response.data.length} 组测试数据`);
        setShowPreviewDialog(true);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '生成测试数据失败';
      if (errorMessage.includes('输出数据过大') || errorMessage.includes('超过')) {
        toast.error('生成的测试数据过大。请检查生成器代码，确保生成的数据规模合理（单组数据不超过 1MB）。可能需要减少生成的元素数量或缩小数据范围。');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setSaving(true);

    try {
      const validTestCases = testCases.filter((tc) => tc.input && tc.output);
      if (validTestCases.length === 0) {
        toast.error('请至少添加一组真实测试数据。');
        setSaving(false);
        return;
      }

      if (validTestCases.length > 100) {
        toast.error('测试数据最多支持 100 组。');
        setSaving(false);
        return;
      }

      if (isEditMode && id) {
        await problemApi.updateProblem(Number(id), {
          title: formData.title,
          description: formData.description,
          input_description: formData.input_description,
          output_description: formData.output_description,
          difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
          time_limit: formData.time_limit,
          memory_limit: formData.memory_limit,
          sample_input: sampleCases[0]?.input || '',
          sample_output: sampleCases[0]?.output || '',
          sample_cases: sampleCases.filter((item) => item.input && item.output),
          hints: formData.hints || undefined,
          solution: formData.solution || undefined,
          generator_code: generatorCode || undefined,
          generator_language: generatorLanguage,
          solution_code: solutionCode || undefined,
          solution_language: solutionLanguage,
          is_public: formData.is_public,
          tag_ids: selectedTags,
        });

        await problemApi.batchAddTestCases(Number(id), validTestCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.output,
        })));

        navigate(`/problems/${id}`);
      } else {
        const problemData = {
          title: formData.title,
          slug: formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: formData.description,
          input_description: formData.input_description,
          output_description: formData.output_description,
          difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
          time_limit: formData.time_limit,
          memory_limit: formData.memory_limit,
          sample_input: sampleCases[0]?.input || '',
          sample_output: sampleCases[0]?.output || '',
          sample_cases: sampleCases.filter((item) => item.input && item.output),
          hints: formData.hints || undefined,
          solution: formData.solution || undefined,
          generator_code: generatorCode || undefined,
          generator_language: generatorLanguage,
          solution_code: solutionCode || undefined,
          solution_language: solutionLanguage,
          is_public: formData.is_public,
          tag_ids: selectedTags,
          test_cases: validTestCases.map((tc, index) => ({
            input: tc.input,
            expected_output: tc.output,
            is_sample: false,
            order: index + 1,
          })),
        };

        await problemApi.createProblem(problemData);
        navigate('/problems');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isEditMode ? '保存失败。' : '创建失败。'));
    } finally {
      setSaving(false);
    }
  }

  function addTestCase() {
    setTestCases((prev) => [...prev, { input: '', output: '' }]);
  }

  function addSampleCase() {
    setSampleCases((prev) => [...prev, { input: '', output: '' }]);
  }

  function removeSampleCase(index: number) {
    setSampleCases((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSampleCase(index: number, field: keyof SampleCase, value: string) {
    setSampleCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeTestCase(index: number) {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTestCase(index: number, field: keyof TestCase, value: string) {
    setTestCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
        <div className="text-center text-muted-foreground">请登录后{isEditMode ? '编辑' : '创建'}题目</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 py-6">
      <ProblemTOC className="hidden lg:block" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{isEditMode ? '编辑题目' : '创建题目'}</h1>
            <p className="text-sm text-muted-foreground">按标准 OJ 建题流程填写题面、限制和真实测试数据。</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div id="title" className="space-y-2">
                <Label htmlFor="title-input">题目名称</Label>
                <Input
                  id="title-input"
                  placeholder="例如：两数之和"
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  required
                />
              </div>

              <div id="description" className="space-y-2">
                <Label htmlFor="description">题目描述</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => updateFormField('description', value)}
                  placeholder={PLACEHOLDERS.description}
                />
              </div>

              <div id="input-description" className="space-y-2">
                <Label htmlFor="input_description">输入描述</Label>
                <RichTextEditor
                  value={formData.input_description}
                  onChange={(value) => updateFormField('input_description', value)}
                  placeholder={PLACEHOLDERS.input_description}
                />
              </div>

              <div id="output-description" className="space-y-2">
                <Label htmlFor="output_description">输出描述</Label>
                <RichTextEditor
                  value={formData.output_description}
                  onChange={(value) => updateFormField('output_description', value)}
                  placeholder={PLACEHOLDERS.output_description}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">难度</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => updateFormField('difficulty', value)}>
                    <SelectTrigger id="difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_limit">时间限制 (ms)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={formData.time_limit}
                    onChange={(e) => updateFormField('time_limit', parseInt(e.target.value, 10) || 1000)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory_limit">内存限制 (MB)</Label>
                  <Input
                    id="memory_limit"
                    type="number"
                    value={formData.memory_limit}
                    onChange={(e) => updateFormField('memory_limit', parseInt(e.target.value, 10) || 256)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => updateFormField('is_public', checked)}
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                  {formData.is_public ? '公开题目（所有用户可见）' : '私有题目（仅自己可见）'}
                </Label>
              </div>

              <div className="space-y-2">
                  <Label>标签</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border border-border p-3 min-h-[42px]">
                    {selectedTags.length === 0 && (
                      <span className="text-sm text-muted-foreground">点击下方标签添加</span>
                    )}
                    {selectedTags.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <Badge
                          key={tagId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setSelectedTags(selectedTags.filter((id) => id !== tagId))}
                        >
                          {tag.name}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.filter((t) => !selectedTags.includes(t.id)).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setSelectedTags([...selectedTags, tag.id])}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="或输入新标签名称"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={creatingTag || !newTagName.trim()}
                    >
                      {creatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle>样例、说明与题解</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="sample-cases" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>输入 / 输出样例</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSampleCase}>
                    <Plus className="mr-1 h-4 w-4" />
                    添加样例
                  </Button>
                </div>

                {sampleCases.map((sampleCase, index) => (
                  <div key={index} className="rounded-md border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">样例 {index + 1}</span>
                      {sampleCases.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSampleCase(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>输入</Label>
                        <Textarea
                          placeholder={PLACEHOLDERS.sample_input}
                          rows={5}
                          value={sampleCase.input}
                          onChange={(e) => updateSampleCase(index, 'input', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>输出</Label>
                        <Textarea
                          placeholder={PLACEHOLDERS.sample_output}
                          rows={5}
                          value={sampleCase.output}
                          onChange={(e) => updateSampleCase(index, 'output', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 border-t border-border pt-4">
                <div id="hints" className="space-y-2">
                  <Label htmlFor="hints">说明 / 提示</Label>
                  <RichTextEditor
                    value={formData.hints}
                    onChange={(value) => updateFormField('hints', value)}
                    placeholder={PLACEHOLDERS.hints}
                  />
                </div>

                <div id="solution" className="space-y-2">
                  <Label htmlFor="solution">题解</Label>
                  <RichTextEditor
                    value={formData.solution}
                    onChange={(value) => updateFormField('solution', value)}
                    placeholder={PLACEHOLDERS.solution}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="test-cases" className="border-border shadow-none">
            <CardHeader>
              <CardTitle>真实测试数据</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="auto" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="auto">自动生成</TabsTrigger>
                  <TabsTrigger value="manual">手动添加</TabsTrigger>
                </TabsList>

                <TabsContent value="auto" className="space-y-4">
                  <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
                    <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">💡 使用说明</p>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• <strong>AI 生成</strong>：根据题目信息自动生成生成器和标准解代码</li>
                      <li>• <strong>生成器</strong>：编写代码生成随机测试输入数据</li>
                      <li>• <strong>标准解</strong>：编写正确解题代码，根据输入生成正确输出</li>
                      <li>• 系统会自动运行生成器产生输入，再用标准解计算输出</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="generateCount">生成数量</Label>
                      <Input
                        id="generateCount"
                        type="number"
                        min={1}
                        max={100}
                        value={generateCount}
                        onChange={(e) => setGenerateCount(parseInt(e.target.value, 10) || 20)}
                        className="w-24"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {testCases.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPreviewDialog(true)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          查看已生成数据 ({testCases.length} 组)
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateAiGenerator}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            AI 生成中（可能需要 1-3 分钟）...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI 生成代码
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        onClick={handleGenerateTestCases}
                        disabled={previewing || !generatorCode || !solutionCode}
                      >
                        {previewing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            生成测试数据
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>生成器语言</Label>
                      <Select value={generatorLanguage} onValueChange={handleGeneratorLanguageChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">选择生成测试输入的编程语言</p>
                    </div>

                    <div className="space-y-2">
                      <Label>标准解语言</Label>
                      <Select value={solutionLanguage} onValueChange={handleSolutionLanguageChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">选择生成正确输出的编程语言</p>
                    </div>
                  </div>

                  <Tabs defaultValue="generator">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="generator">生成器代码</TabsTrigger>
                      <TabsTrigger value="solution">标准解代码</TabsTrigger>
                    </TabsList>
                    <TabsContent value="generator" className="space-y-4">
                      <Textarea
                        placeholder="定义 generate 函数，返回一组输入数据"
                        rows={12}
                        value={generatorCode}
                        onChange={(e) => setGeneratorCode(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="solution" className="space-y-4">
                      <Textarea
                        placeholder="从标准输入读取，并输出正确答案"
                        rows={12}
                        value={solutionCode}
                        onChange={(e) => setSolutionCode(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </TabsContent>
                  </Tabs>

                  <p className="text-sm text-muted-foreground">
                    使用 AI 生成前请先在个人中心配置 API Key 和 Base URL，并补全题目描述、输入描述、输出描述与样例。
                  </p>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">这里填写正式判卷使用的真实测试数据，不会展示给用户。</p>
                    <div className="flex items-center gap-2">
                      {testCases.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreviewDialog(true)}>
                          <Eye className="mr-1 h-4 w-4" />
                          查看全部
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                        <Plus className="mr-1 h-4 w-4" />
                        添加用例
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {testCases.map((testCase, index) => (
                      <div key={index} className="rounded-md border border-border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium">真实测试 {index + 1}</span>
                          {testCases.length > 1 ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeTestCase(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>输入</Label>
                            <Textarea
                              placeholder="输入"
                              rows={3}
                              value={testCase.input}
                              onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>输出</Label>
                            <Textarea
                              placeholder="输出"
                              rows={3}
                              value={testCase.output}
                              onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(isEditMode ? `/problems/${id}` : '/problems')}>
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
                  {isEditMode ? '保存修改' : '创建题目'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>测试数据预览 ({testCases.length} 组)</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale((s) => Math.max(0.5, s - 0.1))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-16 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale((s) => Math.min(1.5, s + 0.1))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 p-1" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              {testCases.map((tc, index) => (
                <div key={index} className="rounded-md border border-border p-3">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">
                    测试点 #{index + 1}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">输入</p>
                      <pre className="max-h-32 overflow-auto rounded-md bg-secondary p-2 text-xs">
                        {tc.input || '(空输入)'}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">输出</p>
                      <pre className="max-h-32 overflow-auto rounded-md bg-secondary p-2 text-xs">
                        {tc.output || '(空输出)'}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
