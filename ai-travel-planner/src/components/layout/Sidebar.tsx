import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MapIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import LogoMark from '../../assets/atp_logo.svg';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    {
      name: '仪表板',
      href: '/dashboard',
      icon: HomeIcon,
      description: '概览你的行程与待办',
      isActive: (path: string) => path === '/dashboard',
    },
    {
      name: '行程规划',
      href: '/travel/planner',
      icon: MapIcon,
      description: '智能生成目的地行程',
      isActive: (path: string) => path.startsWith('/travel/planner'),
    },
    {
      name: '我的行程',
      href: '/travel',
      icon: DocumentTextIcon,
      description: '管理已保存的旅程',
      isActive: (path: string) =>
        path === '/travel' ||
        (path.startsWith('/travel/') && !path.startsWith('/travel/planner')),
    },
    {
      name: '统计分析',
      href: '/analytics',
      icon: ChartBarIcon,
      description: '洞察预算与消费趋势',
      isActive: (path: string) => path.startsWith('/analytics'),
    },
    {
      name: '设置',
      href: '/settings',
      icon: CogIcon,
      description: '配置偏好与服务接入',
      isActive: (path: string) => path.startsWith('/settings'),
    },
  ];

  return (
    <aside className="hidden md:flex md:w-72 xl:w-80 md:flex-col bg-white/70 backdrop-blur border-r border-slate-200/80">
      <div className="flex flex-col flex-grow px-5 py-6">
        <div className="mb-8">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <img src={LogoMark} alt="AI Travel Planner Logo" className="h-8 w-8 object-contain" />
            </span>
            <div className="leading-tight">
              <p className="brand-heading text-base font-semibold uppercase text-slate-900 tracking-[0.32em]">
                ATP
              </p>
              <p className="text-xs text-slate-500 tracking-[0.18em]">AI Travel Planner</p>
            </div>
          </Link>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 text-white/90 px-3 py-1 text-xs tracking-[0.28em] uppercase">
            <SparklesIcon className="h-3.5 w-3.5" />
            Journey
          </span>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            智能旅程助手，为你沉淀每一次远行的灵感与回忆。
          </p>
        </div>
        <div className="flex-grow flex flex-col">
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const isActive = item.isActive(location.pathname);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group block rounded-2xl border px-3 py-3 transition-all ${
                    isActive
                      ? 'border-blue-500/70 bg-gradient-to-r from-blue-50 via-sky-50 to-white text-blue-800 shadow-sm'
                      : 'border-transparent bg-white/40 text-slate-600 hover:border-blue-200 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                        isActive
                          ? 'border-blue-500/60 bg-blue-500/10 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-400 group-hover:text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-8">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-sky-500 text-white px-4 py-5 shadow-lg">
              <p className="text-sm font-semibold">探索旅途灵感</p>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">
                刷新附近推荐，发掘更多目的地惊喜；结合统计分析，提前掌握预算节奏。
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
