/**
 * 总结结果解析：按一级标题（# 开头）切分各窗口内容。
 * 标题与窗口清单做归一化匹配（容忍「窗口1：」「：」等写法差异），
 * 匹配成功后以窗口的 key（而非标题）作为结果字典的键，与 WINDOWS 清单保持一致；
 * 未匹配到窗口名的段落归入 unmatched（由前端提示并展示）。
 */
export interface WindowSpec {
  key: string
  title: string
}

export interface ParseResult {
  /** key → 窗口内容（不含标题行） */
  windows: Record<string, string>
  unmatched: string[]
}

const H1_RE = /^#\s+(.+?)\s*$/

function norm(s: string): string {
  return s
    .trim()
    .replace(/^窗口\s*\d*\s*[：:]\s*/, '')
    .replace(/[：:，,。\s]+$/g, '')
}

export function parseSummary(raw: string, specs: WindowSpec[]): ParseResult {
  let text = raw.replace(/^\uFEFF/, '').trim()
  // 容忍模型把整个输出包在代码块里
  const firstLine = text.split('\n')[0] ?? ''
  if (/^```[a-zA-Z]*\s*$/.test(firstLine) && text.endsWith('```')) {
    text = text.split('\n').slice(1, -1).join('\n')
  }

  const titleNorm = new Map(specs.map((s) => [norm(s.title), s.key]))
  const windows: Record<string, string> = {}
  const unmatched: string[] = []

  const lines = text.split('\n')
  let current: { kind: 'window'; key: string } | { kind: 'unmatched'; key: string } | null = null
  const buf: string[] = []
  const preamble: string[] = []

  const flush = () => {
    if (!current) return
    const content = buf.join('\n').trim()
    if (content) {
      if (current.kind === 'window') windows[current.key] = content
      else unmatched.push(`## ${current.key}\n\n${content}`)
    }
    buf.length = 0
  }

  for (const line of lines) {
    const m = line.match(H1_RE)
    if (m) {
      flush()
      const t = norm(m[1])
      const key = titleNorm.get(t)
      current = key ? { kind: 'window', key } : { kind: 'unmatched', key: m[1].trim() }
      continue
    }
    if (current) buf.push(line)
    else if (line.trim()) preamble.push(line)
  }
  flush()

  const preambleText = preamble.join('\n').trim()
  if (preambleText) unmatched.push(preambleText)
  return { windows, unmatched }
}
