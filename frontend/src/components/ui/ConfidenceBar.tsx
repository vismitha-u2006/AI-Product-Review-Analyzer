import React from 'react'

interface ConfidenceBarProps {
  value?: number // 0-1
  confidence?: number // 0-1
  label?: string
  showPercent?: boolean
}

export default function ConfidenceBar({
  value,
  confidence,
  label,
  showPercent = true,
}: ConfidenceBarProps) {
  const val = confidence !== undefined ? confidence : value !== undefined ? value : 0.5
  const pct = Math.min(Math.max(val * 100, 0), 100)
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          {label && <span>{label}</span>}
          {showPercent && (
            <span style={{ color }} className="font-semibold">
              {pct.toFixed(1)}%
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
