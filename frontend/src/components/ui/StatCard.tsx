import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: { value: number; label: string }
  loading?: boolean
  color?: string
}

export default function StatCard({
  label,
  value,
  icon,
  description,
  trend,
  loading,
  color = '#2563EB',
}: StatCardProps) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-3" />
        <div className="h-8 bg-white/10 rounded w-16" />
      </div>
    )
  }
  return (
    <div className="card flex items-start gap-4">
      {icon && (
        <div className="p-2.5 rounded-lg shrink-0" style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/50 mb-1">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-white truncate">{value}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-1 truncate">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
