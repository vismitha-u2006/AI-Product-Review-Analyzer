export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })

export const formatPercentage = (n: number) => `${(n * 100).toFixed(1)}%`

export const getSentimentColor = (s: string) =>
  s === 'positive' ? '#22c55e' : s === 'negative' ? '#ef4444' : '#eab308'

export const getPriorityColor = (p: string) =>
  p === 'HIGH'
    ? 'text-red-400 bg-red-500/20'
    : p === 'MEDIUM'
    ? 'text-yellow-400 bg-yellow-500/20'
    : 'text-green-400 bg-green-500/20'

export const truncateText = (t: string, n = 100) => (t.length > n ? t.slice(0, n) + '...' : t)

export const getStatusColor = (s: string) =>
  s === 'New'
    ? 'text-blue-400 bg-blue-500/20'
    : s === 'In Progress'
    ? 'text-yellow-400 bg-yellow-500/20'
    : 'text-green-400 bg-green-500/20'
