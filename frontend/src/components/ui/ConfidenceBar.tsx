import React from 'react'

interface ConfidenceBarProps {
  value?: number // 0-1
  confidence?: number // 0-1
  sentiment?: 'positive' | 'negative' | 'neutral'
  label?: string
  showPercent?: boolean
}

export default function ConfidenceBar({
  value,
  confidence,
  sentiment,
  label,
  showPercent = true,
}: ConfidenceBarProps) {
  const val = confidence !== undefined ? confidence : value !== undefined ? value : 0.5
  const pct = Math.min(Math.max(val * 100, 0), 100)

  // Color bar by sentiment if specified, otherwise by confidence certainty
  let color = '#3b82f6'
  if (sentiment === 'positive') {
    color = '#10b981' // Green
  } else if (sentiment === 'negative') {
    color = '#ef4444' // Red
  } else if (sentiment === 'neutral') {
    color = '#f59e0b' // Yellow
  } else {
    color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
  }

  const sentimentTag = sentiment ? ` (${sentiment.toUpperCase()})` : ''

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          {label && <span>{label}</span>}
          {showPercent && (
            <span style={{ color }} className="font-semibold">
              {pct.toFixed(1)}%{sentimentTag}
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
