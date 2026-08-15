import { History, Mic, Plus, Settings as SettingsIcon } from 'lucide-react'
import { useApp, appStore } from './store/appStore'
import HomePage from './pages/HomePage'
import ProcessingPage from './pages/ProcessingPage'
import ResultsPage from './pages/ResultsPage'
import SettingsPage from './pages/SettingsPage'
import Sidebar from './components/Sidebar'

export default function App() {
  const { page, sidebarCollapsed } = useApp()
  const onHome = page === 'home' || page === 'processing' || page === 'results'

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => appStore.set({ page: 'home' })}
          aria-label="返回首页"
        >
          <Mic size={18} className="brand-mark" />
          <span>面试复盘</span>
        </button>

        <nav>
          <button
            type="button"
            className={`topbar-link${onHome ? ' active' : ''}`}
            onClick={() => appStore.set({ page: 'home' })}
          >
            首页
          </button>
          <button
            type="button"
            className={`topbar-link${page === 'settings' ? ' active' : ''}`}
            onClick={() => appStore.set({ page: 'settings' })}
          >
            设置
          </button>
        </nav>

        <div className="topbar-right">
          <button
            type="button"
            className="btn btn-primary btn-sm topbar-new"
            onClick={() => appStore.resetAnalysis()}
            title="开始新分析"
            aria-label="开始新分析"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>新建</span>
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => appStore.toggleSidebar()}
            aria-label={sidebarCollapsed ? '展开复盘历史' : '折叠复盘历史'}
            title="复盘历史"
          >
            <History size={18} />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => appStore.set({ page: 'settings' })}
            aria-label="设置"
            title="设置"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      <div className="app-body">
        <Sidebar />
        <div className="main-column">
          <main className="main">
            {page === 'home' && <HomePage />}
            {page === 'processing' && <ProcessingPage />}
            {page === 'results' && <ResultsPage />}
            {page === 'settings' && <SettingsPage />}
          </main>
          <footer className="footer">配置、逐字稿与复盘结果仅保存在本浏览器，不会上传到任何服务器。</footer>
        </div>
      </div>
    </div>
  )
}
