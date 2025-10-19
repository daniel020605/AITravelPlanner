import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { authService } from './services/auth/authService';

// 错误边界组件
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">应用启动失败</h1>
          <p className="text-gray-600 mb-4">请检查控制台错误信息</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  const { setUser } = useAuthStore();
  const [initError, setInitError] = useState<string | null>(null);



  useEffect(() => {
    let isMounted = true;

    // 初始化认证状态
    const initAuth = async () => {
      // 本地认证直接初始化

      try {
        console.log('正在初始化认证...');
        const user = await authService.getCurrentUser();
        if (isMounted && user) {
          console.log('用户已登录:', user.email);
          setUser(user);
        } else if (isMounted) {
          console.log('用户未登录');
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : '认证初始化失败');
        }
      }
    };

    initAuth();

    // 监听认证状态变化
    try {
      const { data: { subscription } } = authService.onAuthStateChange((user) => {
        if (isMounted) {
          console.log('认证状态变化:', user ? '已登录' : '未登录');
          setUser(user);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('监听认证状态失败:', error);
      if (isMounted) {
        setInitError('认证监听器初始化失败');
      }
    }
  }, [setUser]);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">认证服务初始化提示</h1>
          <p className="text-gray-600 mb-2">{initError}</p>
          <p className="text-sm text-gray-500 mb-4">
            这可能是一个临时问题，请尝试重新加载页面。若持续出现，请在设置中检查API配置（如OpenAI/高德等可选项）。
          </p>
          <button
            onClick={() => setInitError(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            继续使用
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <RouterProvider router={router} />
      </div>
    </ErrorBoundary>
  );
}

export default App;