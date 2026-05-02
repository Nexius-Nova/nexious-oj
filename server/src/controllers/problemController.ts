import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import * as problemService from '../services/problemService';
import { onlineJudge } from '../services/judgeService';
import { generateTestCases, runGenerator, runGeneratorWithSolution } from '../services/testGeneratorService';
import * as userService from '../services/userService';
import { generateAiAnalysis, generateAiTestCases, generateAiGeneratorAndSolution } from '../services/aiService';

export const getProblems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const difficulty = req.query.difficulty as string;
    const search = req.query.search as string;
    const userId = req.user?.userId;
    const tagName = req.query.tag_name as string;

    const { problems, total } = await problemService.findAll({
      page,
      limit,
      difficulty,
      search,
      userId,
      tagName,
    });

    res.json({
      success: true,
      data: problems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProblem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const problem = await problemService.findById(id, userId);

    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    res.json({
      success: true,
      data: problem,
    });
  } catch (error) {
    next(error);
  }
};

export const createProblem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.user?.userId;
    const problem = await problemService.create(req.body, creatorId);

    res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      data: problem,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProblem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const canEdit = await problemService.canEdit(id, userId);
    if (!canEdit) {
      throw new HttpError(403, '您没有权限编辑此题目');
    }

    const problem = await problemService.update(id, req.body);

    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    res.json({
      success: true,
      message: 'Problem updated successfully',
      data: problem,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProblem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const canEdit = await problemService.canEdit(id, userId);
    if (!canEdit) {
      throw new HttpError(403, '您没有权限删除此题目');
    }

    await problemService.remove(id);

    res.json({
      success: true,
      message: 'Problem deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTestCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const testCases = await problemService.findTestCases(problemId);

    res.json({
      success: true,
      data: testCases,
    });
  } catch (error) {
    next(error);
  }
};

export const saveCodeDraftController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const { code, language } = req.body;

    if (!code) {
      throw new HttpError(400, '代码不能为空');
    }

    const problem = await problemService.findById(problemId, userId);
    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    await problemService.saveCodeDraft(userId, problemId, code, language || 'cpp');

    res.json({
      success: true,
      message: '代码已保存',
    });
  } catch (error) {
    next(error);
  }
};

export const getCodeDraftController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const problem = await problemService.findById(problemId, userId);
    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    const draft = await problemService.getCodeDraft(userId, problemId);

    res.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiGeneratorController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.findById(req.user!.userId);
    if (!user?.ai_api_key) {
      throw new HttpError(400, '请先在个人中心设置 AI API Key');
    }

    const {
      title,
      description,
      input_description,
      output_description,
      sample_cases,
      hints,
      solution,
      preferred_language,
    } = req.body;

    if (!title || !description || !input_description || !output_description) {
      throw new HttpError(400, '请先补全题目名称、题目描述、输入描述和输出描述');
    }

    const result = await generateAiGeneratorAndSolution(
      {
        apiKey: user.ai_api_key,
        baseUrl: user.ai_base_url,
        model: user.ai_model,
      },
      {
        title,
        description,
        input_description,
        output_description,
        sample_cases,
        hints,
        solution,
        preferred_language,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const runGeneratorController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const problem = await problemService.findByIdRaw(problemId);

    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    if (problem.creator_id !== userId) {
      throw new HttpError(403, '您没有权限运行此题目的生成器');
    }

    if (!problem.generator_code) {
      throw new HttpError(400, '该题目没有配置生成器代码');
    }

    const result = await runGeneratorWithSolution(
      problem.generator_code,
      problem.generator_language || 'python',
      problem.solution_code || undefined,
      problem.solution_language || undefined
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const addTestCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const testCaseData = { ...req.body, problem_id: problemId };
    const testCase = await problemService.addTestCase(testCaseData);

    res.status(201).json({
      success: true,
      message: 'Test case added successfully',
      data: testCase,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTestCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testCaseId = parseInt(req.params.testCaseId, 10);
    const { input, expected_output } = req.body;

    if (!input || !expected_output) {
      throw new HttpError(400, 'Input and expected_output are required');
    }

    const testCase = await problemService.updateTestCase(testCaseId, { input, expected_output });

    if (!testCase) {
      throw new HttpError(404, 'Test case not found');
    }

    res.json({
      success: true,
      message: 'Test case updated successfully',
      data: testCase,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTestCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testCaseId = parseInt(req.params.testCaseId, 10);
    await problemService.deleteTestCase(testCaseId);

    res.json({
      success: true,
      message: 'Test case deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const batchAddTestCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const { test_cases } = req.body;

    if (!Array.isArray(test_cases) || test_cases.length === 0) {
      throw new HttpError(400, 'test_cases must be a non-empty array');
    }

    if (test_cases.length > 100) {
      throw new HttpError(400, 'Maximum 100 test cases allowed per batch');
    }

    const validTestCases = test_cases.filter((tc: any) => tc.input && tc.expected_output);
    if (validTestCases.length === 0) {
      throw new HttpError(400, 'No valid test cases provided');
    }

    await problemService.clearTestCases(problemId);
    const addedCount = await problemService.addTestCasesBatch(problemId, validTestCases);

    res.status(201).json({
      success: true,
      message: `Added ${addedCount} test cases successfully`,
      data: {
        count: addedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const runCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const { code, language, input, expected_output } = req.body;

    if (!code || !language) {
      throw new HttpError(400, 'Code and language are required');
    }

    const problem = await problemService.findById(problemId, userId);
    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    const result = await onlineJudge(code, language, input || '', expected_output || '');

    res.json({
      success: true,
      data: {
        status: result.status,
        input: result.input,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        runtime: result.runtime,
        errorMessage: result.errorMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const generateTestCasesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const { generator_code, generator_language, solution, solution_language, count = 20 } = req.body;

    if (!generator_code || !generator_language) {
      throw new HttpError(400, 'Generator code and language are required');
    }

    if (!solution || !solution_language) {
      throw new HttpError(400, 'Solution code and language are required');
    }

    const testCases = await generateTestCases(
      generator_code,
      generator_language,
      solution,
      solution_language,
      parseInt(count as string, 10) || 20
    );

    const addedCount = await problemService.addTestCasesBatch(problemId, testCases);

    res.json({
      success: true,
      message: `Generated ${testCases.length} test cases, added ${addedCount} to database`,
      data: {
        generated: testCases.length,
        added: addedCount,
        testCases: testCases.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const previewTestCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generator_code, generator_language, solution, solution_language, count = 5 } = req.body;

    if (!generator_code || !generator_language) {
      throw new HttpError(400, 'Generator code and language are required');
    }

    if (!solution || !solution_language) {
      throw new HttpError(400, 'Solution code and language are required');
    }

    const testCases = await generateTestCases(
      generator_code,
      generator_language,
      solution,
      solution_language,
      parseInt(count as string, 10) || 5
    );

    res.json({
      success: true,
      data: testCases,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiAnalysisController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const problemId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const problem = await problemService.findById(problemId, userId);

    if (!problem) {
      throw new HttpError(404, 'Problem not found');
    }

    const user = await userService.findById(userId);
    if (!user?.ai_api_key) {
      throw new HttpError(400, '请先在个人中心设置 AI API Key');
    }

    const analysis = await generateAiAnalysis(
      {
        apiKey: user.ai_api_key,
        baseUrl: user.ai_base_url,
        model: user.ai_model,
      },
      problem
    );

    res.json({
      success: true,
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiTestCasesController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.findById(req.user!.userId);
    if (!user?.ai_api_key) {
      throw new HttpError(400, '请先在个人中心设置 AI API Key');
    }

    const {
      title,
      description,
      input_description,
      output_description,
      sample_input,
      sample_output,
      sample_cases,
      hints,
      solution,
      count = 5,
    } = req.body;

    if (
      !title ||
      !description ||
      !input_description ||
      !output_description ||
      ((!sample_input || !sample_output) && (!sample_cases || sample_cases.length === 0))
    ) {
      throw new HttpError(400, '请先补全面和样例，再使用 AI 生成测试数据');
    }

    const testCases = await generateAiTestCases(
      {
        apiKey: user.ai_api_key,
        baseUrl: user.ai_base_url,
        model: user.ai_model,
      },
      {
        title,
        description,
        input_description,
        output_description,
        sample_input,
        sample_output,
        sample_cases,
        hints,
        solution,
        count: Math.min(parseInt(count as string, 10) || 5, 20),
      }
    );

    res.json({
      success: true,
      data: testCases,
    });
  } catch (error) {
    next(error);
  }
};
