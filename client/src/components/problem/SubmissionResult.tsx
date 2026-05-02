import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubmissionStatusBadge } from '@/components/oj/SubmissionStatusBadge';
import type { Submission, SubmissionCaseResult } from '@/types/submission';

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

interface SubmissionResultProps {
  submissionResult: Submission | null;
}

export function SubmissionResult({ submissionResult }: SubmissionResultProps) {
  if (!submissionResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="h-10 w-10 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-3 text-sm text-[#94A3B8]">还没有查看中的提交</p>
        <p className="text-xs text-[#CBD5E1]">提交代码后，这里会显示状态、耗时、代码和测试点明细</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5">
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
      </div>
    </ScrollArea>
  );
}
