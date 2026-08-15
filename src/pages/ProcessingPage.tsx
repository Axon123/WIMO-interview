import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, RefreshCw, X } from 'lucide-react'
import { useApp, appStore } from '../store/appStore'
import { MODEL_WINDOWS } from '../config/constants'
import { transcribeAudio, summarize, errMsg, isAbort } from '../lib/api'
import { parseSummary } from '../lib/markdown'
import StepsProgress from '../components/StepsProgress'
import type { StepState } from '../components/StepsProgress'

/**
 * 处理页：三步流水线（上传 → 转写 → 总结）。
 * - 若已有缓存的逐字稿（重新总结场景），跳过转写步骤；
 * - 每步失败可单独重试，可取消返回首页。
 */
export default function ProcessingPage() {
  const { config, file, transcript, background } = useApp()
  const [steps, setSteps] = useState<StepState[]>(() => [
    {
      id: 1,
      label: '上传音频',
      status: file || transcript ? 'done' : 'pending',
      detail: file ? file.name : transcript ? '使用已缓存的逐字稿' : '',
    },
    { id: 2, label: '音频转文字', status: transcript ? 'done' : 'pending', detail: transcript ? `已缓存 ${transcript.length} 字` : '' },
    { id: 3, label: 'AI 总结复盘', status: 'pending' },
  ])
  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(false)
  const streamRef = useRef<HTMLPreElement | null>(null)

  const updateStep = useCallback((id: number, patch: Partial<StepState>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const finish = useCallback(() => {
    setTimeout(() => appStore.set({ page: 'results' }), 600)
  }, [])

  /** 总结步骤（第 3 步），供主流程与重试共用 */
  const summarizeFlow = useCallback(async () => {
    const summaryOk = !!(config.summary.baseUrl && config.summary.apiKey && config.summary.model)
    if (!summaryOk) {
      updateStep(3, { status: 'failed', detail: '总结 API 未配置完整，请前往设置页' })
      return
    }
    // 实时从 store 读 transcript，避免 useCallback 闭包陷阱：
    // transcribeFlow 内 appStore.set({ transcript }) 后立即 await summarizeFlow()，
    // 此时本回调捕获的 transcript 还是 set 之前的旧值（空），必须直接读 store 最新值。
    const currentTranscript = appStore.get().transcript ?? ''
    if (!currentTranscript) {
      updateStep(3, { status: 'failed', detail: '逐字稿为空，请先完成音频转写' })
      return
    }
    updateStep(3, { status: 'running', detail: '正在生成各维度复盘…' })
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const md = await summarize(config.summary, currentTranscript, background, ac.signal)
      const parsed = parseSummary(
        md,
        MODEL_WINDOWS.map((w) => ({ key: w.key, title: w.title })),
      )
      const windows: Record<string, string> = { ...parsed.windows }
      if (parsed.unmatched.length) windows.__unmatched = parsed.unmatched.join('\n\n')
      windows.transcript = currentTranscript
      const analyzedAt = Date.now()
      appStore.set({ windows, analyzedAt })
      // 写入复盘历史（侧边栏列表）。重新总结时 file 为空，回退到 background.note 或默认名。
      const currentFile = appStore.get().file
      appStore.addHistory({
        fileName: currentFile?.name || background.note || '重新总结',
        analyzedAt,
        background,
        transcript: currentTranscript,
        windows,
      })
      updateStep(3, { status: 'done', detail: '复盘生成完成' })
      finish()
    } catch (e) {
      if (isAbort(e)) return
      updateStep(3, { status: 'failed', detail: `${errMsg(e)}（Base URL: ${config.summary.baseUrl}）` })
    }
  }, [config.summary, background, updateStep, finish])

  /** 转写步骤（第 2 步），成功后自动进入总结 */
  const transcribeFlow = useCallback(async () => {
    const sttOk = !!(config.stt.baseUrl && config.stt.apiKey && config.stt.model)
    if (!sttOk) {
      updateStep(2, { status: 'failed', detail: '转写 API 未配置完整，请前往设置页' })
      return
    }
    if (!file) {
      updateStep(1, { status: 'failed', detail: '未选择音频文件，请返回首页' })
      return
    }
    updateStep(2, { status: 'running', detail: '正在上传并转写（取决于音频时长）…' })
    const ac = new AbortController()
    abortRef.current = ac
    try {
      // 每段转写完立即把该段文字追加到 store 的 transcript，让 UI 边转边显示
      const onChunkText = (chunk: string) => {
        if (!chunk) return
        const cur = appStore.get().transcript ?? ''
        appStore.set({ transcript: cur ? `${cur}\n${chunk}` : chunk })
      }
      const text = await transcribeAudio(
        config.stt,
        file,
        ac.signal,
        (msg) => updateStep(2, { detail: msg }),
        onChunkText,
      )
      appStore.set({ transcript: text })
      updateStep(2, { status: 'done', detail: `转写完成，共 ${text.length} 字` })
      await summarizeFlow()
    } catch (e) {
      if (isAbort(e)) return
      // 附上实际请求的地址与文件信息，便于区分旧配置/填错地址/文件问题等环境因素
      const sizeMb = (file.size / 1024 / 1024).toFixed(1)
      const chunked = file.size > (Math.max(1, config.stt.maxSizeMb || 25) * 1024 * 1024) ? '是（自动分片）' : '否'
      updateStep(2, {
        status: 'failed',
        detail: `${errMsg(e)}（Base URL: ${config.stt.baseUrl}｜文件: ${file.name} ${sizeMb}MB｜分片: ${chunked}）`,
      })
    }
  }, [config.stt, file, updateStep, summarizeFlow])

  const run = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    if (!transcript) {
      await transcribeFlow()
    } else {
      await summarizeFlow()
    }
  }, [transcript, transcribeFlow, summarizeFlow])

  useEffect(() => {
    run()
  }, [run])

  /** 实时逐字稿区：transcript 每追加一段就自动滚到底 */
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript])

  const cancel = () => {
    abortRef.current?.abort()
    appStore.set({ page: 'home' })
  }

  const failedStep = steps.find((s) => s.status === 'failed')
  const step2 = steps[1]
  const step3 = steps[2]
  const streamStatus =
    step2?.status === 'running' ? '转写中…' : step3?.status === 'running' ? '总结中…' : ''

  return (
    <div className="page processing-page">
      <section className="card" style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
        <h1 className="page-title">正在分析</h1>
        <StepsProgress steps={steps} />

        {transcript && !failedStep && (
          <div className="streaming-transcript">
            <div className="streaming-header">
              <FileText size={14} />
              <span>实时转写</span>
              <span className="streaming-meta">
                {transcript.length.toLocaleString()} 字{streamStatus ? ` · ${streamStatus}` : ''}
              </span>
            </div>
            <pre ref={streamRef} className="streaming-content">{transcript}</pre>
          </div>
        )}

        {failedStep && (
          <div className="error-box">
            <p className="error-title">
              第 {failedStep.id} 步（{failedStep.label}）失败
            </p>
            <p className="error-text">{failedStep.detail}</p>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={() => {
                  startedRef.current = false
                  if (failedStep.id === 2) transcribeFlow()
                  else if (failedStep.id === 3) summarizeFlow()
                  else run()
                }}
              >
                <RefreshCw size={14} />
                <span>重试</span>
              </button>
              <button className="btn btn-ghost" onClick={cancel}>
                返回首页
              </button>
            </div>
          </div>
        )}

        {!failedStep && (
          <div className="btn-row center">
            <button className="btn btn-ghost" onClick={cancel}>
              <X size={14} />
              <span>取消</span>
            </button>
          </div>
        )}
        <p className="hint-text">转写耗时取决于录音时长，请耐心等待；期间可切到设置页（正在进行的请求不受影响）。</p>
      </section>
    </div>
  )
}
