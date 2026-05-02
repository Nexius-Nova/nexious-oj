import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface GeneratorConfig {
  extension: string;
  command: string;
  args: (file: string) => string[];
}

const GENERATOR_CONFIG: Record<string, GeneratorConfig> = {
  javascript: {
    extension: 'js',
    command: 'node',
    args: (file) => [file],
  },
  python: {
    extension: 'py',
    command: 'python',
    args: (file) => [file],
  },
  c: {
    extension: 'c',
    command: 'gcc',
    args: (file) => [file, '-o', file.replace('.c', '.exe'), '-std=c11', '-O2'],
  },
  cpp: {
    extension: 'cpp',
    command: 'g++',
    args: (file) => [file, '-o', file.replace('.cpp', '.exe'), '-std=c++17', '-O2'],
  },
};

const RUNTIME_TIMEOUT = 10000;
const MAX_OUTPUT_SIZE = 1024 * 1024;

const ensureTempDir = (): string => {
  const tempDir = path.join(os.tmpdir(), 'nexious-oj-generator');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

const compileIfNeeded = async (
  filePath: string,
  language: string,
  config: GeneratorConfig,
  tempDir: string
): Promise<string> => {
  const isCompiled = language === 'c' || language === 'cpp';
  if (!isCompiled) return filePath;

  return new Promise((resolve, reject) => {
    let errorOutput = '';
    const compileProcess = spawn(config.command, config.args(filePath), {
      cwd: tempDir,
    });

    compileProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    compileProcess.on('close', (compileCode) => {
      if (compileCode !== 0) {
        try { fs.unlinkSync(filePath); } catch {}
        reject(new Error(`Compilation error: ${errorOutput}`));
        return;
      }
      resolve(filePath.replace(`.${config.extension}`, '.exe'));
    });

    compileProcess.on('error', reject);
  });
};

const runProcess = async (
  command: string,
  args: string[],
  tempDir: string,
  input?: string,
  env?: NodeJS.ProcessEnv
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    let resolved = false;
    let outputSize = 0;

    const isExe = command.endsWith('.exe');
    const spawnOptions: any = {
      cwd: tempDir,
      env: { ...process.env, ...env },
    };
    if (isExe) {
      spawnOptions.shell = true;
    }

    const proc = spawn(command, args, spawnOptions);

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }

    proc.stdout.on('data', (data) => {
      outputSize += data.length;
      if (outputSize > MAX_OUTPUT_SIZE) {
        if (!resolved) {
          resolved = true;
          proc.kill();
          reject(new Error(`输出数据过大，超过 ${Math.round(MAX_OUTPUT_SIZE / 1024)} KB 限制。请检查生成器代码是否生成了合理规模的数据。`));
        }
        return;
      }
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      if (code !== 0) {
        reject(new Error(`Runtime error (exit code ${code}): ${errorOutput}`));
        return;
      }
      resolve(output.trim());
    });

    proc.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    });

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      proc.kill();
      reject(new Error('Process timeout'));
    }, RUNTIME_TIMEOUT);
  });
};

const parseMarkedTestCases = (output: string): string[] => {
  const testCases: string[] = [];
  const blocks = output.split('===TEST_CASE_START===');

  for (const block of blocks) {
    const endIndex = block.indexOf('===TEST_CASE_END===');
    if (endIndex !== -1) {
      const testCase = block.substring(0, endIndex).trim();
      if (testCase) {
        testCases.push(testCase);
      }
    }
  }

  return testCases;
};

const runGeneratorCode = async (
  code: string,
  language: string,
  count: number
): Promise<string[]> => {
  const config = GENERATOR_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = ensureTempDir();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const fileName = `generator_${timestamp}_${randomSuffix}.${config.extension}`;
  const filePath = path.join(tempDir, fileName);
  const isCompiled = language === 'c' || language === 'cpp';

  try {
    if (language === 'javascript') {
      const wrappedCode = `${code}\n\nif (typeof generate === 'function') { for (let i = 0; i < ${count}; i++) { console.log('===TEST_CASE_START==='); console.log(generate()); console.log('===TEST_CASE_END==='); } } else { console.error('Error: generate function not found'); process.exit(1); }`;
      fs.writeFileSync(filePath, wrappedCode, 'utf-8');
      const output = await runProcess(config.command, config.args(filePath), tempDir);
      return parseMarkedTestCases(output);
    } else if (language === 'python') {
      const wrappedCode = `${code}\n\nif callable(globals().get('generate')):\n    for _ in range(${count}):\n        print('===TEST_CASE_START===')\n        print(generate())\n        print('===TEST_CASE_END===')\nelse:\n    import sys\n    print('Error: generate function not found', file=sys.stderr)\n    sys.exit(1)`;
      fs.writeFileSync(filePath, wrappedCode, 'utf-8');
      const output = await runProcess(config.command, config.args(filePath), tempDir);
      return parseMarkedTestCases(output);
    } else {
      fs.writeFileSync(filePath, code, 'utf-8');
      const executablePath = await compileIfNeeded(filePath, language, config, tempDir);

      const testCases: string[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const seed = Date.now() + i * 7919 + Math.floor(Math.random() * 100000);
          const output = await runProcess(
            executablePath,
            [],
            tempDir,
            undefined,
            { NEXIOUS_SEED: String(seed) }
          );
          if (output) {
            testCases.push(output);
          }
        } catch (error) {
          console.error(`Failed to generate test case ${i + 1}:`, error);
        }
        await new Promise(r => setTimeout(r, 10));
      }

      try { fs.unlinkSync(filePath); } catch {}
      if (fs.existsSync(executablePath)) {
        try { fs.unlinkSync(executablePath); } catch {}
      }

      return testCases;
    }
  } finally {
    if (!isCompiled && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
};

const runSolutionCode = async (
  code: string,
  language: string,
  input: string
): Promise<string> => {
  const config = GENERATOR_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = ensureTempDir();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const fileName = `solution_${timestamp}_${randomSuffix}.${config.extension}`;
  const filePath = path.join(tempDir, fileName);
  const isCompiled = language === 'c' || language === 'cpp';

  try {
    fs.writeFileSync(filePath, code, 'utf-8');
    const executablePath = await compileIfNeeded(filePath, language, config, tempDir);
    const command = isCompiled ? executablePath : config.command;
    const args = isCompiled ? [] : config.args(executablePath);
    const output = await runProcess(command, args, tempDir, input);
    return output;
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
    if (isCompiled) {
      const exePath = filePath.replace(`.${config.extension}`, '.exe');
      if (fs.existsSync(exePath)) {
        try { fs.unlinkSync(exePath); } catch {}
      }
    }
  }
};

export const generateTestCases = async (
  generatorCode: string,
  generatorLanguage: string,
  solutionCode: string,
  solutionLanguage: string,
  count: number = 20
): Promise<Array<{ input: string; expected_output: string }>> => {
  const inputs = await runGeneratorCode(generatorCode, generatorLanguage, count);

  const testCases: Array<{ input: string; expected_output: string }> = [];

  for (const input of inputs) {
    try {
      const output = await runSolutionCode(solutionCode, solutionLanguage, input);
      testCases.push({ input, expected_output: output });
    } catch (error) {
      console.error(`Failed to generate output for input: ${input}`, error);
    }
  }

  return testCases;
};

export const runGenerator = async (
  generatorCode: string,
  generatorLanguage: string
): Promise<string> => {
  const inputs = await runGeneratorCode(generatorCode, generatorLanguage, 1);
  return inputs[0] || '';
};

export const runGeneratorWithSolution = async (
  generatorCode: string,
  generatorLanguage: string,
  solutionCode?: string,
  solutionLanguage?: string
): Promise<{ input: string; output?: string }> => {
  const inputs = await runGeneratorCode(generatorCode, generatorLanguage, 1);
  const input = inputs[0] || '';

  if (solutionCode && solutionLanguage) {
    try {
      const output = await runSolutionCode(solutionCode, solutionLanguage, input);
      return { input, output };
    } catch (error) {
      console.error('Failed to run solution:', error);
      return { input };
    }
  }

  return { input };
};
