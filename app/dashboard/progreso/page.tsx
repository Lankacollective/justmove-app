'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TrendingDown, Plus } from 'lucide-react'

function today() { return new Date().toISOString().split('T')[0] }

export default function Progreso() {
  const [profile, setProfile] = useState<any>(null)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      const { data: wl } = await supabase.from('weight_log').select('*').eq('user_id', data.user.id).order('date', { ascending: true })
      setWeightLog(wl || [])
    })
  }, [])

  async function saveWeight() {
    const val = parseFloat(newWeight)
    if (!val || val < 30 || val > 300) return alert('Peso inválido')
    setSaving(true)
    const supabase = createClient()
    await supabase.from('weight_log').upsert({ user_id: userId, date: today(), weight: val }, { onConflict: 'user_id,date' })
    await supabase.from('profiles').update({ weight: val }).eq('id', userId)
    setProfile((p: any) => ({ ...p, weight: val }))
    setWeightLog(prev => {
      const filtered = prev.filter(w => w.date !== today())
      return [...filtered, { date: today(), weight: val }].sort((a, b) => a.date.localeCompare(b.date))
    })
    setNewWeight('')
    setSaving(false)
  }

  if (!profile) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>Cargando...</div>

  const latest = weightLog.length ? weightLog[weightLog.length - 1].weight : profile.weight
  const first = weightLog.length ? weightLog[0].weight : profile.weight
  const lost = (first - latest).toFixed(1)
  const left = Math.max(latest - profile.goal_weight, 0).toFixed(1)
  const goalPct = Math.min(Math.round((first - latest) / (first - profile.goal_weight) * 100), 100) || 0

  // Simple SVG chart
  const chartW = 600, chartH = 160
  const weights = weightLog.map(w => w.weight)
  const minW = Math.min(...weights, profile.goal_weight) - 1
  const maxW = Math.max(...weights) + 1
  const points = weightLog.map((w, i) => {
    const x = weightLog.length > 1 ? (i / (weightLog.length - 1)) * chartW : chartW / 2
    const y = chartH - ((w.weight - minW) / (maxW - minW)) * chartH
    return `${x},${y}`
  }).join(' ')

  const goalY = chartH - ((profile.goal_weight - minW) / (maxW - minW)) * chartH

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800 }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Progreso</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>Tu evolución</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Peso actual', val: latest + ' kg', sub: `objetivo ${profile.goal_weight} kg`, dark: true },
          { label: 'Perdido', val: lost + ' kg', sub: 'desde el inicio', accent: true },
          { label: 'Falta', val: left + ' kg', sub: `${goalPct}% completado` },
        ].map((k, i) => (
          <div key={i} style={{
            background: k.dark ? '#1A1916' : k.accent ? '#FF9F0A' : '#FFFFFF',
            borderRadius: 18, padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: k.dark || k.accent ? 'rgba(255,255,255,0.5)' : '#9A9690', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: k.dark || k.accent ? '#FFFFFF' : '#1A1916', lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: k.dark || k.accent ? 'rgba(255,255,255,0.4)' : '#9A9690' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>Evolución de peso</div>
        {weightLog.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9A9690', fontSize: 13 }}>
            Registra al menos 2 días para ver la gráfica
          </div>
        ) : (
          <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', height: 'auto' }}>
            {/* Goal line */}
            <line x1="0" y1={goalY} x2={chartW} y2={goalY} stroke="rgba(255,69,58,0.3)" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x={chartW - 4} y={goalY - 4} textAnchor="end" fontSize="9" fill="rgba(255,69,58,0.6)">objetivo</text>
            {/* Area */}
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9F0A" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FF9F0A" stopOpacity="0" />
              </linearGradient>
            </defs>
            {weightLog.length > 1 && (
              <polygon
                points={`0,${chartH} ${points} ${chartW},${chartH}`}
                fill="url(#wg)"
              />
            )}
            {/* Line */}
            <polyline points={points} fill="none" stroke="#FF9F0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {weightLog.map((w, i) => {
              const x = weightLog.length > 1 ? (i / (weightLog.length - 1)) * chartW : chartW / 2
              const y = chartH - ((w.weight - minW) / (maxW - minW)) * chartH
              return <circle key={i} cx={x} cy={y} r="4" fill="#FF9F0A" />
            })}
            {/* Labels */}
            {weightLog.filter((_, i) => i === 0 || i === weightLog.length - 1 || i % Math.ceil(weightLog.length / 5) === 0).map((w, i, arr) => {
              const origIdx = weightLog.indexOf(w)
              const x = weightLog.length > 1 ? (origIdx / (weightLog.length - 1)) * chartW : chartW / 2
              return (
                <text key={i} x={x} y={chartH + 16} textAnchor="middle" fontSize="9" fill="#9A9690">
                  {w.date.slice(5)}
                </text>
              )
            })}
          </svg>
        )}
      </div>

      {/* Register weight */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 14 }}>
          Registrar peso hoy
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="number"
            step="0.1"
            placeholder="ej. 68.3"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveWeight()}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 16,
              fontWeight: 600, outline: 'none', background: '#F5F2EE',
              fontFamily: '-apple-system, sans-serif', color: '#1A1916',
            }}
          />
          <div
            onClick={saveWeight}
            style={{
              padding: '12px 20px', borderRadius: 12, cursor: 'pointer',
              background: '#1A1916', color: '#FFFFFF', fontSize: 14,
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Plus size={16} />
            {saving ? 'Guardando...' : 'Guardar'}
          </div>
        </div>

        {/* Log */}
        {weightLog.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 10 }}>Historial</div>
            {[...weightLog].reverse().slice(0, 7).map((w, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 13, color: '#6B6762' }}>{w.date}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}