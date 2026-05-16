'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Utensils, TrendingUp, Sparkles, Users, LogOut, Dumbbell, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/coach/usuarios',  label: 'Usuarios',      icon: Users },
  { href: '/coach/nutricion', label: 'Nutrición',     icon: Utensils },
  { href: '/coach/entreno',   label: 'Entrenamiento', icon: Dumbbell },
  { href: '/coach/progreso',  label: 'Progreso',      icon: TrendingUp },
  { href: '/coach/ia',        label: 'IA Coach',      icon: Sparkles },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const [coach, setCoach] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single()
      if (prof?.role !== 'coach') { router.push('/dashboard'); return }
      setCoach(prof)
      setLoading(false)
    })
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F7F4F0', fontSize: 13, color: '#9A9690', fontFamily: '-apple-system, sans-serif' }}>
      Cargando panel...
    </div>
  )

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ minHeight: '100dvh', background: '#F7F4F0', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Mobile header */}
      <div style={{ height: 56, background: '#1A1916', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>Just Move</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,159,10,0.15)' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF9F0A' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FF9F0A', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Coach</span>
          </div>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#FFFFFF' }}>
          {menuOpen ? <X size={20} color="#FFFFFF" /> : <Menu size={20} color="#FFFFFF" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 260, background: '#1A1916', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, textDecoration: 'none', background: active ? 'rgba(255,159,10,0.12)' : 'transparent' }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} color={active ? '#FF9F0A' : '#6B6762'} />
                    <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#FF9F0A' : '#9A9690' }}>{label}</span>
                    {href === '/coach/ia' && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#FF9F0A', background: 'rgba(255,159,10,0.15)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' as const }}>NEW</span>}
                  </a>
                )
              })}
            </nav>
            {/* Coach + logout */}
            <div style={{ padding: '16px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FF9F0A, #FF6B0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FFFFFF', flexShrink: 0 }}>
                  {coach?.name?.[0] || 'C'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{coach?.name || 'Coach'}</div>
                  <div style={{ fontSize: 10, color: '#6B6762' }}>Administrador</div>
                </div>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <LogOut size={16} color="#9A9690" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: '#1A1916', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <a key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '6px 10px' }}>
              <Icon size={19} color={active ? '#FF9F0A' : '#6B6762'} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? '#FF9F0A' : '#6B6762' }}>{label}</span>
            </a>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80, padding: '20px 16px 80px' }}>
        {children}
      </div>
    </div>
  )

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#F7F4F0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <aside style={{ width: 220, flexShrink: 0, background: '#1A1916', display: 'flex', flexDirection: 'column', padding: '28px 0' }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>Just Move</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,159,10,0.15)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF9F0A' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9F0A', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Panel Coach</span>
          </div>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', background: active ? 'rgba(255,159,10,0.12)' : 'transparent', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} color={active ? '#FF9F0A' : '#6B6762'} />
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#FF9F0A' : '#9A9690', letterSpacing: -0.1 }}>{label}</span>
                {href === '/coach/ia' && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#FF9F0A', background: 'rgba(255,159,10,0.15)', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3, textTransform: 'uppercase' as const }}>NEW</span>}
              </a>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FF9F0A, #FF6B0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FFFFFF', flexShrink: 0 }}>
              {coach?.name?.[0] || 'C'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{coach?.name || 'Coach'}</div>
              <div style={{ fontSize: 10, color: '#6B6762' }}>Administrador</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.5'}
            >
              <LogOut size={14} color="#9A9690" />
            </button>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
        {children}
      </main>
    </div>
  )
}