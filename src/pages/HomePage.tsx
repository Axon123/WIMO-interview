import { useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { ArrowRight, FileAudio, Mic, UploadCloud, X } from 'lucide-react'
import { useApp, appStore } from '../store/appStore'
import { ALLOWED_ACCEPT, ALLOWED_EXTENSIONS, WINDOWS } from '../config/constants'

const ROUND_OPTIONS = ['一面', '二面', '三面', '技术面', 'HR 面', '其他']

function isAllowed(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_EXTENSIONS.includes(ext)
}

export default function HomePage() {
  const { config, file, background, transcript, windows, analyzedAt } = useApp()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const maxSizeMb = config.stt.maxSizeMb || 25

  const hasResults = !!transcript && Object.keys(windows).length > 0

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return
    if (!isAllowed(f.name)) {
      setError(`不支持的文件格式，请上传：${ALLOWED_EXTENSIONS.join(' / ')}`)
      return
    }
    setError('')
    // 超过接口限制不拦截：应用会自动分片转写（仅当浏览器无法解码该格式时才在转写阶段报错）
    setWarning(
      f.size > maxSizeMb * 1024 * 1024
        ? `文件超过 ${maxSizeMb}MB（服务商单次转写限制），将自动分片转写（按 3 分钟一段），耗时稍长`
        : '',
    )
    // 选择新文件时清掉上一次的分析结果，避免误用旧逐字稿
    appStore.set({ file: f, transcript: null, windows: {}, analyzedAt: null })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0])
    e.target.value = ''
  }

  const sttOk = !!(config.stt.baseUrl && config.stt.apiKey && config.stt.model)
  const summaryOk = !!(config.summary.baseUrl && config.summary.apiKey && config.summary.model)
  const canStart = !!file && sttOk && summaryOk

  const start = () => {
    if (!file) return
    if (!sttOk || !summaryOk) return
    appStore.set({ page: 'processing' })
  }

  return (
    <div className="page">
      {hasResults && (
        <div className="banner">
          <span>已有一次分析结果 · {analyzedAt ? new Date(analyzedAt).toLocaleString('zh-CN', { hour12: false }) : ''}</span>
          <button className="banner-link" onClick={() => appStore.set({ page: 'results' })}>
            点击查看 <ArrowRight size={14} />
          </button>
        </div>
      )}

      <section className="card">
        <h1 className="page-title">上传面试录音</h1>
        <p className="page-sub">
          支持 mp3 / wav / m4a / flac / ogg 等格式，超过 {maxSizeMb}MB（接口单次转写限制）的录音将自动分片转写。录音将只发送给你配置的 AI 服务商。
        </p>

        <div
          className={`dropzone${dragging ? ' dragover' : ''}${file ? ' has-file' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept={ALLOWED_ACCEPT} onChange={onPick} hidden />
          {file ? (
            <div className="file-chip">
              <FileAudio size={16} />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  appStore.set({ file: null })
                }}
                aria-label="移除文件"
              >
                <X size={14} />
                <span>移除</span>
              </button>
            </div>
          ) : (
            <>
              <div className="dropzone-icon">
                <UploadCloud size={20} />
              </div>
              <div className="dropzone-text">拖入或点击上传面试录音</div>
              <div className="dropzone-sub">
                支持 {ALLOWED_EXTENSIONS.join(' / ')}，单文件 ≤ {maxSizeMb}MB 自动分片
              </div>
            </>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        {warning && <p className="warn-text">{warning}</p>}

        <details className="bg-disclosure">
          <summary className="bg-disclosure-summary">添加面试背景信息（让总结更精准）</summary>
          <div className="bg-grid">
            <label className="field">
              <span className="field-label">应聘职位</span>
              <input
                type="text"
                placeholder="如：前端工程师"
                value={background.position}
                onChange={(e) => appStore.set({ background: { ...background, position: e.target.value } })}
              />
            </label>
            <label className="field">
              <span className="field-label">目标公司</span>
              <input
                type="text"
                placeholder="如：某科技公司（可不填）"
                value={background.company}
                onChange={(e) => appStore.set({ background: { ...background, company: e.target.value } })}
              />
            </label>
            <label className="field">
              <span className="field-label">面试轮次</span>
              <select value={background.round} onChange={(e) => appStore.set({ background: { ...background, round: e.target.value } })}>
                <option value="">不选</option>
                {ROUND_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span className="field-label">备注</span>
              <input
                type="text"
                placeholder="如：偏重项目深挖，其他补充信息（可不填）"
                value={background.note}
                onChange={(e) => appStore.set({ background: { ...background, note: e.target.value } })}
              />
            </label>
          </div>
        </details>

        <div className="start-row">
          {(!sttOk || !summaryOk) && (
            <p className="warn-text">
              {!sttOk && '转写 API 未配置完整；'}
              {!summaryOk && '总结 API 未配置完整；'}
              <button className="btn-link" onClick={() => appStore.set({ page: 'settings' })}>
                前往设置 →
              </button>
            </p>
          )}
          <button className="btn btn-primary btn-lg" disabled={!canStart} onClick={start}>
            <Mic size={16} />
            <span>开始分析</span>
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">分析后你将获得</h2>
        <ul className="intro-list">
          {WINDOWS.filter((w) => w.key !== 'transcript').map((w) => (
            <li key={w.key}>
              <strong>{w.title}</strong> — {w.description}
            </li>
          ))}
        </ul>
        <p className="intro-note">每个窗口均支持一键复制 Markdown 原文，方便粘贴到你的笔记工具。</p>
      </section>
    </div>
  )
}
