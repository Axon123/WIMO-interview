import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Activity, CheckCircle2, Download, Eye, EyeOff, Headphones, RotateCcw, Settings as SettingsIcon, Shield, Sparkles, Upload, Zap } from 'lucide-react'
import { useApp, appStore } from '../store/appStore'
import type { AppConfig, SttApiType, SttConfig, SummaryConfig } from '../config/constants'
import { buildDefaultPrompt, defaultConfig, LANGUAGES, PROVIDERS, STT_PROVIDER_IDS } from '../config/constants'
import type { DiagItem } from '../lib/api'
import { errMsg, runNetworkDiagnostics, testSttConnection, testSummaryConnection } from '../lib/api'
import { downloadText } from '../lib/download'
import FormField from '../components/FormField'

interface TestState {
  busy: boolean
  ok: boolean | null
  msg: string
}

const IDLE_TEST: TestState = { busy: false, ok: null, msg: '' }

function applyProviderPreset(id: string, set: (patch: Partial<SttConfig>) => void, stt: boolean) {
  const preset = PROVIDERS.find((p) => p.id === id)
  if (!preset) return
  const patch: Partial<SttConfig> = { providerId: id }
  if (preset.baseUrl) patch.baseUrl = preset.baseUrl
  const model = stt ? preset.sttModel : preset.summaryModel
  if (model) patch.model = model
  if (stt && preset.apiType) patch.apiType = preset.apiType
  set(patch)
}

/** 密码输入框，带显示/隐藏切换 */
function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="password-field">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? '隐藏' : '显示'}
        title={show ? '隐藏' : '显示'}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function TestResultLine({ test }: { test: TestState }) {
  if (test.busy) {
    return (
      <span className="test-pill" style={{ background: 'var(--surface-muted)', color: 'var(--text-2)' }}>
        测试中…
      </span>
    )
  }
  if (test.ok === null) return null
  return (
    <span className={`test-pill ${test.ok ? 'ok' : 'fail'}`}>
      {test.ok ? <CheckCircle2 size={12} /> : null}
      {test.msg}
    </span>
  )
}

/** 转写（STT）配置卡片 */
function SttCard() {
  const { config } = useApp()
  const [test, setTest] = useState<TestState>(IDLE_TEST)
  const [diag, setDiag] = useState<{ busy: boolean; items: DiagItem[] }>({ busy: false, items: [] })

  const set = (patch: Partial<SttConfig>) => {
    appStore.set({ config: { ...config, stt: { ...config.stt, ...patch } } })
    setTest(IDLE_TEST)
  }

  const runTest = async () => {
    setTest({ busy: true, ok: null, msg: '正在用本地合成的 1 秒测试音频试转写…' })
    try {
      const msg = await testSttConnection(config.stt)
      setTest({ busy: false, ok: true, msg })
    } catch (e) {
      setTest({ busy: false, ok: false, msg: errMsg(e) })
    }
  }

  const runDiag = async () => {
    setDiag({ busy: true, items: [] })
    const items = await runNetworkDiagnostics(config.stt)
    setDiag({ busy: false, items })
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2 className="card-title">
            <Headphones size={16} /> 音频转文字（STT）
          </h2>
          <p className="card-desc">OpenAI 兼容语音识别接口</p>
        </div>
      </header>
      <div className="form-grid">
        <FormField label="服务商" hint={PROVIDERS.find((p) => p.id === config.stt.providerId)?.note}>
          <select value={config.stt.providerId} onChange={(e) => applyProviderPreset(e.target.value, set, true)}>
            {PROVIDERS.filter((p) => (STT_PROVIDER_IDS as readonly string[]).includes(p.id)).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="接口类型" hint="Whisper 风格上传接口；对话式音频输入接口（如小米 MiMo）">
          <select
            value={config.stt.apiType}
            onChange={(e) => {
              const apiType = e.target.value as SttApiType
              const patch: Partial<SttConfig> = { apiType }
              // 对话式接口（如 MiMo）只支持 auto/zh/en，切换时清掉非法语言值
              if (apiType === 'chat-audio' && config.stt.language && !['zh', 'en'].includes(config.stt.language)) {
                patch.language = ''
              }
              set(patch)
            }}
          >
            <option value="transcriptions">上传转写接口（/audio/transcriptions）</option>
            <option value="chat-audio">对话式音频输入（/chat/completions）</option>
          </select>
        </FormField>
        <FormField label="Base URL">
          <input type="text" placeholder="https://api.openai.com/v1" value={config.stt.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
        </FormField>
        <FormField label="API Key">
          <PasswordInput value={config.stt.apiKey} onChange={(v) => set({ apiKey: v })} placeholder="sk-…" />
        </FormField>
        <FormField label="模型" hint="OpenAI 兼容语音识别模型，如 whisper-1 / mimo-v2.5-asr">
          <input type="text" placeholder="whisper-1 / mimo-v2.5-asr" value={config.stt.model} onChange={(e) => set({ model: e.target.value })} />
        </FormField>
        <FormField
          label="识别语言"
          hint={config.stt.apiType === 'chat-audio' ? '对话式接口（如 MiMo）仅支持 自动检测 / 中文 / English，建议明确指定以提升识别效果' : '部分模型不支持该参数，不支持时请选自动检测'}
        >
          <select value={config.stt.language} onChange={(e) => set({ language: e.target.value })}>
            {(config.stt.apiType === 'chat-audio'
              ? LANGUAGES.filter((l) => !l.value || l.value === 'zh' || l.value === 'en')
              : LANGUAGES
            ).map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="最大文件大小 (MB)" hint="按服务商限制设置，如 OpenAI/Groq 为 25，MiMo 对话式接口约 7.5">
          <input
            type="number"
            min={1}
            max={200}
            value={config.stt.maxSizeMb}
            onChange={(e) => set({ maxSizeMb: Math.max(1, Number(e.target.value)) })}
          />
        </FormField>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" disabled={test.busy} onClick={runTest}>
          <Zap size={14} />
          <span>{test.busy ? '测试中…' : '测试连接'}</span>
        </button>
        <button className="btn btn-ghost" disabled={diag.busy} onClick={runDiag}>
          <Activity size={14} />
          <span>{diag.busy ? '诊断中…' : '网络诊断'}</span>
        </button>
        <TestResultLine test={test} />
      </div>
      {diag.items.length > 0 && (
        <div className="diag-box">
          <p className="diag-title">网络诊断结果（只要服务器有响应即视为网络通，HTTP 401 属正常）</p>
          <ul className="diag-list">
            {diag.items.map((it) => (
              <li key={it.name} className={it.ok ? 'ok' : 'fail'}>
                <strong>{it.name}</strong> {it.ok ? '✅' : '❌'} {it.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** 总结配置卡片 */
function SummaryCard() {
  const { config } = useApp()
  const [test, setTest] = useState<TestState>(IDLE_TEST)

  const set = (patch: Partial<SummaryConfig>) => {
    appStore.set({ config: { ...config, summary: { ...config.summary, ...patch } } })
    setTest(IDLE_TEST)
  }

  const runTest = async () => {
    setTest({ busy: true, ok: null, msg: '正在发送测试消息…' })
    try {
      const msg = await testSummaryConnection(config.summary)
      setTest({ busy: false, ok: true, msg })
    } catch (e) {
      setTest({ busy: false, ok: false, msg: errMsg(e) })
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2 className="card-title">
            <Sparkles size={16} /> 文字总结（AI 复盘）
          </h2>
          <p className="card-desc">基于转写后的逐字稿生成结构化复盘</p>
        </div>
      </header>
      <div className="form-grid">
        <FormField label="服务商" hint={PROVIDERS.find((p) => p.id === config.summary.providerId)?.note}>
          <select value={config.summary.providerId} onChange={(e) => applyProviderPreset(e.target.value, set, false)}>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Base URL">
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={config.summary.baseUrl}
            onChange={(e) => set({ baseUrl: e.target.value })}
          />
        </FormField>
        <FormField label="API Key">
          <PasswordInput value={config.summary.apiKey} onChange={(v) => set({ apiKey: v })} placeholder="sk-…" />
        </FormField>
        <FormField label="模型">
          <input type="text" placeholder="gpt-4o-mini / deepseek-chat" value={config.summary.model} onChange={(e) => set({ model: e.target.value })} />
        </FormField>
        <FormField label="temperature" hint="越低越稳定，默认 0.3">
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={config.summary.temperature}
            onChange={(e) => set({ temperature: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="max_tokens" hint="单次总结最大输出长度，默认 4096">
          <input type="number" min={256} step={256} value={config.summary.maxTokens} onChange={(e) => set({ maxTokens: Number(e.target.value) })} />
        </FormField>
        <FormField label="System Prompt（可自定义）" className="field-wide">
          <textarea
            className="prompt-area"
            rows={8}
            value={config.summary.systemPrompt}
            onChange={(e) => set({ systemPrompt: e.target.value })}
          />
        </FormField>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" disabled={test.busy} onClick={runTest}>
          <Zap size={14} />
          <span>{test.busy ? '测试中…' : '测试连接'}</span>
        </button>
        <button className="btn btn-ghost" onClick={() => set({ systemPrompt: buildDefaultPrompt() })}>
          <RotateCcw size={14} />
          <span>恢复默认提示词</span>
        </button>
        <TestResultLine test={test} />
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { config } = useApp()
  const importRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  const exportConfig = () => {
    downloadText('wimo-interview-config.json', JSON.stringify(config, null, 2), 'application/json')
  }

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file
      .text()
      .then((raw) => {
        const data = JSON.parse(raw) as Partial<AppConfig>
        if (!data || typeof data !== 'object' || !data.stt || !data.summary) throw new Error('文件格式不正确')
        const merged: AppConfig = {
          stt: { ...defaultConfig().stt, ...data.stt },
          summary: { ...defaultConfig().summary, ...data.summary },
        }
        appStore.set({ config: merged })
        setImportMsg({ ok: true, msg: '导入成功，配置已生效' })
      })
      .catch((err: unknown) => setImportMsg({ ok: false, msg: `导入失败：${errMsg(err)}` }))
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">
          <SettingsIcon size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          设置
        </h1>
        <p className="page-sub">转写与总结的 API 相互独立，可分别配置不同的服务商 / API Key / 模型。</p>
      </div>

      <SttCard />
      <SummaryCard />

      <section className="card">
        <header className="card-header">
          <div>
            <h2 className="card-title">配置管理</h2>
            <p className="card-desc">在不同设备间迁移或备份你的 API 配置</p>
          </div>
        </header>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={exportConfig}>
            <Download size={14} />
            <span>导出配置 JSON</span>
          </button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
            <Upload size={14} />
            <span>导入配置 JSON</span>
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" onChange={onImport} hidden />
        </div>
        {importMsg && <TestResultLine test={{ ...IDLE_TEST, ok: importMsg.ok, msg: importMsg.msg }} />}
      </section>

      <section className="notice-card">
        <h2 className="card-title">
          <Shield size={16} /> 隐私与安全说明
        </h2>
        <ul className="intro-list">
          <li>你的 API Key 和所有配置<strong>仅保存在本浏览器（localStorage）</strong>，不会上传到任何服务器；</li>
          <li>录音与逐字稿<strong>只发送给你配置的 AI 服务商</strong>，本应用没有任何后端；</li>
          <li>请勿将本页面（或导出的配置 JSON）分享给他人，其中的 API Key 会随浏览器数据可见；</li>
          <li>请妥善保管 API Key，避免泄露产生费用。</li>
        </ul>
      </section>
    </div>
  )
}
