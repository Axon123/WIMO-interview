# Layouts — Interview_Notes

The app has no `src/layouts/` directory. The shell is composed directly in `src/App.tsx`, and the only "layout" component is the history sidebar.

## App shell — `src/App.tsx`

Top bar (sticky) + horizontal body (Sidebar + main) + footer. `page` state from `appStore` decides which page renders. Renders one of: `HomePage`, `ProcessingPage`, `ResultsPage`, `SettingsPage`.

```tsx
import { useApp, appStore } from './store/appStore'
import HomePage from './pages/HomePage'
import ProcessingPage from './pages/ProcessingPage'
import ResultsPage from './pages/ResultsPage'
import SettingsPage from './pages/SettingsPage'
import Sidebar from './components/Sidebar'

export default function App() {
  const { page } = useApp()

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🎙️ 面试录音复盘助手</div>
        <nav>
          <button
            type="button"
            className={page === 'home' || page === 'processing' || page === 'results' ? 'active' : ''}
            onClick={() => appStore.set({ page: 'home' })}
          >
            首页
          </button>
          <button type="button" className={page === 'settings' ? 'active' : ''} onClick={() => appStore.set({ page: 'settings' })}>
            设置
          </button>
        </nav>
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="main">
          {page === 'home' && <HomePage />}
          {page === 'processing' && <ProcessingPage />}
          {page === 'results' && <ResultsPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>

      <footer className="footer">配置、逐字稿与复盘结果仅保存在本浏览器，不会上传到任何服务器。</footer>
    </div>
  )
}
```

Key layout facts:
- Topbar is `sticky; top: 0; z-index: 10; padding: 12px 24px; backdrop-filter: blur(8px)`. Brand on the left, two-button nav (首页 / 设置) on the right.
- `.app-body` is a horizontal flex: `<Sidebar />` then `<main className="main">`. Main is `flex: 1; max-width: 1200px; padding: 24px`.
- Footer is a single short line at the bottom.
- The topbar's "首页" button is the active state for `home | processing | results` (so the user sees where they are even mid-flow).

## Sidebar — `src/components/Sidebar.tsx`

Left rail showing past analysis records. Two visual modes:
- **Expanded** (260px): header with "📚 复盘历史" + collapse toggle «, then a scrollable list. Each item shows truncated filename + relative time + char count. Click loads the record; an × delete button appears on hover.
- **Collapsed** (60px): just a 36×36 expand button and a circular badge with the record count.
- **Empty state**: centered 🎙️ icon + "还没有复盘记录 / 完成一次分析后会自动保存在这里".

On viewports ≤768px the expanded sidebar becomes a fixed overlay.

```tsx
/**
 * 左侧复盘历史侧边栏。
 * - 展开态：260px，列表显示文件名 / 时间 / 字数
 * - 折叠态：60px，只显示切换按钮 + 计数徽章
 * - 点击历史项 → 加载并跳到结果页
 * - 删除按钮独立于点击事件，避免误删
 */
import { useApp, appStore } from '../store/appStore'

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期 */
function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

/** 文件名过长时截断，保留扩展名 */
function shortName(name: string, max = 22): string {
  if (name.length <= max) return name
  const ext = name.match(/\.[^.]+$/)?.[0] ?? ''
  const base = name.slice(0, max - ext.length - 1)
  return `${base}…${ext}`
}

function totalChars(item: { transcript: string; windows: Record<string, string> }): number {
  return item.transcript.length + Object.values(item.windows).join('').length
}

export default function Sidebar() {
  const { history, sidebarCollapsed, analyzedAt } = useApp()

  if (sidebarCollapsed) {
    return (
      <aside className="sidebar collapsed">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => appStore.toggleSidebar()}
          title="展开复盘历史"
          aria-label="展开复盘历史"
        >
          📚
        </button>
        {history.length > 0 && <span className="sidebar-badge">{history.length}</span>}
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">📚 复盘历史</h2>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => appStore.toggleSidebar()}
          title="折叠侧边栏"
          aria-label="折叠侧边栏"
        >
          «
        </button>
      </div>

      {history.length === 0 ? (
        <div className="sidebar-empty">
          <div className="sidebar-empty-icon">🎙️</div>
          <p>还没有复盘记录</p>
          <p className="sidebar-empty-sub">完成一次分析后会自动保存在这里</p>
        </div>
      ) : (
        <ul className="history-list">
          {history.map((item) => {
            const isCurrent = item.analyzedAt === analyzedAt
            return (
              <li
                key={item.id}
                className={`history-item${isCurrent ? ' current' : ''}`}
                onClick={() => appStore.loadHistory(item.id)}
                title={item.fileName}
              >
                <div className="history-row">
                  <div className="history-name">{shortName(item.fileName)}</div>
                  <button
                    type="button"
                    className="history-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`删除「${item.fileName}」的复盘记录？`)) appStore.removeHistory(item.id)
                    }}
                    title="删除"
                    aria-label="删除"
                  >
                    ×
                  </button>
                </div>
                <div className="history-meta">
                  <span>{formatTime(item.analyzedAt)}</span>
                  <span>·</span>
                  <span>{totalChars(item).toLocaleString()} 字</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
```

Layout state: `sidebarCollapsed` boolean in `appStore`, toggled by the round-square 28×28 (expanded) / 36×36 (collapsed) `.sidebar-toggle` button.
