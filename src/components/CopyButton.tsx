import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../lib/copy'

interface Props {
  text: string
  label?: string
  /** When true, render as a 28×28 icon-only button (used on result card headers). */
  iconOnly?: boolean
}

/** 复制按钮：复制成功后短暂显示「已复制」反馈 */
export default function CopyButton({ text, label = '复制', iconOnly = false }: Props) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        className={`btn btn-ghost btn-icon${copied ? ' copied' : ''}`}
        onClick={onClick}
        aria-label={copied ? '已复制' : label}
        title={copied ? '已复制' : label}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    )
  }

  return (
    <button type="button" className={`btn btn-ghost btn-sm${copied ? ' copied' : ''}`} onClick={onClick}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? '已复制' : label}</span>
    </button>
  )
}
