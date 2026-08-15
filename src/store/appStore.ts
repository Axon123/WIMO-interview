/**
 * 极简全局 store（无外部依赖），配合 useSyncExternalStore 使用。
 * 配置、转写结果、总结结果都会持久化到 localStorage（音频文件本体不存）。
 */
import { useSyncExternalStore } from 'react'
import type { AppConfig, BackgroundInfo } from '../config/constants'
import { defaultConfig, EMPTY_BACKGROUND, STT_PROVIDER_IDS } from '../config/constants'

const STORAGE_KEY = 'wimo-interview:v1'
/** 旧版本（interview-notes:v1）的 localStorage key，用于一次性迁移老用户数据 */
const LEGACY_STORAGE_KEYS = ['interview-notes:v1'] as const
/** 历史记录条数上限：单条历史（transcript + windows）可达 1-2MB，localStorage 5-10MB 容量有限 */
const MAX_HISTORY = 15
/** localStorage 写入容量上限：超过则丢弃最旧的历史直到能写进去 */
const MAX_STORAGE_BYTES = 4 * 1024 * 1024

/** 一次完整的复盘记录（侧边栏历史列表用） */
export interface HistoryItem {
  id: string
  fileName: string
  analyzedAt: number
  background: BackgroundInfo
  transcript: string
  windows: Record<string, string>
}

interface Persisted {
  config: AppConfig
  background: BackgroundInfo
  transcript: string | null
  windows: Record<string, string>
  analyzedAt: number | null
  /** 复盘历史列表（侧边栏） */
  history: HistoryItem[]
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean
}

export type Page = 'home' | 'processing' | 'results' | 'settings'

export interface AppState extends Persisted {
  page: Page
  /** 待处理的音频文件（仅保存在内存，不持久化） */
  file: File | null
}

function loadPersisted(): Persisted {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    // 一次性迁移：老 key（interview-notes:v1）有数据时搬到新 key 并删老 key
    if (!raw) {
      for (const oldKey of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(oldKey)
        if (legacy) {
          try {
            localStorage.setItem(STORAGE_KEY, legacy)
            localStorage.removeItem(oldKey)
            raw = legacy
            break
          } catch {
            // 迁移失败就继续走默认
          }
        }
      }
    }
    if (!raw) {
      return {
        config: defaultConfig(),
        background: EMPTY_BACKGROUND,
        transcript: null,
        windows: {},
        analyzedAt: null,
        history: [],
        sidebarCollapsed: isMobile,
      }
    }
    const data = JSON.parse(raw) as Partial<Persisted>
    // 迁移：旧版本如果保存了不在 STT 列表里的 providerId，重置为 mimo 的全部默认值
    const loadedStt = { ...defaultConfig().stt, ...data.config?.stt }
    if (!(STT_PROVIDER_IDS as readonly string[]).includes(loadedStt.providerId)) {
      loadedStt.providerId = defaultConfig().stt.providerId
      loadedStt.baseUrl = defaultConfig().stt.baseUrl
      loadedStt.model = defaultConfig().stt.model
      loadedStt.apiType = defaultConfig().stt.apiType
      loadedStt.maxSizeMb = defaultConfig().stt.maxSizeMb
    }
    // 迁移：旧开发期反代路径 /__mimo__/v1 已废弃，替换为真实 URL
    if (loadedStt.baseUrl === '/__mimo__/v1') {
      loadedStt.baseUrl = 'https://api.xiaomimimo.com/v1'
    }
    return {
      config: { ...defaultConfig(), ...data.config, stt: loadedStt, summary: { ...defaultConfig().summary, ...data.config?.summary } },
      background: { ...EMPTY_BACKGROUND, ...data.background },
      transcript: typeof data.transcript === 'string' ? data.transcript : null,
      windows: data.windows && typeof data.windows === 'object' ? data.windows : {},
      analyzedAt: typeof data.analyzedAt === 'number' ? data.analyzedAt : null,
      history: Array.isArray(data.history) ? data.history.filter(isValidHistoryItem) : [],
      sidebarCollapsed: !!data.sidebarCollapsed,
    }
  } catch {
    return {
      config: defaultConfig(),
      background: EMPTY_BACKGROUND,
      transcript: null,
      windows: {},
      analyzedAt: null,
      history: [],
      sidebarCollapsed: isMobile,
    }
  }
}

function isValidHistoryItem(h: unknown): h is HistoryItem {
  return !!h && typeof h === 'object' && typeof (h as HistoryItem).id === 'string' && typeof (h as HistoryItem).fileName === 'string' && typeof (h as HistoryItem).analyzedAt === 'number'
}

let state: AppState = (() => {
  const persisted = loadPersisted()
  // 恢复上次所在的 page：仅在已有分析结果时才有意义（避免冷启动跳到 results 但没数据）
  let initialPage: Page = 'home'
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as { page?: Page; analyzedAt?: number | null }
        if (data.page && ['home', 'processing', 'results', 'settings'].includes(data.page) && data.analyzedAt) {
          initialPage = data.page
        }
      }
    } catch { /* ignore */ }
  }
  return { page: initialPage, file: null, ...persisted }
})()

type Listener = () => void
const listeners = new Set<Listener>()

/** 从最新到最旧丢弃历史直到序列化结果能塞进 MAX_STORAGE_BYTES。返回修剪后的 history。 */
function pruneBySize(history: HistoryItem[]): HistoryItem[] {
  let cur = history
  // 用每个元素的"近似大小"做累计求和，O(n) 一次扫描即可定位截断点
  const sizes = history.map((h) => (h.transcript?.length || 0) + Object.values(h.windows).join('').length)
  let total = sizes.reduce((a, b) => a + b, 0)
  while (total > MAX_STORAGE_BYTES && cur.length > 1) {
    const dropped = cur.pop()!
    total -= sizes[cur.length] // 同步减去被丢弃的那条大小
    void dropped
  }
  return cur
}

function persist() {
  try {
    const data: Persisted & { page?: Page } = {
      config: state.config,
      background: state.background,
      transcript: state.transcript,
      windows: state.windows,
      analyzedAt: state.analyzedAt,
      history: state.history,
      sidebarCollapsed: state.sidebarCollapsed,
      page: state.page,
    }
    // 写入前先按大小裁剪，避免超出 localStorage 配额（QuotaExceededError）
    state.history = pruneBySize(state.history)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage 不可用（如隐私模式）或配额超限时静默降级，仅本次会话内有效
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const appStore = {
  get: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...p }
    persist()
    listeners.forEach((l) => l())
  },
  /** 清除分析结果，返回首页重新开始 */
  resetAnalysis() {
    appStore.set({ file: null, transcript: null, windows: {}, analyzedAt: null, page: 'home' })
  },
  /** 新增一条历史到列表头部；超出 MAX_HISTORY 时丢掉最旧的 */
  addHistory(item: Omit<HistoryItem, 'id'>) {
    const newItem: HistoryItem = { ...item, id: newId() }
    const history = [newItem, ...state.history].slice(0, MAX_HISTORY)
    appStore.set({ history })
  },
  /** 删除一条历史 */
  removeHistory(id: string) {
    appStore.set({ history: state.history.filter((h) => h.id !== id) })
  },
  /** 把历史项加载到当前视图：替换 transcript/windows/analyzedAt/background，跳到结果页 */
  loadHistory(id: string) {
    const item = state.history.find((h) => h.id === id)
    if (!item) return
    appStore.set({
      transcript: item.transcript,
      windows: item.windows,
      analyzedAt: item.analyzedAt,
      background: item.background,
      page: 'results',
    })
  },
  /** 切换侧边栏折叠状态 */
  toggleSidebar() {
    appStore.set({ sidebarCollapsed: !state.sidebarCollapsed })
  },
}

export function useApp(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.get)
}
