'use client'
import { useState } from 'react'

type Props = {
  children: React.ReactNode
  className?: string
  href?: string
}

export default function InteractiveButton({ children, className, href }: Props) {
  const [loading, setLoading] = useState(false)
  const cls = (className || '') + (loading ? ' is-loading' : '')
  const onClick = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick} aria-busy={loading} aria-live="polite">
        {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
        <span>{children}</span>
      </a>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-busy={loading} aria-live="polite">
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}