import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProductCompareChartProps {
  data: Array<{ product?: string; name?: string; positive: number; negative: number; neutral: number }>
}

export default function ProductCompareChart({ data }: ProductCompareChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    product: d.product || d.name || 'Product',
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formattedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="product" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
        <Tooltip
          contentStyle={{ background: '#151F32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#94a3b8' }}
        />
        <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="positive" fill="#22c55e" radius={[4, 4, 0, 0]} name="Positive %" />
        <Bar dataKey="neutral" fill="#eab308" radius={[4, 4, 0, 0]} name="Neutral %" />
        <Bar dataKey="negative" fill="#ef4444" radius={[4, 4, 0, 0]} name="Negative %" />
      </BarChart>
    </ResponsiveContainer>
  )
}
