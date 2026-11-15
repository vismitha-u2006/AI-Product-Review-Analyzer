import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  AlertTriangle,
  Award,
  Package,
  Bell,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  FileText,
  GitCompare,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { dashboardApi, alertsApi, productsApi } from '../services/api'
import type { DashboardStats, DashboardCharts, SellerAlert, Product } from '../types'
import StatCard from '../components/ui/StatCard'
import SentimentPieChart from '../components/charts/SentimentPieChart'
import TrendLineChart from '../components/charts/TrendLineChart'
import RatingDistributionChart from '../components/charts/RatingDistributionChart'
import AspectBarChart from '../components/charts/AspectBarChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatPercentage, formatDate } from '../utils'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [alerts, setAlerts] = useState<SellerAlert[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [statsRes, chartsRes, alertsRes, prodRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getCharts(),
        alertsApi.getAlerts({ status: 'New' }),
        productsApi.getProducts()
      ])
      setStats(statsRes.data)
      setCharts(chartsRes.data)
      setAlerts(alertsRes.data.slice(0, 5))
      setProducts(prodRes.data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Format charts data for Recharts
  const sentimentPieData = charts?.sentiment_distribution
    ? [
        { name: 'Positive', value: (charts.sentiment_distribution as any).positive || 0, color: '#22c55e' },
        { name: 'Neutral', value: (charts.sentiment_distribution as any).neutral || 0, color: '#eab308' },
        { name: 'Negative', value: (charts.sentiment_distribution as any).negative || 0, color: '#ef4444' },
      ]
    : []

  const ratingBarData = charts?.rating_distribution
    ? Object.entries(charts.rating_distribution).map(([rating, count]: [string, any]) => ({
        rating: `${rating} ★`,
        count: typeof count === 'number' ? count : (count?.count || 0),
      }))
    : []

  const topPosAspects = charts?.top_positive_aspects || []
  const topNegAspects = charts?.top_negative_aspects || []

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time AI-powered review intelligence, sentiment monitoring, and seller alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/analysis" className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="h-4 w-4" />
            Analyze Reviews
          </Link>
        </div>
      </div>

      {/* 8 Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        <StatCard
          label="Total Reviews"
          value={stats?.total_reviews ?? 0}
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          description="Analyzed across all products"
        />
        <StatCard
          label="Positive Reviews"
          value={stats?.positive_reviews ?? 0}
          icon={<ThumbsUp className="h-5 w-5 text-emerald-400" />}
          description={
            stats && stats.total_reviews > 0
              ? formatPercentage(stats.positive_reviews / stats.total_reviews)
              : '0%'
          }
        />
        <StatCard
          label="Negative Reviews"
          value={stats?.negative_reviews ?? 0}
          icon={<ThumbsDown className="h-5 w-5 text-rose-400" />}
          description={
            stats && stats.total_reviews > 0
              ? formatPercentage(stats.negative_reviews / stats.total_reviews)
              : '0%'
          }
        />
        <StatCard
          label="Neutral Reviews"
          value={stats?.neutral_reviews ?? 0}
          icon={<MinusCircle className="h-5 w-5 text-amber-400" />}
          description={
            stats && stats.total_reviews > 0
              ? formatPercentage(stats.neutral_reviews / stats.total_reviews)
              : '0%'
          }
        />
        <StatCard
          label="Suspicious Reviews"
          value={stats?.suspicious_reviews ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
          description="Detected by anti-fraud AI"
        />
        <StatCard
          label="Avg Sentiment Score"
          value={((stats?.avg_sentiment_score ?? 0) * 100).toFixed(0) + '%'}
          icon={<TrendingUp className="h-5 w-5 text-indigo-400" />}
          description="Overall customer happiness"
        />
        <StatCard
          label="Products Monitored"
          value={stats?.total_products ?? 0}
          icon={<Package className="h-5 w-5 text-cyan-400" />}
          description="Active product catalogs"
        />
        <StatCard
          label="Active Seller Alerts"
          value={stats?.active_alerts ?? 0}
          icon={<Bell className="h-5 w-5 text-red-400" />}
          description="Requires attention"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sentiment Distribution */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Sentiment Distribution</h2>
            <span className="text-xs text-slate-400">Deep Learning RoBERTa</span>
          </div>
          <div className="h-72">
            <SentimentPieChart data={sentimentPieData} />
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Product Rating Distribution</h2>
            <span className="text-xs text-slate-400">1 to 5 Stars</span>
          </div>
          <div className="h-72">
            <RatingDistributionChart data={ratingBarData} />
          </div>
        </div>

        {/* Sentiment Trends Over Time */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Review Sentiment Trends</h2>
            <span className="text-xs text-slate-400">Positive vs Negative Volume</span>
          </div>
          <div className="h-72">
            <TrendLineChart data={charts?.review_trends || []} />
          </div>
        </div>

        {/* Most Appreciated Features */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-emerald-400">Most Appreciated Features</h2>
            <span className="text-xs text-slate-400">ABSA Analysis</span>
          </div>
          <div className="h-72">
            <AspectBarChart data={topPosAspects} color="#10b981" />
          </div>
        </div>

        {/* Most Complained-About Features */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-rose-400">Most Complained-About Features</h2>
            <span className="text-xs text-slate-400">ABSA Analysis</span>
          </div>
          <div className="h-72">
            <AspectBarChart data={topNegAspects} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Active Seller Alerts & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Seller Alerts */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rose-400" />
              <h2 className="text-lg font-semibold text-white">Critical Seller Alerts</h2>
            </div>
            <Link to="/alerts" className="text-xs text-blue-400 hover:underline">
              View All Alerts &rarr;
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              <p className="font-medium text-slate-300">All Clear!</p>
              <p className="text-xs">No active seller alerts for your products.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-4 transition-all hover:border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            alert.priority === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : alert.priority === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {alert.priority} PRIORITY
                        </span>
                        <h3 className="font-medium text-white">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-slate-300">{alert.message}</p>
                      {alert.negative_percentage && (
                        <p className="text-xs text-rose-400 font-medium">
                          Negative review rate: {alert.negative_percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(alert.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links / Actions */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/analysis"
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <PlusCircle className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">Submit / Upload Reviews</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              to="/compare"
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-purple-400" />
                <span className="text-sm font-medium">Compare Products</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              to="/assistant"
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-medium">AI Chat Assistant</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              to="/reports"
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-medium">Generate PDF Reports</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
