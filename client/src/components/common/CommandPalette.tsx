import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Home,
  LayoutGrid,
  Trophy,
  FileText,
  User,
  Plus,
  Code2,
} from 'lucide-react';
import { problemApi } from '@/api';
import { useAuthStore } from '@/store';

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'action' | 'search';
}

interface SearchResult {
  id: number;
  title: string;
  type: 'problem';
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    {
      id: 'home',
      label: '返回首页',
      icon: Home,
      action: () => navigate('/'),
      category: 'navigation',
    },
    {
      id: 'problems',
      label: '浏览题库',
      icon: LayoutGrid,
      action: () => navigate('/problems'),
      category: 'navigation',
    },
    {
      id: 'contests',
      label: '查看比赛',
      icon: Trophy,
      action: () => navigate('/contests'),
      category: 'navigation',
    },
    {
      id: 'submissions',
      label: '提交记录',
      icon: FileText,
      action: () => navigate('/submissions'),
      category: 'navigation',
    },
    {
      id: 'profile',
      label: '个人中心',
      icon: User,
      action: () => navigate('/profile'),
      category: 'navigation',
    },
    ...(isAuthenticated
      ? [
          {
            id: 'create-problem',
            label: '创建题目',
            icon: Plus,
            action: () => navigate('/problems/create'),
            category: 'action' as const,
          },
        ]
      : []),
  ];

  const filteredCommands = query
    ? commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const allItems = [
    ...filteredCommands,
    ...searchResults.map((r) => ({
      id: `search-${r.id}`,
      label: r.title,
      icon: Code2,
      action: () => navigate(`/problems/${r.id}`),
      category: 'search' as const,
    })),
  ];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  async function performSearch(searchQuery: string) {
    setSearching(true);
    try {
      const response = await problemApi.getProblems({
        search: searchQuery,
        limit: 5,
      });
      setSearchResults(
        response.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          type: 'problem' as const,
        }))
      );
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = allItems[selectedIndex];
        if (selected) {
          selected.action();
          setIsOpen(false);
          setQuery('');
        }
      }
    },
    [allItems, selectedIndex]
  );

  const handleItemClick = (command: Command) => {
    command.action();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 w-64 rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground hover:border-primary hover:bg-background transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">搜索或跳转...</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)} />
      
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索题目或输入命令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border-0 bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            ESC
          </button>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length > 0 && (
            <div className="px-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">快捷操作</div>
              {filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={command.id}
                    onClick={() => handleItemClick(command)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{command.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {query && searchResults.length > 0 && (
            <div className="mt-2 px-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">搜索结果</div>
              {searchResults.map((result, index) => {
                const Icon = Code2;
                const actualIndex = filteredCommands.length + index;
                const isSelected = actualIndex === selectedIndex;
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      navigate(`/problems/${result.id}`);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{result.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {query && !searching && searchResults.length === 0 && filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              未找到相关结果
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1">↑</kbd>
              <kbd className="rounded border border-border bg-card px-1">↓</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1">Enter</kbd>
              确认
            </span>
          </div>
          <span>输入关键词搜索题目</span>
        </div>
      </div>
    </>
  );
}
