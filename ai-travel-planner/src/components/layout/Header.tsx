import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import LogoMark from '../../assets/atp_logo.svg';

const navLinks = [
  {
    name: '仪表板',
    href: '/dashboard',
    isActive: (path: string) => path === '/dashboard',
  },
  {
    name: '行程规划',
    href: '/travel/planner',
    isActive: (path: string) => path.startsWith('/travel/planner'),
  },
  {
    name: '我的行程',
    href: '/travel',
    isActive: (path: string) =>
      path === '/travel' ||
      (path.startsWith('/travel/') && !path.startsWith('/travel/planner')),
  },
  {
    name: '统计分析',
    href: '/analytics',
    isActive: (path: string) => path.startsWith('/analytics'),
  },
  {
    name: '设置',
    href: '/settings',
    isActive: (path: string) => path.startsWith('/settings'),
  },
] as const;

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <header className="bg-gradient-to-r from-slate-950 via-blue-900 to-sky-800 text-white shadow-sm border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/30 bg-white/10 shadow-inner">
              <img
                src={LogoMark}
                alt="AI Travel Planner 标识"
                className="h-6 w-6 object-contain"
              />
            </span>
            <span className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-white/10 shadow-inner">
              <img
                src={LogoMark}
                alt="AI Travel Planner 标识"
                className="h-7 w-7 object-contain"
              />
            </span>
            <div className="flex flex-col">
              <h1 className="brand-heading text-sm sm:text-2xl font-semibold uppercase text-white tracking-[0.35em]">
                AI Travel Planner
              </h1>
              <p className="text-[10px] sm:text-xs text-white/70 tracking-[0.28em]">
                Curate · Explore · Elevate
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm border border-white/20">
            {navLinks.map((link) => {
              const isActive = link.isActive(location.pathname);
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3 rounded-full bg-white/12 px-3 py-1.5 backdrop-blur border border-white/20">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </span>
            <div className="text-xs leading-tight">
              <p className="font-semibold text-white">{user?.name || user?.email || '旅行者'}</p>
              <p className="text-white/65">{user?.email || '探索世界的足迹'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 transition"
              title="退出登录"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur border-t border-white/10">
          <div className="px-3 pt-3 pb-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = link.isActive(location.pathname);
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`block rounded-md px-3 py-2 text-base font-medium transition ${
                    isActive
                      ? 'bg-white text-slate-900'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="border-t border-white/10 pt-4">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{user?.name || user?.email || '旅行者'}</p>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 block w-full rounded-md bg-white/10 px-3 py-2 text-left text-base font-medium text-red-100 hover:bg-white/20"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
