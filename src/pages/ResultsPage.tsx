import { useMemo } from 'react'
import { Download, Mic, RefreshCw, Repeat } from 'lucide-react'
import { useApp, appStore } from '../store/appStore'
import { WINDOWS } from '../config/constants'
import type { WindowDef } from '../config/constants'
import WindowCard from '../components/WindowCard'
import CopyButton from '../components/CopyButton'
import { downloadText } from '../lib/download'

const EXTRA_DEF: WindowDef = {
  key: '__unmatched',
  title: '其他内容（未按约定格式输出）',
  description: '模型输出的内容未能匹配到任一窗口，原样展示供参考',
}

export default function ResultsPage() {
  const { windows, transcript, background, analyzedAt } = useApp()
  const hasData = !!transcript && Object.keys(windows).length > 0

  const sections = useMemo(() => {
    const list: { def: WindowDef; content?: string }[] = []
    for (const w of WINDOWS) list.push({ def: w, content: windows[w.key] })
    if (windows.__unmatched?.trim()) list.push({ def: EXTRA_DEF, content: windows.__unmatched })
    return list
  }, [windows])

  const allMarkdown = useMemo(() => {
    const parts: string[] = []
    for (const w of WINDOWS) {
      const c = windows[w.key]?.trim()
      if (c) parts.push(`# ${w.title}\n\n${c}`)
    }
    if (windows.__unmatched?.trim()) parts.push(`# ${EXTRA_DEF.title}\n\n${windows.__unmatched}`)
    return parts.join('\n\n---\n\n')
  }, [windows])

  if (!hasData) {
    return (
      <div className="page">
        <section className="card empty-state">
          <div className="empty-state-icon">
            <Mic size={20} />
          </div>
          <p className="empty-state-text">暂无复盘结果</p>
          <button className="btn btn-primary" onClick={() => appStore.set({ page: 'home' })}>
            去上传录音
          </button>
        </section>
      </div>
    )
  }

  const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
  const bgChips = [
    background.position && `职位：${background.position}`,
    background.company && `公司：${background.company}`,
    background.round && `轮次：${background.round}`,
    background.note && `备注：${background.note}`,
  ].filter(Boolean)

  return (
    <div className="page">
      <section className="result-header">
        <div>
          <h1 className="page-title">复盘结果</h1>
          <p className="page-sub">
            分析时间：{analyzedAt ? new Date(analyzedAt).toLocaleString('zh-CN', { hour12: false }) : '—'}
            {bgChips.length > 0 && ` ｜ ${bgChips.join(' ｜ ')}`}
          </p>
        </div>
        <div className="btn-row">
          <CopyButton text={allMarkdown} label="复制全部" />
          <button className="btn btn-ghost" onClick={() => downloadText(`面试复盘_${ts}.md`, allMarkdown)}>
            <Download size={14} />
            <span>导出 .md</span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              // 保留已缓存的逐字稿，仅重新生成总结
              appStore.set({ windows: {}, analyzedAt: null, page: 'processing' })
            }}
          >
            <RefreshCw size={14} />
            <span>重新总结</span>
          </button>
          <button className="btn btn-ghost btn-danger-ghost" onClick={() => appStore.resetAnalysis()}>
            <Repeat size={14} />
            <span>重新分析</span>
          </button>
        </div>
      </section>
      <div className="grid">
        {sections.map((s) => (
          <WindowCard key={s.def.key} def={s.def} content={s.content} />
        ))}
      </div>
    </div>
  )
}
