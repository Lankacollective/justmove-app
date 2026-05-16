'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Target, Flame, Scale, Activity } from 'lucide-react'

export default function CoachUsuarios() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').neq('role', 'coach').order('name')
      .then(({ data }) => {
        setProfiles(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ color: '#9A9690', fontSize: 13 }}>Cargando usuarios...</div>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 6 }}>
          Panel Coach
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>
          Mis atletas
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 4 }}>
          {profiles.length} usuario{profiles.length !== 1 ? 's' : ''} activo{profiles.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {profiles.map(prof => (
          <div key={prof.id} style={{
            background: '#FFFFFF', borderRadius: 20,
            padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: prof.color || '#FF9F0A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#FFFFFF', flexShrink: 0,
              }}>
                {prof.name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916' }}>{prof.name}</div>
                <div style={{ fontSize: 12, color: '#9A9690', marginTop: 2 }}>
                  {prof.sex === 'F' ? 'Femenino' : 'Masculino'} · {prof.level} · {prof.biotype}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: prof.objetivo === 'perder' ? 'rgba(255,69,58,0.1)' :
                               prof.objetivo === 'ganar' ? 'rgba(48,209,88,0.1)' : 'rgba(10,132,255,0.1)',
                  fontSize: 11, fontWeight: 700,
                  color: prof.objetivo === 'perder' ? '#FF453A' :
                         prof.objetivo === 'ganar' ? '#30D158' : '#0A84FF',
                  textTransform: 'capitalize' as const,
                }}>
                  {prof.objetivo || 'Mantenimiento'}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8, padding: '14px', borderRadius: 12,
              background: '#F7F4F0',
            }}>
              {[
                { icon: Flame, label: 'Calorías', val: prof.target_cal?.toLocaleString() || '—', unit: 'kcal' },
                { icon: Activity, label: 'Proteína', val: prof.prot || '—', unit: 'g' },
                { icon: Target, label: 'Carbos', val: prof.carbs || '—', unit: 'g' },
                { icon: Scale, label: 'Grasa', val: prof.fat || '—', unit: 'g' },
              ].map(({ icon: Icon, label, val, unit }, i) => (
                <div key={i} style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1916' }}>{val}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.3, color: '#9A9690', marginTop: 2 }}>
                    {unit}
                  </div>
                  <div style={{ fontSize: 9, color: '#B0ACA8', marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[
                { label: 'Ver nutrición', href: '/coach/nutricion' },
                { label: 'Ver progreso', href: '/coach/progreso' },
                { label: 'Usar IA', href: '/coach/ia' },
              ].map(({ label, href }) => (
                <a key={href} href={href} style={{
                  flex: 1, textAlign: 'center' as const, padding: '9px 0',
                  borderRadius: 10, textDecoration: 'none',
                  background: '#F7F4F0', fontSize: 11, fontWeight: 600, color: '#6B6762',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#1A1916'
                  ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = '#F7F4F0'
                  ;(e.currentTarget as HTMLElement).style.color = '#6B6762'
                }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
