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
    let unsubscribe: (() => void) | null = null;

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
      const { data } = authService.onAuthStateChange((user) => {
        if (isMounted) {
          console.log('认证状态变化:', user ? '已登录' : '未登录');
          setUser(user);
        }
      });
      unsubscribe = data?.subscription?.unsubscribe ?? null;
    } catch (error) {
      console.error('监听认证状态失败:', error);
      if (isMounted) {
        setInitError('认证监听器初始化失败');
      }
    }

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (err) {
          console.error('取消认证订阅失败:', err);
        }
      }
    };
  }, [setUser]);

  return (
    <ErrorBoundary>
      <div className="App relative">
        <RouterProvider router={router} />
        {initError && (
          <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900 shadow-xl">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold">认证服务初始化提示</h2>
                  <p className="text-sm leading-relaxed text-yellow-800">{initError}</p>
                  <p className="text-xs text-yellow-700">
                    可先继续使用再在设置中检查 Supabase 或第三方配置，若问题持续请尝试重新加载。
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setInitError(null)}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600"
                    >
                      知道了
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-md border border-yellow-400 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                    >
                      重新加载
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInitError(null)}
                  className="mt-1 text-yellow-600 transition hover:text-yellow-800"
                  aria-label="关闭认证提示"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
