import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface RatingDistributionChartProps {
  data: Array<{ rating: string; count: number }>
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

export default function RatingDistributionChart({ data }: RatingDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="rating" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#151F32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#94a3b8' }}
          formatter={(v: any) => [v, 'Reviews']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i] || '#2563EB'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
