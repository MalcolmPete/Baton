import { useNavigate } from 'react-router-dom'
import { useTheme, type Theme } from '../context/ThemeContext'

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
      gap: 24,
    }}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 400 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '○' },
    { value: 'dark',  label: 'Dark',  icon: '●' },
  ]

  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-btn)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {options.map(({ value, label, icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 16px',
              height: 32,
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              border: 'none',
              borderRight: value === 'light' ? '1px solid var(--border)' : 'none',
              backgroundColor: active ? 'var(--text-1)' : 'var(--bg)',
              color: active ? 'var(--bg)' : 'var(--text-2)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              minWidth: 80,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10 }}>{icon}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Settings() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}>
      {/* Topbar */}
      <header style={{
        backgroundColor: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 16,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--text-2)',
            padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          ← Back
        </button>
        <img src="/logo.png" alt="" className="app-logo" style={{ height: 20, width: 'auto' }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Settings</span>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 32px' }}>

        {/* Appearance section */}
        <div style={{
          fontSize: 10,
          fontWeight: 500,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 4,
        }}>
          Appearance
        </div>

        <div style={{
          backgroundColor: 'var(--bg)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          padding: '0 20px',
        }}>
          <SettingRow
            label="Theme"
            description="Choose between light and dark interface."
          >
            <ThemeToggle />
          </SettingRow>
        </div>

      </div>
    </div>
  )
}
