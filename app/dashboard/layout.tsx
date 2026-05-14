'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home, TrendingUp, Dumbbell, Salad, Settings,
  LogOut, Zap, Crown
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home, label: 'Inicio', path: '/dashboard' },
  { icon: TrendingUp, label: 'Progreso', path: '/dashboard/progreso' },
  { icon: Dumbbell, label: 'Entreno', path: '/dashboard/entreno' },
  { icon: Salad, label: 'Nutrición', path: '/dashboard/nutricion' },
  { icon: Settings, label: 'Config', path: '/dashboard/config' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
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
      setProfile(prof)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = profile?.name?.[0]?.toUpperCase() || '?'
  const navItems = profile?.role === 'coach'
    ? [...NAV_ITEMS, { icon: Crown, label: 'Coach', path: '/dashboard/coach' }]
    : NAV_ITEMS

  if (isMobile) return (
    <div style={{
      minHeight: '100dvh',
      background: '#F5F2EE',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Mobile header */}
      <div style={{
        height: 56, background: '#FFFFFF',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#1A1916',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#FF9F0A" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', letterSpacing: -0.5 }}>
            Just Move
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div onClick={handleLogout} style={{ cursor: 'pointer', padding: 4 }}>
            <LogOut size={16} color="#FF453A" strokeWidth={1.8} />
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: profile?.color || '#FF9F0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#FFFFFF',
          }}>
            {initial}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64, background: '#FFFFFF',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 100, boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        {navItems.map((item, i) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          return (
            <div key={i} onClick={() => router.push(item.path)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', padding: '6px 12px', borderRadius: 10,
              transition: 'all 0.15s',
            }}>
              <Icon size={20} color={isActive ? '#FF9F0A' : '#9A9690'} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? '#FF9F0A' : '#9A9690', letterSpacing: 0.2 }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  // Desktop
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F5F2EE',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      display: 'flex',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 68, background: '#FFFFFF',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '18px 0 20px', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 100,
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, background: '#1A1916',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, cursor: 'pointer',
        }} onClick={() => router.push('/dashboard')}>
          <Zap size={18} color="#FF9F0A" strokeWidth={2.5} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', alignItems: 'center' }}>
          {navItems.map((item, i) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <div key={i} onClick={() => router.push(item.path)} title={item.label} style={{
                width: 42, height: 42, borderRadius: 11,
                background: isActive ? '#1A1916' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F5F2EE' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Icon size={17} color={isActive ? '#FFFFFF' : '#9A9690'} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div onClick={handleLogout} title="Cerrar sesión" style={{
          width: 42, height: 42, borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: 10, transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFF0F0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <LogOut size={16} color="#FF453A" strokeWidth={1.8} />
        </div>

        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: profile?.color || '#FF9F0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
        }} title={profile?.name}>
          {initial}
        </div>
      </div>

      <div style={{ marginLeft: 68, flex: 1, minHeight: '100dvh' }}>
        {children}
      </div>
    </div>
  )
}