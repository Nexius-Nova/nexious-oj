import { ScrollArea } from '@/components/ui/scroll-area';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import type { Problem } from '@/types/problem';

interface SampleCase {
  input: string;
  output: string;
}

interface ProblemStatementProps {
  problem: Problem;
  sampleCases: SampleCase[];
}

export function ProblemStatement({ problem, sampleCases }: ProblemStatementProps) {
  return (
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
  );
}
