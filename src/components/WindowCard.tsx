import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { WindowDef } from '../config/constants'
import CopyButton from './CopyButton'

interface Props {
  def: WindowDef
  content?: string
}

/**
 * 结果窗口卡片：标题栏 + Markdown 内容 + 复制按钮。
 * 复制的是该窗口的 Markdown 原文（含一级标题），粘贴到笔记工具后格式保持。
 * 安全说明：react-markdown 未启用 rehype-raw，原始 HTML 不会被渲染为 HTML，
 * 天然避免 XSS，无需额外的 HTML 清洗依赖。
 */
export default function WindowCard({ def, content }: Props) {
  const trimmed = content?.trim()
  const source = `# ${def.title}\n\n${trimmed ?? ''}`

  return (
    <section className="card window-card">
      <header className="card-header">
        <div>
          <h2 className="card-title">{def.title}</h2>
          {def.description && <p className="card-desc">{def.description}</p>}
        </div>
        {trimmed && <CopyButton text={source} iconOnly />}
      </header>
      <div className="card-body">
        {trimmed ? (
          <div className="md-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
          </div>
        ) : (
          <div className="placeholder">（未生成）</div>
        )}
      </div>
    </section>
  )
}
