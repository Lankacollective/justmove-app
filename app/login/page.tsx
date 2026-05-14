'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#F0EDE8', marginBottom: 6 }}>
        Just Move
      </div>
      <div style={{ fontSize: 14, color: '#5A5652', marginBottom: 36 }}>
        Ingresa para acceder a tu plan
      </div>
      <input
        type="email"
        placeholder="correo@lankacollective.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={{
          width: '100%', maxWidth: 300, padding: '14px 18px',
          background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, color: '#F0EDE8', fontSize: 15,
          marginBottom: 10, outline: 'none',
        }}
      />
      <input
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={{
          width: '100%', maxWidth: 300, padding: '14px 18px',
          background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, color: '#F0EDE8', fontSize: 15,
          letterSpacing: 4, marginBottom: 12, outline: 'none',
        }}
      />

      {error && (
        <div style={{ color: '#FF453A', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%', maxWidth: 300, padding: 15,
          background: '#D4FF47', borderRadius: 12, border: 'none',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          color: '#080808', opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </div>
  )
}