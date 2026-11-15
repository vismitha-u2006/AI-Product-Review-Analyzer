import React from 'react'
import { getSentimentColor, getPriorityColor, getStatusColor } from '../../utils'

interface BadgeProps {
  value?: string
  children?: React.ReactNode
  variant?: string
  className?: string
}

export default function Badge({ value, children, variant = 'default', className = '' }: BadgeProps) {
  const text = (value || (typeof children === 'string' ? children : '') || '').toLowerCase()
  let colorClass = 'text-white/70 bg-white/10'

  if (variant === 'positive' || text === 'positive') {
    colorClass = 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
  } else if (variant === 'negative' || text === 'negative') {
    colorClass = 'text-rose-400 bg-rose-500/20 border border-rose-500/30'
  } else if (variant === 'neutral' || text === 'neutral') {
    colorClass = 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
  } else if (variant === 'priority' || ['high', 'medium', 'low'].includes(text)) {
    colorClass = getPriorityColor(text.toUpperCase())
  } else if (variant === 'status' || ['new', 'in progress', 'resolved'].includes(text)) {
    colorClass = getStatusColor(value || (children as string) || '')
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}
    >
      {children || value}
    </span>
  )
}
