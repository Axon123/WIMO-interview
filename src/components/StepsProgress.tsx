import { Check, Loader2, X } from 'lucide-react'

export type StepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface StepState {
  id: number
  label: string
  status: StepStatus
  detail?: string
}

/** 三步处理进度条：上传音频 → 音频转文字 → AI 总结复盘 */
export default function StepsProgress({ steps }: { steps: StepState[] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1
        return (
          <li key={s.id} className={`step ${s.status}`} style={{ display: 'inline-flex' }}>
            <span className="step-dot" aria-hidden>
              {s.status === 'done' && <Check size={18} strokeWidth={2.5} />}
              {s.status === 'running' && <Loader2 size={18} className="spin" />}
              {s.status === 'failed' && <X size={18} strokeWidth={2.5} />}
              {s.status === 'pending' && <span>{s.id}</span>}
            </span>
            <div className="step-text">
              <div className="step-label">{s.label}</div>
              {s.detail && <div className="step-detail">{s.detail}</div>}
            </div>
            {!isLast && <span className={`step-line${s.status === 'done' ? ' done' : ''}`} />}
          </li>
        )
      })}
    </ol>
  )
}
