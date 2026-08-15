import type { ReactNode } from 'react'

interface Props {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export default function FormField({ label, hint, children, className }: Props) {
  return (
    <label className={`field${className ? ' ' + className : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
