import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pool } from '../config/database';
import { SubmissionStatus } from '../types';

const JUDGE_TIMEOUT = 5000;
const COMPILE_TIMEOUT = 30000;
const TEMP_DIR = path.join(os.tmpdir(), 'nexious-oj');

type TestResultStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Runtime Error';

interface JudgeResult {
  status: SubmissionStatus;
  runtime: number;
  memory: number;
  testCasesPassed: number;
  testCasesTotal: number;
  errorMessage?: string;
  testResults: TestResult[];
}

interface TestResult {
  testCaseId: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: TestResultStatus;
  runtime: number;
}

interface LanguageConfig {
  extension: string;
  compile?: {
    command: string;
    args: (sourceFile: string, workdir: string) => string[];
  };
  run: {
    command: (sourceFile: string, workdir: string) => string;
    args: (sourceFile: string, workdir: string) => string[];
  };
}

const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  javascript: {
    extension: 'js',
    run: {
      command: () => 'node',
      args: (sourceFile) => [sourceFile],
    },
  },
  python: {
    extension: 'py',
    run: {
      command: () => 'python',
      args: (sourceFile) => [sourceFile],
    },
  },
  c: {
    extension: 'c',
    compile: {
      command: 'gcc',
      args: (sourceFile, workdir) => [
        sourceFile,
        '-o',
        path.join(workdir, 'main.exe'),
        '-std=c11',
        '-O2',
      ],
    },
    run: {
      command: (_, workdir) => path.join(workdir, 'main.exe'),
      args: () => [],
    },
  },
  cpp: {
    extension: 'cpp',
    compile: {
      command: 'g++',
      args: (sourceFile, workdir) => [
        sourceFile,
        '-o',
        path.join(workdir, 'main.exe'),
        '-std=c++17',
        '-O2',
      ],
    },
    run: {
      command: (_, workdir) => path.join(workdir, 'main.exe'),
      args: () => [],
    },
  },
};

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function createWorkingDirectory() {
  ensureTempDir();
  return fs.mkdtempSync(path.join(TEMP_DIR, `job-${randomUUID()}-`));
}

function cleanupWorkingDirectory(workdir: string) {
  try {
    fs.rmSync(workdir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to clean workdir:', workdir, error);
  }
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

async function compileCode(
  command: string,
  args: string[],
  cwd: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      windowsHide: true,
      timeout: COMPILE_TIMEOUT,
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
        return;
      }

      resolve({
        success: false,
        error: stderr || `编译失败，退出码：${code ?? 'unknown'}`,
      });
    });
  });
}

async function runTestCase(
  command: string,
  args: string[],
  input: string,
  expectedOutput: string,
  testCaseId: number,
  cwd: string
): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const proc = spawn(command, args, {
      cwd,
      windowsHide: true,
    });

    const finish = (result: TestResult) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      resolve(result);
    };

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      finish({
        testCaseId,
        input,
        expectedOutput,
        actualOutput: stderr || error.message,
        status: 'Runtime Error',
        runtime: Date.now() - startTime,
      });
    });

    proc.on('close', (code) => {
      const runtime = Date.now() - startTime;

      if (code !== 0 || stderr) {
        finish({
          testCaseId,
          input,
          expectedOutput,
          actualOutput: stderr || stdout,
          status: 'Runtime Error',
          runtime,
        });
        return;
      }

      if (normalizeOutput(stdout) === normalizeOutput(expectedOutput)) {
        finish({
          testCaseId,
          input,
          expectedOutput,
          actualOutput: stdout,
          status: 'Accepted',
          runtime,
        });
        return;
      }

      finish({
        testCaseId,
        input,
        expectedOutput,
        actualOutput: stdout,
        status: 'Wrong Answer',
        runtime,
      });
    });

    proc.stdin.write(input);
    proc.stdin.end();

    const timer = setTimeout(() => {
      proc.kill();
      finish({
        testCaseId,
        input,
        expectedOutput,
        actualOutput: stdout,
        status: 'Time Limit Exceeded',
        runtime: JUDGE_TIMEOUT,
      });
    }, JUDGE_TIMEOUT);
  });
}

async function judgeCode(
  code: string,
  language: string,
  testCases: any[]
): Promise<JudgeResult> {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    return {
      status: 'System Error',
      runtime: 0,
      memory: 0,
      testCasesPassed: 0,
      testCasesTotal: testCases.length,
      errorMessage: `不支持的语言：${language}`,
      testResults: [],
    };
  }

  const workdir = createWorkingDirectory();
  const sourceFile = path.join(workdir, `main.${config.extension}`);

  try {
    fs.writeFileSync(sourceFile, code, 'utf8');

    if (config.compile) {
      const compileResult = await compileCode(
        config.compile.command,
        config.compile.args(sourceFile, workdir),
        workdir
      );

      if (!compileResult.success) {
        return {
          status: 'Compilation Error',
          runtime: 0,
          memory: 0,
          testCasesPassed: 0,
          testCasesTotal: testCases.length,
          errorMessage: compileResult.error,
          testResults: [],
        };
      }
    }

    const runCommand = config.run.command(sourceFile, workdir);
    const runArgs = config.run.args(sourceFile, workdir);
    const testResults: TestResult[] = [];
    let passedCount = 0;
    let totalRuntime = 0;
    let finalStatus: SubmissionStatus = 'Accepted';
    let errorMessage = '';

    for (const [index, testCase] of testCases.entries()) {
      const result = await runTestCase(
        runCommand,
        runArgs,
        testCase.input,
        testCase.expected_output,
        testCase.id,
        workdir
      );

      testResults.push(result);
      totalRuntime += result.runtime;

      if (result.status === 'Accepted') {
        passedCount += 1;
      } else if (finalStatus === 'Accepted') {
        finalStatus =
          result.status === 'Wrong Answer'
            ? 'Wrong Answer'
            : result.status === 'Time Limit Exceeded'
              ? 'Time Limit Exceeded'
              : 'Runtime Error';
        errorMessage =
          result.status === 'Wrong Answer'
            ? `测试点 #${index + 1} 未通过`
            : result.status === 'Time Limit Exceeded'
              ? `测试点 #${index + 1} 超时`
              : `测试点 #${index + 1} 运行错误`;
      }
    }

    return {
      status: finalStatus,
      runtime: testCases.length > 0 ? Math.round(totalRuntime / testCases.length) : 0,
      memory: 0,
      testCasesPassed: passedCount,
      testCasesTotal: testCases.length,
      errorMessage: errorMessage || undefined,
      testResults,
    };
  } catch (error: any) {
    return {
      status: 'System Error',
      runtime: 0,
      memory: 0,
      testCasesPassed: 0,
      testCasesTotal: testCases.length,
      errorMessage: error.message || '评测系统异常',
      testResults: [],
    };
  } finally {
    cleanupWorkingDirectory(workdir);
  }
}

async function saveTestResults(submissionId: number, testResults: TestResult[]) {
  await pool.query('DELETE FROM submission_results WHERE submission_id = ?', [submissionId]);

  for (const result of testResults) {
    await pool.query(
      `INSERT INTO submission_results
       (submission_id, test_case_id, status, runtime, actual_output)
       VALUES (?, ?, ?, ?, ?)`,
      [
        submissionId,
        result.testCaseId,
        result.status,
        result.runtime,
        result.actualOutput,
      ]
    );
  }
}

async function updateSubmissionStatus(
  id: number,
  status: SubmissionStatus,
  runtime: number,
  memory: number,
  testCasesPassed: number,
  testCasesTotal: number,
  errorMessage?: string
) {
  await pool.query(
    `UPDATE submissions
     SET status = ?, runtime = ?, memory = ?,
         test_cases_passed = ?, test_cases_total = ?, error_message = ?
     WHERE id = ?`,
    [status, runtime, memory, testCasesPassed, testCasesTotal, errorMessage || null, id]
  );
}

async function updateProblemStats(problemId: number) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) AS accepted
     FROM submissions
     WHERE problem_id = ?`,
    [problemId]
  );

  const stats = (rows as any[])[0];
  const total = stats.total ?? 0;
  const accepted = stats.accepted ?? 0;
  const acceptance = total > 0 ? accepted / total : 0;

  await pool.query(
    `UPDATE problems
     SET submission_count = ?, accepted_count = ?, acceptance = ?
     WHERE id = ?`,
    [total, accepted, acceptance, problemId]
  );
}

export const processSubmission = async (submissionId: number): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    const submission = (rows as any[])[0];

    if (!submission) {
      return;
    }

    const isCompiledLanguage = ['c', 'cpp'].includes(submission.language);
    await pool.query(`UPDATE submissions SET status = ? WHERE id = ?`, [
      isCompiledLanguage ? 'Compiling' : 'Running',
      submissionId,
    ]);

    const [testCases] = await pool.query(
      'SELECT * FROM test_cases WHERE problem_id = ? ORDER BY `order`, id',
      [submission.problem_id]
    );

    const testCaseList = testCases as any[];

    if (testCaseList.length === 0) {
      await updateSubmissionStatus(
        submissionId,
        'System Error',
        0,
        0,
        0,
        0,
        '题目未配置测试数据'
      );
      return;
    }

    const result = await judgeCode(submission.code, submission.language, testCaseList);

    await updateSubmissionStatus(
      submissionId,
      result.status,
      result.runtime,
      result.memory,
      result.testCasesPassed,
      result.testCasesTotal,
      result.errorMessage
    );

    await saveTestResults(submissionId, result.testResults);

    await updateProblemStats(submission.problem_id);
  } catch (error) {
    console.error(`Error processing submission ${submissionId}:`, error);
    await updateSubmissionStatus(
      submissionId,
      'System Error',
      0,
      0,
      0,
      0,
      '评测系统异常'
    );
  }
};

export const processPendingSubmissions = async (): Promise<void> => {
  const [rows] = await pool.query(
    `SELECT id FROM submissions WHERE status = 'Pending' ORDER BY created_at ASC LIMIT 10`
  );

  for (const submission of rows as Array<{ id: number }>) {
    await processSubmission(submission.id);
  }
};

export interface OnlineJudgeResult {
  status:
    | 'Accepted'
    | 'Wrong Answer'
    | 'Time Limit Exceeded'
    | 'Runtime Error'
    | 'Compilation Error';
  input: string;
  expectedOutput: string;
  actualOutput: string;
  runtime: number;
  errorMessage?: string;
}

export const onlineJudge = async (
  code: string,
  language: string,
  input: string,
  expectedOutput: string
): Promise<OnlineJudgeResult> => {
  const result = await judgeCode(code, language, [
    {
      id: 0,
      input,
      expected_output: expectedOutput,
    },
  ]);

  const testResult = result.testResults[0];

  if (!testResult && result.status === 'Compilation Error') {
    return {
      status: 'Compilation Error',
      input,
      expectedOutput,
      actualOutput: '',
      runtime: 0,
      errorMessage: result.errorMessage,
    };
  }

  if (!testResult) {
    return {
      status: 'Runtime Error',
      input,
      expectedOutput,
      actualOutput: '',
      runtime: 0,
      errorMessage: result.errorMessage || '运行失败',
    };
  }

  return {
    status: result.status as OnlineJudgeResult['status'],
    input: testResult.input,
    expectedOutput: testResult.expectedOutput,
    actualOutput: testResult.actualOutput,
    runtime: testResult.runtime,
    errorMessage: result.errorMessage,
  };
};
