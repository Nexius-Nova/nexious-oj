import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User, Code2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { login, register, isLoading } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查账号与密码');
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }

    try {
      await register(username, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请稍后再试');
    }
  }

  function handleTabChange(value: string) {
    setActiveTab(value);
    resetForm();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-[#1E293B]">Nexious OJ</span>
        </div>

        <Card className="border-[#E8ECF3] shadow-none">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <CardHeader className="space-y-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <CardDescription className="px-6 pb-2 text-sm text-[#64748B]">
                进入题库、编辑器和提交记录
              </CardDescription>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm text-[#334155]">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="输入注册邮箱"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm text-[#334155]">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="输入密码"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 bg-[#3B82F6] hover:bg-[#2563EB]" disabled={isLoading}>
                    {isLoading ? '登录中...' : '登录'}
                    {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardDescription className="px-6 pb-2 text-sm text-[#64748B]">
                创建账号后即可使用题库、判卷和提交记录
              </CardDescription>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-5">
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-sm text-[#334155]">用户名</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="register-username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="输入用户名"
                        className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm text-[#334155]">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="输入邮箱"
                        className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm text-[#334155]">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                        <Input
                          id="register-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="至少 6 位"
                          className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="text-sm text-[#334155]">确认密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                        <Input
                          id="register-confirm"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="再次输入密码"
                          className="border-[#E8ECF3] bg-[#F8FAFC] pl-9 text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 bg-[#3B82F6] hover:bg-[#2563EB]" disabled={isLoading}>
                    {isLoading ? '注册中...' : '注册'}
                    {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
