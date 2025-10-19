import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MapIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: '仪表板', href: '/dashboard', icon: HomeIcon },
    { name: '行程规划', href: '/travel/planner', icon: MapIcon },
    { name: '我的行程', href: '/travel', icon: DocumentTextIcon },
    { name: '统计分析', href: '/analytics', icon: ChartBarIcon },
    { name: '设置', href: '/settings', icon: CogIcon },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200">
        <div className="flex-grow mt-5 flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-6 w-6 ${
                      isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;