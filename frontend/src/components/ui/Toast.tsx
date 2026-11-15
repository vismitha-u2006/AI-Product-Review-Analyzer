import React from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import type { Toast } from '../../hooks/useToast'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
}

const borders = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-yellow-500/30',
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 bg-[#151F32] border ${borders[t.type]} rounded-xl px-4 py-3 shadow-xl min-w-[280px] max-w-sm animate-in slide-in-from-right`}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm text-white/90">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
