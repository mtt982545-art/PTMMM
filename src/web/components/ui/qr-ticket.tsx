"use client"
import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type Props = { token: string; size?: number }

export default function QrTicketCard({ token, size = 128 }: Props) {
  const ref = useRef<SVGSVGElement | null>(null)
  function download() {
    const el = ref.current
    if (!el) return
    const svg = el.outerHTML
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${token}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  function print() {
    const el = ref.current
    if (!el) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${token}</title></head><body style="margin:0;display:grid;place-items:center;">${el.outerHTML}<div style="margin-top:8px;font-family:sans-serif;color:#333;">${token}</div></body></html>`)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }
  return (
    <div className="flex items-center gap-2">
      <QRCodeSVG ref={ref as any} value={token} size={size} />
      <button onClick={print} className="ui-btn ui-btn--outline ui-pressable">Cetak</button>
      <button onClick={download} className="ui-btn ui-btn--outline ui-pressable">Unduh</button>
    </div>
  )
}
