import React from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-stone-900 text-white hover:bg-stone-700 active:bg-stone-800 disabled:opacity-40',
  ghost:
    'bg-transparent text-stone-600 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-40',
  danger:
    'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 disabled:opacity-40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer select-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
