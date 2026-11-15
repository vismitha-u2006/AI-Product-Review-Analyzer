import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SentimentPieChartProps {
  data: Array<{ name: string; value: number; color: string }>
}

export default function SentimentPieChart({ data }: SentimentPieChartProps) {
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0)

  if (total === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-slate-500">
        No sentiment data available for this selection
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={45}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#151F32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#94a3b8' }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{val}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
