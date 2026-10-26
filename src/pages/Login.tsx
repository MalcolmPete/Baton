import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HiArrowRight, HiArrowDownTray, HiCog6Tooth } from 'react-icons/hi2'
import { supabase } from '../lib/supabase'

type Tab = 'signin' | 'signup'

const FEATURES = [
  {
    bg: '#1e3a8a',
    Icon: HiArrowRight,
    title: 'Handoff docs',
    desc: "Everything the next person needs, nothing they don't.",
  },
  {
    bg: '#14532d',
    Icon: HiArrowDownTray,
    title: 'Installation guides',
    desc: 'Step-by-step with annotated screenshots.',
  },
  {
    bg: '#3b0764',
    Icon: HiCog6Tooth,
    title: 'Account setups',
    desc: 'Onboard clients and teammates without back-and-forth.',
  },
]

const INPUT_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  height: 44,
  borderRadius: 10,
  border: '1.5px solid #e5e7eb',
  padding: '0 12px',
  fontSize: 14,
  color: '#111111',
  backgroundColor: 'white',
  outline: 'none',
  transition: 'border-color 0.15s',
}

// Only follow same-site paths, so ?next= can't send people to another website
function safeNextPath(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Where to go after signing in, e.g. back to a share link
  const next = safeNextPath(searchParams.get('next'))
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(next ?? '/')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          // The confirmation email links back to where they were heading
          options: next ? { emailRedirectTo: `${window.location.origin}${next}` } : undefined,
        })
        if (error) throw error
        // With email confirmation off, sign-up signs them straight in
        if (data.session) { navigate(next ?? '/'); return }
        setInfo('Check your email to confirm your account, then sign in.')
        setTab('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next ?? '/'}` },
    })
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first, then click Forgot password.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setInfo('Password reset link sent — check your inbox.')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left panel ───────────────────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 50%',
        backgroundColor: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        padding: '36px 52px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {/* Vertically centred content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Logo — centred horizontally */}
          <img
            src="/logowithtext.png"
            alt="Baton"
            style={{
              width: '60%',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              filter: 'brightness(0) invert(1)',
            }}
          />

          {/* Hero — gap below logo */}
          <div style={{ marginTop: 76 }}>
            <h1 style={{
              fontSize: 42, fontWeight: 700, color: 'white',
              lineHeight: 1.15, letterSpacing: '-0.02em',
              margin: '0 0 16px',
            }}>
              Documentation that actually gets handed off.
            </h1>
            <p style={{
              fontSize: 16, color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.65, margin: '0 0 32px',
            }}>
              Create handoff docs, installation guides and account setups with images, annotations, and PDF export built in.
            </p>

            {/* Features */}
            <div>
              {FEATURES.map(({ bg, Icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '15px 0',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    backgroundColor: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={24} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'white', lineHeight: 1.3, marginBottom: 3 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>© 2026 Baton</div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: 368 }}>

          {/* Heading */}
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111111', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>
            {tab === 'signin' ? 'Sign in to your workspace' : 'Start documenting in seconds'}
          </p>

          {/* Feedback banners */}
          {info && (
            <div style={{ fontSize: 13, color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ fontSize: 13, color: '#991b1b', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: '100%', height: 46, borderRadius: 12,
              border: '1.5px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, fontWeight: 500, color: '#111111', marginBottom: 22,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#f3f4f6' }} />
            <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#f3f4f6' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={INPUT_STYLE}
                onFocus={e => (e.currentTarget.style.borderColor = '#9ca3af')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={INPUT_STYLE}
                onFocus={e => (e.currentTarget.style.borderColor = '#9ca3af')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44, borderRadius: 10, border: 'none',
                backgroundColor: '#111111', color: 'white',
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s',
                marginTop: 2,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#222222' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#111111' }}
            >
              {loading ? '…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Switch tab */}
          <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            {tab === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  style={{ fontSize: 13, fontWeight: 600, color: '#111111', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  style={{ fontSize: 13, fontWeight: 600, color: '#111111', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

    </div>
  )
}
