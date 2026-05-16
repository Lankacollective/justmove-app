'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, TrendingDown, TrendingUp, Minus, Scale, Activity, Moon, Zap, Ruler } from 'lucide-react'

function today() { return new Date().toISOString().split('T')[0] }

type Tab = 'peso' | 'medidas' | 'bienestar'
type MedidaMetric = 'cintura' | 'cadera' | 'brazo' | 'muslo'

const MEDIDA_LABELS: Record<MedidaMetric, string> = {
  cintura: 'Cintura', cadera: 'Cadera', brazo: 'Brazo', muslo: 'Muslo',
}
const MEDIDA_COLORS: Record<MedidaMetric, string> = {
  cintura: '#FF9F0A', cadera: '#0A84FF', brazo: '#30D158', muslo: '#BF5AF2',
}

function LineChart({ data, color = '#FF9F0A', goalValue, unit = 'kg', height = 160 }: {
  data: any[], color?: string, goalValue?: number, unit?: string, height?: number
}) {
  const W = 600, H = height
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9A9690', fontSize: 13 }}>
      Registra al menos 2 entradas para ver la gráfica
    </div>
  )
  const values = data.map(d => d.value)
  const allVals = goalValue !== undefined ? [...values, goalValue] : values
  const minV = Math.min(...allVals) - 1, maxV = Math.max(...allVals) + 1, range = maxV - minV || 1
  const toX = (i: number) => data.length > 1 ? (i / (data.length - 1)) * W : W / 2
  const toY = (v: number) => H - ((v - minV) / range) * H
  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')
  const goalY = goalValue !== undefined ? toY(goalValue) : null
  const labelIdxs = new Set([0, data.length - 1])
  if (data.length > 4) { const s = Math.ceil(data.length / 4); for (let i = s; i < data.length - 1; i += s) labelIdxs.add(i) }
  const gradId = `grad-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {goalY !== null && <>
        <line x1="0" y1={goalY} x2={W} y2={goalY} stroke="rgba(255,69,58,0.35)" strokeWidth="1.5" strokeDasharray="6,4" />
        <text x={W - 4} y={goalY - 5} textAnchor="end" fontSize="9" fill="rgba(255,69,58,0.6)">objetivo</text>
      </>}
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.value)} r="4" fill={color} />
          {labelIdxs.has(i) && <>
            <text x={toX(i)} y={H + 16} textAnchor="middle" fontSize="9" fill="#9A9690">{d.date?.slice(5)}</text>
            <text x={toX(i)} y={toY(d.value) - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{d.value}{unit}</text>
          </>}
        </g>
      ))}
    </svg>
  )
}

function MultiLineChart({ data, metrics, height = 180 }: {
  data: any[], metrics: { key: string, color: string, label: string }[], height?: number
}) {
  const W = 600, H = height
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9A9690', fontSize: 13 }}>
      Registra al menos 2 entradas para ver la gráfica
    </div>
  )
  const allValues = metrics.flatMap(m => data.map(d => d[m.key]).filter(v => v != null))
  if (!allValues.length) return <div style={{ textAlign: 'center', padding: '32px 0', color: '#9A9690', fontSize: 13 }}>Sin datos aún</div>
  const minV = Math.min(...allValues) - 1, maxV = Math.max(...allValues) + 1, range = maxV - minV || 1
  const toX = (i: number) => data.length > 1 ? (i / (data.length - 1)) * W : W / 2
  const toY = (v: number) => H - ((v - minV) / range) * H
  const labelIdxs = new Set([0, data.length - 1])
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto' }}>
      {metrics.map(({ key, color }) => {
        const pts = data.map((d, i) => d[key] != null ? `${toX(i)},${toY(d[key])}` : null).filter(Boolean).join(' ')
        return (
          <g key={key}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.85" />
            {data.map((d, i) => d[key] != null && <circle key={i} cx={toX(i)} cy={toY(d[key])} r="3.5" fill={color} />)}
          </g>
        )
      })}
      {data.map((d, i) => labelIdxs.has(i) && (
        <text key={i} x={toX(i)} y={H + 16} textAnchor="middle" fontSize="9" fill="#9A9690">{d.date?.slice(5)}</text>
      ))}
    </svg>
  )
}

function DeltaBadge({ delta, inverse = false }: { delta: number, inverse?: boolean }) {
  const good = inverse ? delta < 0 : delta > 0
  const color = delta === 0 ? '#9A9690' : good ? '#30D158' : '#FF453A'
  const Icon = delta === 0 ? Minus : delta < 0 ? TrendingDown : TrendingUp
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color }}>
      <Icon size={11} strokeWidth={2.5} />
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  )
}

export default function Progreso() {
  const [profile, setProfile] = useState<any>(null)
  const [weightLog, setWeightLog] = useState<any[]>([])
  const [medidas, setMedidas] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('peso')
  const [newWeight, setNewWeight] = useState('')
  const [newMedida, setNewMedida] = useState<Record<string, string>>({})
  const [savingWeight, setSavingWeight] = useState(false)
  const [savingMedida, setSavingMedida] = useState(false)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const [{ data: prof }, { data: wl }, { data: med }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.user.id).single(),
        supabase.from('weight_log').select('*').eq('user_id', data.user.id).order('date', { ascending: true }),
        supabase.from('medidas').select('*').eq('user_id', data.user.id).order('date', { ascending: true }),
      ])
      setProfile(prof)
      setWeightLog(wl || [])
      setMedidas(med || [])
    })
  }, [])

  async function saveWeight() {
    const val = parseFloat(newWeight)
    if (!val || val < 30 || val > 300) return alert('Peso inválido')
    setSavingWeight(true)
    const supabase = createClient()
    await supabase.from('weight_log').upsert({ user_id: userId, date: today(), weight: val }, { onConflict: 'user_id,date' })
    await supabase.from('profiles').update({ weight: val }).eq('id', userId)
    setProfile((p: any) => ({ ...p, weight: val }))
    setWeightLog(prev => [...prev.filter(w => w.date !== today()), { date: today(), weight: val }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewWeight('')
    setSavingWeight(false)
  }

  async function saveMedida() {
    const fields = ['grasa', 'cintura', 'cadera', 'brazo', 'muslo', 'energia', 'sueno']
    const hasAny = fields.some(f => newMedida[f] && !isNaN(parseFloat(newMedida[f])))
    if (!hasAny) return alert('Ingresa al menos un valor')
    setSavingMedida(true)
    const supabase = createClient()
    const row: any = { user_id: userId, date: today() }
    fields.forEach(f => { if (newMedida[f]) row[f] = parseFloat(newMedida[f]) })
    await supabase.from('medidas').upsert(row, { onConflict: 'user_id,date' })
    setMedidas(prev => [...prev.filter(m => m.date !== today()), { ...row }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewMedida({})
    setSavingMedida(false)
  }

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>Cargando...</div>
  )

  const latestW = weightLog.length ? weightLog[weightLog.length - 1].weight : profile.weight
  const firstW = weightLog.length ? weightLog[0].weight : profile.weight
  const deltaW = latestW - firstW
  const leftW = Math.max(latestW - (profile.goal_weight || latestW), 0)
  const goalPct = profile.goal_weight && firstW !== profile.goal_weight
    ? Math.min(Math.round(Math.abs(firstW - latestW) / Math.abs(firstW - profile.goal_weight) * 100), 100) : 0
  const weightChartData = weightLog.map(w => ({ date: w.date, value: w.weight }))
  const latestMed = medidas.length ? medidas[medidas.length - 1] : null
  const firstMed = medidas.length ? medidas[0] : null
  const grasaChartData = medidas.filter(m => m.grasa != null).map(m => ({ date: m.date, value: m.grasa }))
  const medidasMetrics = [
    { key: 'cintura', color: MEDIDA_COLORS.cintura, label: 'Cintura' },
    { key: 'cadera', color: MEDIDA_COLORS.cadera, label: 'Cadera' },
    { key: 'brazo', color: MEDIDA_COLORS.brazo, label: 'Brazo' },
    { key: 'muslo', color: MEDIDA_COLORS.muslo, label: 'Muslo' },
  ]
  const bienestarData = medidas.filter(m => m.energia != null || m.sueno != null)
  const avgEnergia = bienestarData.length ? Math.round(bienestarData.reduce((a, m) => a + (m.energia || 0), 0) / bienestarData.length) : null
  const avgSueno = bienestarData.length ? Math.round(bienestarData.reduce((a, m) => a + (m.sueno || 0), 0) / bienestarData.length) : null

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 4 }}>Progreso</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>Tu evolución</div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#FFFFFF', padding: 5, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: 'fit-content' }}>
        {([{ id: 'peso', label: 'Peso', icon: Scale }, { id: 'medidas', label: 'Medidas', icon: Ruler }, { id: 'bienestar', label: 'Bienestar', icon: Activity }] as { id: Tab, label: string, icon: any }[]).map(({ id, label, icon: Icon }) => (
          <div key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: tab === id ? '#1A1916' : 'transparent', transition: 'all 0.15s' }}>
            <Icon size={14} color={tab === id ? '#FF9F0A' : '#9A9690'} strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? '#FFFFFF' : '#9A9690' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── TAB PESO ── */}
      {tab === 'peso' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Peso actual', val: latestW + ' kg', sub: `objetivo ${profile.goal_weight || '—'} kg`, dark: true },
            { label: 'Cambio total', val: <DeltaBadge delta={deltaW} inverse />, sub: `desde ${firstW} kg` },
            { label: 'Meta', val: goalPct + '%', sub: `${leftW.toFixed(1)} kg restantes` },
          ].map((k, i) => (
            <div key={i} style={{ background: k.dark ? '#1A1916' : '#FFFFFF', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: k.dark ? 'rgba(255,255,255,0.35)' : '#9A9690', marginBottom: 10 }}>{k.label}</div>
              <div style={{ fontSize: k.dark ? 28 : 22, fontWeight: 800, letterSpacing: -1, color: k.dark ? '#FFFFFF' : '#1A1916', lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, marginTop: 6, color: k.dark ? 'rgba(255,255,255,0.35)' : '#9A9690' }}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>Evolución de peso</div>
          <LineChart data={weightChartData} color="#FF9F0A" goalValue={profile.goal_weight} unit=" kg" />
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 14 }}>Registrar peso hoy</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="number" step="0.1" placeholder="ej. 68.3" value={newWeight} onChange={e => setNewWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveWeight()}
              style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 16, fontWeight: 600, outline: 'none', background: '#F5F2EE', fontFamily: '-apple-system, sans-serif', color: '#1A1916' }}
              onFocus={e => e.target.style.borderColor = '#FF9F0A'} onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'} />
            <div onClick={saveWeight} style={{ padding: '12px 20px', borderRadius: 12, cursor: 'pointer', background: '#1A1916', color: '#FFFFFF', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: savingWeight ? 0.7 : 1 }}>
              <Plus size={16} />{savingWeight ? 'Guardando...' : 'Guardar'}
            </div>
          </div>
          {weightLog.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 10 }}>Últimos registros</div>
              {[...weightLog].reverse().slice(0, 7).map((w, i) => {
                const prev = [...weightLog].reverse()[i + 1]
                const diff = prev ? w.weight - prev.weight : 0
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 13, color: '#6B6762' }}>{w.date}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {diff !== 0 && <DeltaBadge delta={diff} inverse />}
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>{w.weight} kg</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </>}

      {/* ── TAB MEDIDAS ── */}
      {tab === 'medidas' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#1A1916', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>% Grasa corporal</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', letterSpacing: -1 }}>{latestMed?.grasa != null ? latestMed.grasa + '%' : '—'}</div>
            {firstMed?.grasa != null && latestMed?.grasa != null && firstMed.grasa !== latestMed.grasa && (
              <div style={{ marginTop: 6 }}>
                <DeltaBadge delta={latestMed.grasa - firstMed.grasa} inverse />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>desde inicio ({firstMed.grasa}%)</span>
              </div>
            )}
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 10 }}>Medidas actuales (cm)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(Object.entries(MEDIDA_LABELS) as [MedidaMetric, string][]).map(([key, label]) => {
                const val = latestMed?.[key], first = firstMed?.[key]
                const delta = val != null && first != null ? val - first : null
                return (
                  <div key={key}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, color: MEDIDA_COLORS[key], letterSpacing: 0.3 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1916' }}>{val != null ? val + ' cm' : '—'}</div>
                    {delta !== null && delta !== 0 && <DeltaBadge delta={delta} inverse />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {grasaChartData.length >= 2 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>Evolución % grasa</div>
            <LineChart data={grasaChartData} color="#BF5AF2" unit="%" />
          </div>
        )}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Evolución de medidas</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {medidasMetrics.map(({ key, color, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 10, color: '#9A9690', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <MultiLineChart data={medidas} metrics={medidasMetrics} />
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>Registrar medidas hoy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { key: 'grasa', label: '% Grasa', placeholder: 'ej. 22.5', unit: '%' },
              { key: 'cintura', label: 'Cintura', placeholder: 'ej. 72', unit: 'cm' },
              { key: 'cadera', label: 'Cadera', placeholder: 'ej. 96', unit: 'cm' },
              { key: 'brazo', label: 'Brazo', placeholder: 'ej. 30', unit: 'cm' },
              { key: 'muslo', label: 'Muslo', placeholder: 'ej. 54', unit: 'cm' },
            ].map(({ key, label, placeholder, unit }) => (
              <div key={key}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 6 }}>{label} <span style={{ color: '#B0ACA8', fontWeight: 500 }}>({unit})</span></div>
                <input type="number" step="0.1" placeholder={placeholder} value={newMedida[key] || ''} onChange={e => setNewMedida(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14, fontWeight: 600, outline: 'none', background: '#F5F2EE', color: '#1A1916', fontFamily: '-apple-system, sans-serif', boxSizing: 'border-box' as const }}
                  onFocus={e => e.target.style.borderColor = '#FF9F0A'} onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'} />
              </div>
            ))}
          </div>
          <div onClick={saveMedida} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, cursor: 'pointer', background: '#1A1916', fontSize: 14, fontWeight: 700, color: '#FFFFFF', opacity: savingMedida ? 0.7 : 1 }}>
            <Plus size={16} />{savingMedida ? 'Guardando...' : 'Guardar medidas'}
          </div>
          {medidas.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 10 }}>Historial</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>{['Fecha','Grasa','Cintura','Cadera','Brazo','Muslo'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left' as const, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[...medidas].reverse().slice(0, 6).map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '8px 8px', color: '#6B6762' }}>{m.date}</td>
                        {['grasa','cintura','cadera','brazo','muslo'].map(f => (
                          <td key={f} style={{ padding: '8px 8px', fontWeight: 600, color: '#1A1916' }}>{m[f] != null ? m[f] + (f === 'grasa' ? '%' : ' cm') : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </>}

      {/* ── TAB BIENESTAR ── */}
      {tab === 'bienestar' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { key: 'energia', label: 'Energía promedio', icon: Zap, color: '#FF9F0A', avg: avgEnergia },
            { key: 'sueno', label: 'Sueño promedio', icon: Moon, color: '#0A84FF', avg: avgSueno },
          ].map(({ label, icon: Icon, color, avg }) => (
            <div key={label} style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color={color} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690' }}>{label}</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#1A1916', letterSpacing: -1 }}>{avg != null ? avg + '/10' : '—'}</div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: '#F0EDE8', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(avg || 0) * 10}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
        {bienestarData.length >= 2 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>Energía y sueño</div>
            <MultiLineChart data={bienestarData.map(m => ({ date: m.date, energia: m.energia, sueno: m.sueno }))}
              metrics={[{ key: 'energia', color: '#FF9F0A', label: 'Energía' }, { key: 'sueno', color: '#0A84FF', label: 'Sueño' }]} height={140} />
          </div>
        )}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>¿Cómo te sientes hoy?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[{ key: 'energia', label: 'Energía', icon: Zap, color: '#FF9F0A' }, { key: 'sueno', label: 'Calidad de sueño', icon: Moon, color: '#0A84FF' }].map(({ key, label, icon: Icon, color }) => (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Icon size={13} color={color} strokeWidth={2.5} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6762' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <div key={n} onClick={() => setNewMedida(prev => ({ ...prev, [key]: String(n) }))}
                      style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: newMedida[key] === String(n) ? color : '#F5F2EE', color: newMedida[key] === String(n) ? '#FFFFFF' : '#6B6762', transition: 'all 0.15s' }}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div onClick={saveMedida} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, cursor: 'pointer', background: '#1A1916', fontSize: 14, fontWeight: 700, color: '#FFFFFF', opacity: savingMedida ? 0.7 : 1 }}>
            <Plus size={16} />{savingMedida ? 'Guardando...' : 'Guardar check-in'}
          </div>
          {bienestarData.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 10 }}>Últimos check-ins</div>
              {[...bienestarData].reverse().slice(0, 7).map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 13, color: '#6B6762' }}>{m.date}</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {m.energia != null && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={11} color="#FF9F0A" /><span style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>{m.energia}/10</span></div>}
                    {m.sueno != null && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Moon size={11} color="#0A84FF" /><span style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>{m.sueno}/10</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>}
    </div>
  )
}