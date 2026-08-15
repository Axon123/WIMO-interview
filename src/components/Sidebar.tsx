/**
 * 左侧复盘历史侧边栏。
 * - 展开态：240px，列表显示文件名 / 时间 / 字数
 * - 折叠态：56px，只显示切换按钮 + 计数徽章
 * - 点击历史项 → 加载并跳到结果页
 * - 删除按钮独立于点击事件，避免误删
 */
import { ChevronLeft, History, Mic, Plus, X } from 'lucide-react'
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
          <History size={18} />
        </button>
        {history.length > 0 && <span className="sidebar-badge">{history.length}</span>}
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="sidebar-new"
        onClick={() => appStore.resetAnalysis()}
        title="开始新分析"
        aria-label="开始新分析"
      >
        <Plus size={14} strokeWidth={2.5} />
        <span>新建分析</span>
      </button>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <History size={14} /> 复盘历史
        </h2>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => appStore.toggleSidebar()}
          title="折叠侧边栏"
          aria-label="折叠侧边栏"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="sidebar-empty">
          <div className="sidebar-empty-icon">
            <Mic size={18} />
          </div>
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
                    <X size={14} />
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
