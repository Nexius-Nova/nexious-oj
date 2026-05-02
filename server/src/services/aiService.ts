import { config } from '../config';
import { HttpError } from '../middlewares/errorHandler';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AiClientOptions {
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
}

const AI_REQUEST_TIMEOUT_MS = 300000;

function normalizeBaseUrl(baseUrl?: string | null) {
  return (baseUrl || config.ai.baseUrl).trim().replace(/\/+$/, '');
}

function buildEndpoint(baseUrl: string) {
  if (baseUrl.endsWith('/chat/completions')) {
    return baseUrl;
  }

  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/chat/completions`;
  }

  return `${baseUrl}/chat/completions`;
}

function getPreviewText(text: string) {
  return text.replace(/\s+/g, ' ').slice(0, 200);
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!response.ok) {
    const preview = getPreviewText(rawText);
    throw new HttpError(400, `AI 请求失败：${preview || response.statusText}`);
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    const preview = getPreviewText(rawText);

    if (/^\s*</.test(rawText)) {
      throw new HttpError(
        400,
        `AI Base URL 返回了网页内容，请检查是否填写了正确的 OpenAI 协议地址。当前响应片段：${preview}`
      );
    }

    throw new HttpError(400, `AI 接口没有返回 JSON，请检查 Base URL。当前响应片段：${preview}`);
  }

  try {
    return JSON.parse(rawText) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
  } catch {
    const preview = getPreviewText(rawText);
    throw new HttpError(400, `AI 返回内容无法解析为 JSON，请检查 Base URL。当前响应片段：${preview}`);
  }
}

async function chatCompletion(options: AiClientOptions, messages: ChatMessage[]): Promise<string> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const endpoint = buildEndpoint(baseUrl);
  const model = options.model?.trim() || config.ai.model;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages,
      }),
      signal: controller.signal,
    });

    const data = await parseJsonResponse(response);
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new HttpError(500, 'AI 未返回有效内容');
    }

    return content;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new HttpError(504, 'AI 生成超时，请减少生成数量或稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonBlock(content: string): string {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0].trim();
  }

  return content.trim();
}

function normalizeGeneratedTestCases(raw: unknown) {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as any).test_cases)
      ? (raw as any).test_cases
      : raw && typeof raw === 'object' && Array.isArray((raw as any).cases)
        ? (raw as any).cases
        : [];

  return list
    .filter(
      (item: unknown) =>
        item &&
        typeof item === 'object' &&
        typeof (item as any).input === 'string' &&
        typeof ((item as any).expected_output ?? (item as any).output) === 'string'
    )
    .map((item: unknown) => ({
      input: String((item as any).input).trim(),
      expected_output: String((item as any).expected_output ?? (item as any).output).trim(),
    }))
    .filter((item: { input: string; expected_output: string }) => item.input.length > 0 || item.expected_output.length > 0);
}

export async function generateAiAnalysis(
  options: AiClientOptions,
  problem: {
    title: string;
    description: string;
    input_description: string;
    output_description: string;
    sample_input: string;
    sample_output: string;
    hints?: string | null;
    solution?: string | null;
    sample_cases?: Array<{ input: string; output: string }> | null;
  }
) {
  const sampleText =
    problem.sample_cases && problem.sample_cases.length > 0
      ? problem.sample_cases
          .map(
            (item, index) =>
              `样例 ${index + 1}\n输入：\n${item.input}\n输出：\n${item.output}`
          )
          .join('\n\n')
      : `样例输入：\n${problem.sample_input}\n\n样例输出：\n${problem.sample_output}`;

  return chatCompletion(options, [
    {
      role: 'system',
      content:
        '你是资深 OJ 算法教练。请输出简洁、结构化、中文的题解解析，使用 Markdown，包含题意提炼、解题思路、关键坑点、复杂度分析、可选优化建议。',
    },
    {
      role: 'user',
      content: `请解析这道题：

题目名称：${problem.title}

题目描述：
${problem.description}

输入描述：
${problem.input_description}

输出描述：
${problem.output_description}

样例：
${sampleText}

提示：
${problem.hints || '无'}

已有题解：
${problem.solution || '无'}`,
    },
  ]);
}

export async function generateAiTestCases(
  options: AiClientOptions,
  payload: {
    title: string;
    description: string;
    input_description: string;
    output_description: string;
    sample_input: string;
    sample_output: string;
    hints?: string;
    solution?: string;
    count: number;
    sample_cases?: Array<{ input: string; output: string }>;
  }
) {
  const sampleText =
    payload.sample_cases && payload.sample_cases.length > 0
      ? payload.sample_cases
          .map(
            (item, index) =>
              `样例 ${index + 1}\n输入：\n${item.input}\n输出：\n${item.output}`
          )
          .join('\n\n')
      : `样例输入：\n${payload.sample_input}\n\n样例输出：\n${payload.sample_output}`;

  const content = await chatCompletion(options, [
    {
      role: 'system',
      content:
        '你是 OJ 出题助手。请只返回 JSON，不要附加解释。优先返回 JSON 数组。每项包含 input 和 expected_output 两个字符串字段。测试数据要覆盖边界、普通、容易出错的情况，且必须符合题意。',
    },
    {
      role: 'user',
      content: `请为下面这道题生成 ${payload.count} 组真实测试数据。

题目名称：${payload.title}

题目描述：
${payload.description}

输入描述：
${payload.input_description}

输出描述：
${payload.output_description}

样例：
${sampleText}

说明/提示：
${payload.hints || '无'}

题解：
${payload.solution || '无'}

输出要求：
1. 只返回 JSON
2. 优先返回数组
3. 每项格式为 {"input":"...","expected_output":"..."}
4. 如果你返回对象，则使用 {"test_cases":[...]} 结构
5. 不要返回 Markdown 解释`,
    },
  ]);

  const json = extractJsonBlock(content);

  try {
    const parsed = JSON.parse(json);
    const normalized = normalizeGeneratedTestCases(parsed);

    if (normalized.length === 0) {
      throw new HttpError(400, `AI 返回成功，但没有解析出有效测试数据。响应片段：${getPreviewText(content)}`);
    }

    return normalized;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, `AI 返回内容无法解析为测试数据，请调整模型或稍后重试。响应片段：${getPreviewText(content)}`);
  }
}

export interface GeneratedCode {
  generator_code: string;
  generator_language: string;
  solution_code: string;
  solution_language: string;
}

export async function generateAiGeneratorAndSolution(
  options: AiClientOptions,
  payload: {
    title: string;
    description: string;
    input_description: string;
    output_description: string;
    sample_cases?: Array<{ input: string; output: string }>;
    hints?: string;
    solution?: string;
    preferred_language?: string;
  }
) {
  const sampleText =
    payload.sample_cases && payload.sample_cases.length > 0
      ? payload.sample_cases
          .map(
            (item, index) =>
              `样例 ${index + 1}\n输入：\n${item.input}\n输出：\n${item.output}`
          )
          .join('\n\n')
      : '无样例';

  const preferredLang = payload.preferred_language || 'python';

  const content = await chatCompletion(options, [
    {
      role: 'system',
      content: `你是一位资深的算法竞赛教练和 OJ 出题专家。你的任务是为一道算法题生成：
1. 一个测试数据生成器（Generator）- 用于随机生成符合题目输入格式要求的测试输入
2. 一个标准解法（Solution）- 用于根据输入计算出正确的输出

## 重要规则

### 数据范围限制（非常重要）
- 必须仔细阅读题目中的"说明/提示"部分，提取数据范围信息
- 生成的测试数据必须严格符合数据范围限制
- 例如：如果题目说明"对于 100% 的评测用例，1 ≤ N ≤ 10⁵"，则生成器生成的 N 必须在 1 到 100000 之间
- 例如：如果题目说明"对于 30% 的评测用例，1 ≤ N ≤ 100"，则应该生成一些小规模测试数据（N ≤ 100）用于边界测试
- 必须生成不同规模的测试数据：小规模边界数据、中等规模数据、大规模数据
- 数据范围限制是强制性的，不能超出范围

### 生成器规则
- 必须能够生成符合题目输入格式要求的随机测试数据
- 每次运行生成一组完整的测试输入
- 输出到标准输出（stdout）
- 对于 C/C++，必须使用环境变量 NEXIOUS_SEED 作为随机种子（如果存在），否则使用时间戳
- 生成的数据要覆盖各种边界情况
- 生成的数据必须符合题目要求的格式和范围
- 必须根据数据范围限制生成不同规模的测试数据
- **输出数据大小限制**：单个测试用例的输出不能超过 1MB（约 100 万字符），请合理控制数据规模

### 标准解规则
- 从标准输入（stdin）读取输入
- 输出正确答案到标准输出（stdout）
- 必须是正确的解法，能够通过所有测试用例
- 必须包含完善的错误处理和边界检查

### 代码规范
- 对于 C++ 代码，禁止使用 #include <bits/stdc++.h>，必须使用具体的头文件如 #include <iostream>, #include <vector>, #include <algorithm> 等
- 对于 C 代码，使用标准头文件如 #include <stdio.h>, #include <stdlib.h> 等
- 代码必须符合标准语法，避免编译器特定的扩展

### 错误处理要求（非常重要）
- 使用 std::stoul、std::stoi、std::stod 等转换函数时，必须先用 try-catch 包裹
- 读取输入时必须检查是否成功读取
- 处理边界情况时必须确保不越界
- 示例错误处理：
\`\`\`cpp
// 正确的做法
std::string line;
std::getline(std::cin, line);
if (line.empty()) return 0;
try {
    unsigned long n = std::stoul(line);
} catch (const std::exception& e) {
    return 1; // 或其他错误处理
}
\`\`\`

### 输出格式
返回 JSON 对象，格式如下：
{
  "generator_code": "生成器代码字符串",
  "generator_language": "python/javascript/c/cpp",
  "solution_code": "标准解代码字符串",
  "solution_language": "python/javascript/c/cpp",
  "self_check": {
    "generator_correct": true/false,
    "solution_correct": true/false,
    "test_passed": true/false,
    "issues": ["问题列表"]
  }
}

### 自检要求
在返回代码前，你必须在内部进行以下检查：
1. 生成器能否正确解析题目输入格式？
2. 生成器是否严格遵守数据范围限制？
3. 标准解能否正确处理所有边界情况？
4. 用样例数据测试标准解，输出是否与样例输出一致？
5. 代码是否有语法错误？
6. C++代码是否避免了 #include <bits/stdc++.h>？
7. 所有的类型转换是否有错误处理？

如果有问题，请在 self_check.issues 中列出，并尝试修复。`,
    },
    {
      role: 'user',
      content: `请为下面这道题生成测试数据生成器和标准解法。

题目名称：${payload.title}

题目描述：
${payload.description}

输入描述：
${payload.input_description}

输出描述：
${payload.output_description}

样例：
${sampleText}

说明/提示（包含数据范围限制，必须严格遵守）：
${payload.hints || '无'}

已有题解参考：
${payload.solution || '无'}

偏好语言：${preferredLang}

请生成：
1. 一个生成器，能够随机生成符合输入格式要求和数据范围限制的测试数据
2. 一个标准解，能够正确解答这道题

要求：
- 优先使用 ${preferredLang} 语言
- 代码必须能够正确运行
- 必须严格遵守"说明/提示"中的数据范围限制
- 必须生成不同规模的测试数据（边界、中等、大规模）
- 必须通过自检验证
- 返回 JSON 格式结果`,
    },
  ]);

  const json = extractJsonBlock(content);

  try {
    const parsed = JSON.parse(json);

    if (!parsed.generator_code || !parsed.solution_code) {
      throw new HttpError(400, 'AI 未返回完整的生成器或标准解代码');
    }

    if (!parsed.generator_language) {
      parsed.generator_language = preferredLang;
    }
    if (!parsed.solution_language) {
      parsed.solution_language = preferredLang;
    }

    const selfCheck = parsed.self_check;
    if (selfCheck && selfCheck.issues && selfCheck.issues.length > 0) {
      console.warn('AI 自检发现问题:', selfCheck.issues);
    }

    return {
      generator_code: parsed.generator_code,
      generator_language: parsed.generator_language,
      solution_code: parsed.solution_code,
      solution_language: parsed.solution_language,
      self_check: selfCheck || { issues: [] },
    } as GeneratedCode & { self_check?: { issues: string[] } };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, `AI 返回内容无法解析，请稍后重试。响应片段：${getPreviewText(content)}`);
  }
}
