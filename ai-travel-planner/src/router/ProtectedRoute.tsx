import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();



  // 显示加载状态，防止闪烁
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }



  // 如果用户未登录，重定向到登录页面
  if (!user) {
    console.log('用户未登录，重定向到登录页面');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  console.log('用户已登录，允许访问受保护路由');
  return <>{children}</>;
}