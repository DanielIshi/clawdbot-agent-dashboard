/**
 * Responsive Layout Components
 * Mobile-first responsive design for dashboard
 */
import React, { useState, useEffect } from 'react'

/**
 * Responsive Grid
 * Adapts columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className = '',
}: ResponsiveGridProps) {
  const getColsClass = () => {
    if (typeof cols === 'number') return `grid-cols-${cols}`
    return `
      grid-cols-${cols.default || 1}
      ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''}
      ${cols.md ? `md:grid-cols-${cols.md}` : ''}
      ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
      ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
    `
  }

  return (
    <div className={`grid ${getColsClass()} gap-${gap} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Mobile Drawer Navigation
 */
interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function Drawer({ isOpen, onClose, children, title }: DrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-gray-900 z-50
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {title && <h2 className="font-bold text-white">{title}</h2>}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  )
}

/**
 * Mobile Bottom Navigation
 */
interface BottomNavItem {
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}

interface BottomNavigationProps {
  items: BottomNavItem[]
  activeIndex: number
}

export function BottomNavigation({ items, activeIndex }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 lg:hidden z-40">
      <div className="flex items-center justify-around py-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg transition-colors
              ${index === activeIndex 
                ? 'text-blue-500 bg-blue-500/10' 
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Collapsible Panel
 */
interface CollapsiblePanelProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  icon?: React.ReactNode
}

export function CollapsiblePanel({
  title,
  children,
  defaultExpanded = true,
  icon,
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className="font-medium text-white">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton Loader
 */
interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'text',
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-700'
  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  return (
    <div
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      style={{ width, height }}
    />
  )
}

/**
 * Data Table Component
 */
interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height="48px" className="w-full" variant="rectangular" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-medium text-gray-400"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-300">
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Search Input Component
 */
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Badge Component
 */
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400 border border-green-700',
    warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
    error: 'bg-red-900/50 text-red-400 border border-red-700',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  )
}

/**
 * Toast Notification Component
 */
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose?: () => void
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const typeStyles = {
    success: 'bg-green-900/90 border-green-700 text-green-200',
    error: 'bg-red-900/90 border-red-700 text-red-200',
    warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-200',
    info: 'bg-blue-900/90 border-blue-700 text-blue-200',
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        px-4 py-3 rounded-lg border shadow-lg
        flex items-center gap-3
        ${typeStyles[type]}
        animate-slide-up
      `}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Auto-Refresh Hook
 */
export function useAutoRefresh(interval: number, enabled = true) {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setLastRefresh(new Date())
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    setRefreshing(false)
  }

  useEffect(() => {
    if (!enabled || interval <= 0) return

    const id = setInterval(refresh, interval)
    return () => clearInterval(id)
  }, [interval, enabled])

  return { refreshing, lastRefresh, refresh }
}
