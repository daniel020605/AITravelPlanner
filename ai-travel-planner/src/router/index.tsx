import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import TravelPlanner from '../pages/travel/TravelPlanner';
import TravelPlans from '../pages/travel/TravelPlans';
import TravelDetail from '../pages/travel/TravelDetail';
import Settings from '../pages/settings/Settings';
import Analytics from '../pages/analytics/Analytics';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    // 友好的错误边界
    errorElement: (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">页面未找到或发生错误</h1>
          <p className="text-gray-600 mb-4">请检查链接是否正确，或返回首页。</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            返回首页
          </a>
        </div>
      </div>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'travel',
        children: [
          {
            index: true,
            element: <TravelPlans />
          },
          {
            path: 'planner',
            element: <TravelPlanner />
          },
          {
            path: ':id',
            element: <TravelDetail />
          }
        ]
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: '/auth',
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      }
    ]
  },
  // 通配符兜底，避免 404
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">404 未找到</h1>
          <p className="text-gray-600 mb-4">您访问的页面不存在。</p>
          <a
            href="/travel"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            返回我的行程
          </a>
        </div>
      </div>
    )
  }
]);