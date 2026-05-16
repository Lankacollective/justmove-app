'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingDown, TrendingUp, Minus, Scale, Activity, Calendar } from 'lucide-react'

export default function CoachProgreso() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').neq('role', 'coach').order('name')
      .then(async ({ data: profs }) => {
        if (profs?.length) {
          setProfiles(profs)
          setSelectedUser(profs[0])
          await loadData(profs[0].id)
        }
        setLoading(false)
      })
  }, [])

  async function loadData(userId: string) {
    const supabase = createClient()
    const [{ data: wl }, { data: ci }] = await Promise.all([
      supabase.from('weight_log').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30),
      supabase.from('checkins').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(14),
    ])
    setWeightLog(wl || [])
    setCheckins(ci || [])
  }

  async function switchUser(prof: any) {
    setSelectedUser(prof)
    setWeightLog([])
    setCheckins([])
    await loadData(prof.id)
  }

  if (loading) return <div style={{ color: '#9A9690', fontSize: 13 }}>Cargando...</div>

  const latestWeight = weightLog[0]?.weight
  const previousWeight = weightLog[1]?.weight
  const weightDiff = latestWeight && previousWeight ? (latestWeight - previousWeight).toFixed(1) : null
  const totalDiff = weightLog.length > 1 ? (latestWeight - weightLog[weightLog.length - 1].weight).toFixed(1) : null

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 6 }}>
          Panel Coach
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>
          Progreso de atletas
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 4 }}>
          Historial de peso y check-ins recientes
        </div>
      </div>

      {/* User selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {profiles.map(prof => (
          <div key={prof.id} onClick={() => switchUser(prof)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 14, cursor: 'pointer',
            background: selectedUser?.id === prof.id ? '#1A1916' : '#FFFFFF',
            border: `1.5px solid ${selectedUser?.id === prof.id ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.15s',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: prof.color || '#FF9F0A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
            }}>{prof.name?.[0]}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedUser?.id === prof.id ? '#FFFFFF' : '#1A1916' }}>
                {prof.name}
              </div>
              <div style={{ fontSize: 10, color: selectedUser?.id === prof.id ? 'rgba(255,255,255,0.4)' : '#9A9690' }}>
                objetivo: {prof.objetivo || '—'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              {
                label: 'Peso actual',
                val: latestWeight ? latestWeight + ' kg' : '—',
                sub: latestWeight ? `Registrado ${weightLog[0]?.date}` : 'Sin registros',
                icon: Scale,
                color: '#FF9F0A',
              },
              {
                label: 'Cambio reciente',
                val: weightDiff ? (parseFloat(weightDiff) > 0 ? '+' : '') + weightDiff + ' kg' : '—',
                sub: 'Vs. registro anterior',
                icon: parseFloat(weightDiff || '0') < 0 ? TrendingDown : parseFloat(weightDiff || '0') > 0 ? TrendingUp : Minus,
                color: parseFloat(weightDiff || '0') < 0 ? '#30D158' :
                       parseFloat(weightDiff || '0') > 0 ? '#FF453A' : '#9A9690',
              },
              {
                label: 'Tendencia total',
                val: totalDiff ? (parseFloat(totalDiff) > 0 ? '+' : '') + totalDiff + ' kg' : '—',
                sub: `Últimos ${weightLog.length} registros`,
                icon: Activity,
                color: '#0A84FF',
              },
            ].map(({ label, val, sub, icon: Icon, color }, i) => (
              <div key={i} style={{
                background: '#FFFFFF', borderRadius: 16, padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={color} strokeWidth={2.5} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690' }}>{label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{val}</div>
                <div style={{ fontSize: 11, color: '#9A9690', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Weight history */}
          <div style={{
            background: '#FFFFFF', borderRadius: 18, padding: '20px',
            marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Scale size={14} color="#FF9F0A" strokeWidth={2.5} />
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>
                Historial de peso
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: '#B0ACA8' }}>
                {weightLog.length} registros
              </div>
            </div>

            {weightLog.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '32px', color: '#9A9690', fontSize: 13 }}>
                No hay registros de peso aún
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {weightLog.slice(0, 10).map((entry, i) => {
                  const prev = weightLog[i + 1]
                  const diff = prev ? entry.weight - prev.weight : 0
                  return (
                    <div key={entry.id || i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10,
                      background: i === 0 ? '#F7F4F0' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={13} color="#9A9690" />
                        <span style={{ fontSize: 13, color: '#6B6762' }}>{entry.date}</span>
                        {i === 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9F0A', background: 'rgba(255,159,10,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            ÚLTIMO
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {diff !== 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: diff < 0 ? '#30D158' : '#FF453A' }}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                          </span>
                        )}
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1916' }}>
                          {entry.weight} kg
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent check-ins */}
          <div style={{
            background: '#FFFFFF', borderRadius: 18, padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={14} color="#0A84FF" strokeWidth={2.5} />
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>
                Check-ins recientes
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: '#B0ACA8' }}>
                {checkins.length} registros
              </div>
            </div>

            {checkins.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '32px', color: '#9A9690', fontSize: 13 }}>
                No hay check-ins registrados aún
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checkins.map((ci, i) => (
                  <div key={ci.id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10, background: '#F7F4F0',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1916' }}>{ci.date}</div>
                      {ci.notes && <div style={{ fontSize: 11, color: '#9A9690', marginTop: 2 }}>{ci.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {ci.energia !== undefined && (
                        <div style={{ textAlign: 'center' as const }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#FF9F0A' }}>{ci.energia}</div>
                          <div style={{ fontSize: 9, color: '#9A9690' }}>energía</div>
                        </div>
                      )}
                      {ci.humor !== undefined && (
                        <div style={{ textAlign: 'center' as const }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#0A84FF' }}>{ci.humor}</div>
                          <div style={{ fontSize: 9, color: '#9A9690' }}>humor</div>
                        </div>
                      )}
                      {ci.sueno !== undefined && (
                        <div style={{ textAlign: 'center' as const }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#BF5AF2' }}>{ci.sueno}</div>
                          <div style={{ fontSize: 9, color: '#9A9690' }}>sueño</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
