'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Droplets, Flame, Target, ChevronRight,
  Plus, Moon, Apple, Dumbbell, Weight
} from 'lucide-react'

const HABITS = [
  { icon: Apple, name: 'Proteína completa', progress: 7, total: 10 },
  { icon: Droplets, name: 'Agua 8 vasos', progress: 3, total: 8 },
  { icon: Dumbbell, name: 'Entreno completado', progress: 9, total: 12 },
  { icon: Moon, name: 'Sueño 7h+', progress: 5, total: 10 },
]

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      setProfile(prof)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', color: '#9A9690', fontSize: 14,
    }}>Cargando...</div>
  )

  const name = profile?.name?.split(' ')[0]
  const goalPct = profile
    ? Math.min(Math.round((1 - (profile.weight - profile.goal_weight) /
        (68.5 - profile.goal_weight)) * 100), 100)
    : 0
  const weightLeft = profile
    ? Math.max(profile.weight - profile.goal_weight, 0).toFixed(1)
    : '—'

  return (
    <div style={{ padding: '32px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>
          Hola, {name} 👋
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>
          Veamos tu actividad de hoy
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Calorías', value: '0', meta: `de ${profile?.target_cal?.toLocaleString() || '—'} kcal`, icon: Flame, dark: true },
          { label: 'Proteína', value: '0g', meta: `de ${profile?.prot || '—'}g`, icon: Target, accent: true },
          { label: 'Agua', value: '0/8', meta: '0L de 2L', icon: Droplets },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          const bg = kpi.dark ? '#1A1916' : kpi.accent ? '#FF9F0A' : '#FFFFFF'
          const textColor = kpi.dark ? '#FFFFFF' : '#1A1916'
          const subColor = kpi.dark ? 'rgba(255,255,255,0.35)' : 'rgba(26,25,22,0.4)'
          return (
            <div key={i} style={{ background: bg, borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: subColor, marginBottom: 10 }}>
                  {kpi.label}
                </div>
                <Icon size={15} color={kpi.dark ? '#FF9F0A' : kpi.accent ? '#FFFFFF' : '#FF9F0A'} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.5, color: textColor, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, color: subColor }}>{kpi.meta}</div>
            </div>
          )
        })}
      </div>

      {/* MIDDLE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14, marginBottom: 16 }}>

        {/* Workout */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 14 }}>
            Entrenamiento hoy
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Dumbbell size={20} color="#1A1916" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 3 }}>Piernas + Glúteos</div>
          <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 18 }}>Fuerza · ~70 min</div>
          <div
            onClick={() => router.push('/dashboard/entreno')}
            style={{
              background: '#1A1916', borderRadius: 10, padding: '11px 16px',
              fontSize: 13, fontWeight: 600, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            }}>
            Iniciar sesión
            <ChevronRight size={15} color="#FF9F0A" strokeWidth={2.5} />
          </div>
        </div>

        {/* Habits */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Mis hábitos</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F2EE', padding: '4px 10px', borderRadius: 100, cursor: 'pointer' }}>
              <Plus size={11} color="#1A1916" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1916' }}>Nuevo</span>
            </div>
          </div>
          {HABITS.map((h, i) => {
            const Icon = h.icon
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0',
                borderBottom: i < HABITS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color="#6B6762" strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1916', marginBottom: 4 }}>{h.name}</div>
                  <div style={{ display: 'flex', gap: 2.5 }}>
                    {Array.from({ length: h.total }, (_, j) => (
                      <div key={j} style={{ height: 3, flex: 1, borderRadius: 2, background: j < h.progress ? '#FF9F0A' : '#E8E5E0' }} />
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#9A9690', flexShrink: 0, fontWeight: 500 }}>{h.progress}/{h.total}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>

        {/* Blobs */}
        <div style={{ background: '#E8E4DE', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', minHeight: 160, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 4, position: 'relative', zIndex: 2 }}>Resultados de hoy</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1916', position: 'relative', zIndex: 2 }}>Tu actividad</div>
          <div style={{ position: 'absolute', right: 50, top: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,159,10,0.4)', filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', right: 90, top: 50, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,69,58,0.3)', filter: 'blur(18px)' }} />
          <div style={{ position: 'absolute', right: 30, top: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(26,25,22,0.5)', filter: 'blur(14px)' }} />
          <div style={{ marginTop: 48, display: 'flex', gap: 24, position: 'relative', zIndex: 2 }}>
            {[{ label: 'Kcal quemadas', value: '—' }, { label: 'Tiempo activo', value: '—' }, { label: 'Volumen total', value: '—' }].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1916' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#9A9690', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Peso actual</div>
            <Weight size={15} color="#9A9690" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2, color: '#1A1916', lineHeight: 1 }}>
            {profile?.weight || '—'}
          </div>
          <div style={{ fontSize: 12, color: '#9A9690', marginTop: 5, marginBottom: 18 }}>
            kg · objetivo <strong style={{ color: '#1A1916' }}>{profile?.goal_weight || '—'} kg</strong>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#F0EDE8', marginBottom: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(goalPct, 2)}%`, borderRadius: 3, background: '#FF9F0A', transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#9A9690' }}>{goalPct}% completado</span>
            <span style={{ fontSize: 11, color: '#FF9F0A', fontWeight: 600 }}>−{weightLeft} kg</span>
          </div>
        </div>
      </div>
    </div>
  )
}