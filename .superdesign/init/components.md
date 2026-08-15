# Components — Interview_Notes

Shared UI primitives. All in `src/components/`. No `src/components/ui/` subfolder; this project's "primitives" are small enough to live flat.

## CopyButton — `src/components/CopyButton.tsx`

Reusable copy-to-clipboard button with a 2s "已复制 ✓" feedback. Used on every WindowCard and on the results-page header.

```tsx
import { useState } from 'react'
import { copyText } from '../lib/copy'

interface Props {
  text: string
  label?: string
}

/** 复制按钮：复制成功后短暂显示「已复制」反馈 */
export default function CopyButton({ text, label = '复制' }: Props) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button type="button" className={`btn btn-ghost btn-sm${copied ? ' copied' : ''}`} onClick={onClick}>
      {copied ? '已复制 ✓' : `📋 ${label}`}
    </button>
  )
}
```

Props: `text: string`, `label?: string` (default `'复制'`). Renders as `.btn.btn-ghost.btn-sm`, gains `.copied` class on success.

## FormField — `src/components/FormField.tsx`

Label + child input + optional hint. Vertical flex column, used inside every Settings form card.

```tsx
import type { ReactNode } from 'react'

interface Props {
  label: string
  hint?: string
  children: ReactNode
}

export default function FormField({ label, hint, children }: Props) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
```

Props: `label: string`, `hint?: string`, `children: ReactNode`. Wraps everything in a `<label>` so the child input/select/textarea is implicitly associated.

## StepsProgress — `src/components/StepsProgress.tsx`

Three-step horizontal pipeline indicator with status dot, label, optional detail text, and connecting line. Used only on the Processing page.

```tsx
export type StepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface StepState {
  id: number
  label: string
  status: StepStatus
  detail?: string
}

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '',
  running: '',
  done: '✓',
  failed: '✕',
}

/** 三步处理进度条：上传音频 → 音频转文字 → AI 总结复盘 */
export default function StepsProgress({ steps }: { steps: StepState[] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={s.id} className={`step ${s.status}`}>
          <span className="step-dot">{STATUS_ICON[s.status]}</span>
          <div className="step-text">
            <div className="step-label">
              {i + 1}. {s.label}
            </div>
            {s.detail && <div className="step-detail">{s.detail}</div>}
          </div>
          {i < steps.length - 1 && <span className={`step-line${s.status === 'done' ? ' done' : ''}`} />}
        </li>
      ))}
    </ol>
  )
}
```

Props: `steps: StepState[]` where each step has `id`, `label`, `status` (`pending|running|done|failed`), and optional `detail`.

## WindowCard — `src/components/WindowCard.tsx`

Result-window card with title, description, Markdown body (via `react-markdown` + `remark-gfm`), and a top-right CopyButton. Used in a 2-up grid on the Results page.

```tsx
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
        <div className="card-title-wrap">
          <h2 className="card-title">{def.title}</h2>
          {def.description && <p className="card-desc">{def.description}</p>}
        </div>
        {trimmed && <CopyButton text={source} />}
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
```

Props: `def: WindowDef` (with `key`, `title`, optional `description`), `content?: string`. If `content` is empty/whitespace, renders a "（未生成）" placeholder and no CopyButton.

## Other component-style items

- **Sidebar** — see `layouts.md`. It's a route-aware component, not a primitive.
- **No Button / Card / Input / Select primitive components exist.** They are styled directly via global classes (`.btn`, `.card`, `.field input`).
