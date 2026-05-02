import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Code2,
  Home,
  LayoutGrid,
  Trophy,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuthStore, useThemeStore } from "@/store";
import CommandPalette from "./CommandPalette";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: Home },
  { to: "/problems", label: "题库", icon: LayoutGrid },
  { to: "/contests", label: "比赛", icon: Trophy },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setShowUserMenu(false);
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-card-foreground">Nexious OJ</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Center: Command Palette */}
      <div className="hidden flex-1 justify-center px-8 md:flex">
        <CommandPalette />
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          title={theme === "light" ? "切换到暗黑模式" : "切换到明亮模式"}
        >
          {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {isAuthenticated && user ? (
          <div className="relative ml-2" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary"
            >
              <div className="h-7 w-7 overflow-hidden rounded-full bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]">
                <span className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                  {user.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden text-sm font-medium text-card-foreground sm:block">{user.username}</span>
              <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform sm:block ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card py-2 shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-card-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  个人中心
                </Link>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ml-2 flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              登录
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB]"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
