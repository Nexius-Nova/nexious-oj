import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { submissionApi } from '@/api';
import { useAuthStore } from '@/store';
import type { Submission } from '@/types/submission';
import { Card, CardContent } from '@/components/ui/card';

export default function Submissions() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    void submissionApi
      .getUserSubmissions(user.id, { limit: 30 })
      .then((response) => setSubmissions(response.data))
      .catch((error) => console.error('Failed to fetch submissions:', error));
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'Wrong Answer':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Time Limit Exceeded':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Accepted':
        return '通过';
      case 'Wrong Answer':
        return '答案错误';
      case 'Time Limit Exceeded':
        return '超时';
      case 'Runtime Error':
        return '运行错误';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">提交记录</h1>
        <p className="mt-1 text-sm text-muted-foreground">统一查看最近提交、状态、语言和测试点通过情况。</p>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">还没有提交记录</p>
              <p className="text-xs text-muted-foreground/70">去题库选择一道题并正式提交后，这里会自动累积你的评测历史。</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[80px_1fr_100px_80px_80px_100px] gap-3 px-5 py-3 text-xs font-medium text-muted-foreground">
                <span>状态</span>
                <span>题目</span>
                <span>语言</span>
                <span>耗时</span>
                <span>测试点</span>
                <span>提交时间</span>
              </div>

              {submissions.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/problems/${sub.problem_id}`}
                  className="grid grid-cols-[80px_1fr_100px_80px_80px_100px] items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/30"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    {getStatusIcon(sub.status)}
                    <span className={sub.status === 'Accepted' ? 'text-emerald-500' : 'text-red-500'}>
                      {getStatusText(sub.status)}
                    </span>
                  </span>
                  <span className="truncate text-sm text-primary">{sub.problem_title}</span>
                  <span className="text-xs text-muted-foreground">{sub.language}</span>
                  <span className="text-xs text-muted-foreground">{sub.runtime ?? 0} ms</span>
                  <span className="text-xs text-muted-foreground">{sub.test_cases_passed}/{sub.test_cases_total}</span>
                  <span className="text-xs text-muted-foreground/70">
                    {new Date(sub.created_at).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
