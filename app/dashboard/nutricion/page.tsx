'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check, RefreshCw, ShoppingCart } from 'lucide-react'

const WEEK_PLAN = [
  { day: 'Lun', gym: true, rest: false },
  { day: 'Mar', gym: false, rest: false },
  { day: 'Mié', gym: true, rest: false },
  { day: 'Jue', gym: false, rest: false },
  { day: 'Vie', gym: true, rest: false },
  { day: 'Sáb', gym: false, rest: false },
  { day: 'Dom', gym: false, rest: true },
]

const CYCLE_PHASES = [
  { s: 1, e: 5, n: 'Menstruación', calAdj: 0, color: '#FF453A' },
  { s: 6, e: 13, n: 'Fase Folicular', calAdj: -100, color: '#FF9F0A' },
  { s: 14, e: 16, n: 'Ovulación', calAdj: -50, color: '#D4FF47' },
  { s: 17, e: 35, n: 'Fase Lútea', calAdj: +100, color: '#BF5AF2' },
]

const SUBSTITUTES: Record<string, { name: string, cal: number, p: number, c: number, f: number, g: string }[]> = {
  'Gelatina sin azúcar': [
    { name: 'Pepino', cal: 15, p: 1, c: 4, f: 0, g: '100g' },
    { name: 'Jícama', cal: 38, p: 1, c: 9, f: 0, g: '100g' },
    { name: 'Apio', cal: 16, p: 1, c: 3, f: 0, g: '100g' },
  ],
  'Avena cruda': [
    { name: 'Camote cocido', cal: 90, p: 2, c: 21, f: 0, g: '100g' },
    { name: 'Arroz integral', cal: 111, p: 3, c: 23, f: 1, g: '100g' },
    { name: 'Plátano', cal: 89, p: 1, c: 23, f: 0, g: '1 pieza' },
  ],
  'Pechuga de pollo': [
    { name: 'Atún en agua', cal: 116, p: 26, c: 0, f: 1, g: '100g' },
    { name: 'Tilapia', cal: 96, p: 20, c: 0, f: 2, g: '100g' },
    { name: 'Huevo entero', cal: 143, p: 13, c: 1, f: 10, g: '2 piezas' },
    { name: 'Camarón', cal: 99, p: 18, c: 1, f: 2, g: '100g' },
  ],
  'Salmón o tilapia': [
    { name: 'Pechuga de pollo', cal: 165, p: 31, c: 0, f: 4, g: '100g' },
    { name: 'Atún en agua', cal: 116, p: 26, c: 0, f: 1, g: '100g' },
    { name: 'Camarón', cal: 99, p: 18, c: 1, f: 2, g: '100g' },
  ],
  'Arroz blanco cocido': [
    { name: 'Camote cocido', cal: 90, p: 2, c: 21, f: 0, g: '100g' },
    { name: 'Papa cocida', cal: 87, p: 2, c: 20, f: 0, g: '100g' },
    { name: 'Quinoa cocida', cal: 120, p: 4, c: 22, f: 2, g: '100g' },
  ],
  'Yogur griego 0%': [
    { name: 'Requesón', cal: 72, p: 12, c: 3, f: 1, g: '100g' },
    { name: 'Kéfir natural', cal: 60, p: 4, c: 5, f: 3, g: '150ml' },
  ],
  'Almendras': [
    { name: 'Nueces', cal: 65, p: 2, c: 1, f: 6, g: '10g' },
    { name: 'Cacahuates', cal: 57, p: 3, c: 2, f: 5, g: '10g' },
  ],
  'Whey proteína': [
    { name: 'Claras de huevo', cal: 52, p: 11, c: 1, f: 0, g: '100g' },
    { name: 'Requesón', cal: 72, p: 12, c: 3, f: 1, g: '100g' },
  ],
  'Huevos revueltos': [
    { name: 'Claras de huevo', cal: 52, p: 11, c: 1, f: 0, g: '150g' },
    { name: 'Omelette de atún', cal: 180, p: 28, c: 1, f: 7, g: '1 porción' },
  ],
  'Pan integral': [
    { name: 'Tortilla de maíz', cal: 109, p: 3, c: 23, f: 1, g: '2 piezas' },
    { name: 'Camote', cal: 90, p: 2, c: 21, f: 0, g: '100g' },
  ],
}

function today() { return new Date().toISOString().split('T')[0] }

function getCyclePhase(day: number) {
  return CYCLE_PHASES.find(p => day >= p.s && day <= p.e) || CYCLE_PHASES[1]
}

function getDayAdjustment(profile: any) {
  const dowIndex = new Date().getDay()
  const mapped = [6, 0, 1, 2, 3, 4, 5][dowIndex]
  const todayPlan = WEEK_PLAN[mapped]
  let calAdj = 0
  let dayLabel = 'Día normal'
  if (todayPlan.gym) { calAdj = +200; dayLabel = 'Día de entreno +200 kcal' }
  if (todayPlan.rest) { calAdj = -150; dayLabel = 'Día de descanso −150 kcal' }
  if (profile?.sex === 'F' && profile?.cycle_day) {
    const phase = getCyclePhase(profile.cycle_day)
    calAdj += phase.calAdj
    dayLabel += ` · ${phase.n} ${phase.calAdj >= 0 ? '+' : ''}${phase.calAdj} kcal`
    return { calAdj, dayLabel, phase }
  }
  return { calAdj, dayLabel, phase: null }
}

export default function Nutricion() {
  const [profile, setProfile] = useState<any>(null)
  const [meals, setMeals] = useState<any[]>([])
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [substitutions, setSubstitutions] = useState<Record<string, any>>({})
  const [showSubs, setShowSubs] = useState<string | null>(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      const { data: mp } = await supabase.from('meal_plans').select('meals').eq('user_id', data.user.id).single()
      if (mp?.meals) setMeals(mp.meals)
      const { data: log } = await supabase.from('daily_logs').select('checks, substitutions').eq('user_id', data.user.id).eq('date', today()).single()
      if (log?.checks) setChecks(log.checks)
      if (log?.substitutions) setSubstitutions(log.substitutions)
      setLoading(false)
    })
  }, [])

  async function toggleCheck(mealId: string, idx: number) {
    const key = `${mealId}_${idx}`
    const newChecks = { ...checks, [key]: !checks[key] }
    setChecks(newChecks)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date: today(), checks: newChecks, substitutions },
      { onConflict: 'user_id,date' }
    )
  }

  async function applySubstitute(mealId: string, idx: number, sub: any) {
    const key = `${mealId}_${idx}`
    const newSubs = { ...substitutions, [key]: sub }
    const newChecks = { ...checks, [key]: true }
    setSubstitutions(newSubs)
    setChecks(newChecks)
    setShowSubs(null)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date: today(), checks: newChecks, substitutions: newSubs },
      { onConflict: 'user_id,date' }
    )
  }

  async function clearSubstitute(mealId: string, idx: number) {
    const key = `${mealId}_${idx}`
    const newSubs = { ...substitutions }
    delete newSubs[key]
    setSubstitutions(newSubs)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date: today(), checks, substitutions: newSubs },
      { onConflict: 'user_id,date' }
    )
  }

  function calcTotals() {
    let cal = 0, p = 0, c = 0, f = 0
    meals.forEach(meal => {
      meal.items.forEach((item: any, idx: number) => {
        const key = `${meal.id}_${idx}`
        if (checks[key]) {
          const sub = substitutions[key]
          cal += sub ? sub.cal : item.cal
          p += sub ? sub.p : item.p
          c += sub ? sub.c : item.c
          f += sub ? sub.f : item.f
        }
      })
    })
    return { cal: Math.round(cal), p: Math.round(p), c: Math.round(c), f: Math.round(f) }
  }

  function buildShoppingList() {
    const items: Record<string, { name: string, quantities: string[] }> = {}
    meals.forEach(meal => {
      meal.items.forEach((item: any) => {
        const key = item.name.toLowerCase()
        if (!items[key]) items[key] = { name: item.name, quantities: [] }
        items[key].quantities.push(item.g)
      })
    })
    return Object.values(items)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>
      Cargando...
    </div>
  )

  const { calAdj, dayLabel, phase } = getDayAdjustment(profile)
  const baseTarget = profile?.target_cal || 1400
  const targetCal = baseTarget + calAdj
  const targetProt = profile?.prot || 120
  const targetCarbs = profile?.carbs || 140
  const targetFat = profile?.fat || 50
  const totals = calcTotals()
  const calPct = Math.min(Math.round(totals.cal / targetCal * 100), 100)
  const shoppingList = buildShoppingList()

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Nutrición</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>Plan del día</div>
          <div
            onClick={() => setShowShoppingList(!showShoppingList)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              background: showShoppingList ? '#1A1916' : '#FFFFFF',
              border: '1.5px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <ShoppingCart size={14} color={showShoppingList ? '#FF9F0A' : '#1A1916'} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: showShoppingList ? '#FFFFFF' : '#1A1916' }}>Lista</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Shopping list */}
      {showShoppingList && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 14 }}>🛒 Lista de compras semanal</div>
          {shoppingList.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0', borderBottom: i < shoppingList.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <span style={{ fontSize: 13, color: '#1A1916', fontWeight: 500 }}>{item.name}</span>
              <span style={{ fontSize: 11, color: '#9A9690' }}>{item.quantities.join(' + ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ajuste del día */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#FFFFFF', borderRadius: 100, padding: '7px 14px',
        marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {phase && <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase.color, flexShrink: 0 }} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1916' }}>{targetCal.toLocaleString()} kcal hoy</span>
        <span style={{ fontSize: 11, color: '#9A9690' }}>· {dayLabel}</span>
      </div>

      {/* CALORIE HERO */}
      <div style={{ background: '#1A1916', borderRadius: 20, padding: '24px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,159,10,0.12)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
              Calorías consumidas
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color: '#FFFFFF' }}>
              {totals.cal.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              de <span style={{ color: '#FF9F0A', fontWeight: 600 }}>{targetCal.toLocaleString()}</span>
              · restan <span style={{ color: '#FF9F0A', fontWeight: 600 }}>{Math.max(targetCal - totals.cal, 0).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="#FF9F0A" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - calPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>{calPct}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, position: 'relative', zIndex: 2 }}>
          {[
            { label: 'Proteína', val: totals.p, target: targetProt, color: '#FF453A' },
            { label: 'Carbos', val: totals.c, target: targetCarbs, color: '#0A84FF' },
            { label: 'Grasa', val: totals.f, target: targetFat, color: '#FF9F0A' },
          ].map((m, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>{m.val}g</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, fontWeight: 600, letterSpacing: 0.3, marginTop: 2 }}>{m.label}</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(m.val / m.target * 100, 100)}%`, background: m.color, borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>/{m.target}g</div>
            </div>
          ))}
        </div>
      </div>

      {/* MEALS */}
      {meals.map(meal => {
        const mealTotals = meal.items.reduce((acc: any, item: any, idx: number) => {
          const key = `${meal.id}_${idx}`
          if (checks[key]) {
            const sub = substitutions[key]
            return { cal: acc.cal + (sub ? sub.cal : item.cal), p: acc.p + (sub ? sub.p : item.p) }
          }
          return acc
        }, { cal: 0, p: 0 })
        const allDone = meal.items.every((_: any, idx: number) => checks[`${meal.id}_${idx}`])

        return (
          <div key={meal.id} style={{
            background: '#FFFFFF', borderRadius: 18, marginBottom: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            border: `1.5px solid ${allDone ? '#FF9F0A' : 'transparent'}`,
            transition: 'border-color 0.3s',
          }}>
            {/* Meal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px',
              background: allDone ? 'rgba(255,159,10,0.04)' : '#FAFAF8',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>{meal.name}</div>
                <div style={{ fontSize: 11, color: '#9A9690', marginTop: 1 }}>{meal.time}</div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: allDone ? '#FF9F0A' : '#1A1916' }}>{mealTotals.cal} kcal</div>
                <div style={{ fontSize: 10, color: '#9A9690' }}>P: {mealTotals.p}g</div>
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: '4px 0' }}>
              {meal.items.map((item: any, idx: number) => {
                const key = `${meal.id}_${idx}`
                const done = !!checks[key]
                const sub = substitutions[key]
                const hasSubs = !!SUBSTITUTES[item.name]
                const showSubsFor = showSubs === key

                return (
                  <div key={idx} style={{
                    borderBottom: idx < meal.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    {/* Main item row */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 18px', cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onClick={() => toggleCheck(meal.id, idx)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAF8'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: done ? '#FF9F0A' : 'transparent',
                        border: done ? 'none' : '1.5px solid #D4D0CB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {done && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          color: done ? '#B0ACA8' : '#1A1916',
                          textDecoration: done && !sub ? 'line-through' : 'none',
                        }}>
                          {sub ? (
                            <span>
                              <span style={{ textDecoration: 'line-through', color: '#B0ACA8', fontSize: 11 }}>{item.name}</span>
                              {' → '}<span style={{ color: '#FF9F0A', fontWeight: 600 }}>{sub.name}</span>
                            </span>
                          ) : item.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#9A9690', marginTop: 1 }}>
                          {sub ? `${sub.g} · P:${sub.p}g C:${sub.c}g G:${sub.f}g` : `${item.g} · P:${item.p}g C:${item.c}g G:${item.f}g`}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, color: done ? '#B0ACA8' : '#1A1916' }}>
                        {sub ? sub.cal : item.cal}
                      </div>
                    </div>

                    {/* Substitute button */}
                    {hasSubs && (
                      <div style={{ paddingLeft: 52, paddingRight: 18, paddingBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            onClick={() => setShowSubs(showSubsFor ? null : key)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, color: '#0A84FF', fontWeight: 600,
                              cursor: 'pointer', padding: '3px 8px',
                              background: 'rgba(10,132,255,0.06)', borderRadius: 6,
                            }}
                          >
                            <RefreshCw size={10} strokeWidth={2.5} />
                            {sub ? 'Cambiar sustituto' : 'No tengo esto'}
                          </div>
                          {sub && (
                            <div
                              onClick={() => clearSubstitute(meal.id, idx)}
                              style={{ fontSize: 11, color: '#9A9690', cursor: 'pointer', padding: '3px 8px' }}
                            >
                              Restaurar original
                            </div>
                          )}
                        </div>

                        {/* Substitutes list */}
                        {showSubsFor && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                            {SUBSTITUTES[item.name].map((s, si) => (
                              <div
                                key={si}
                                onClick={() => applySubstitute(meal.id, idx, s)}
                                style={{
                                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                                  background: '#F5F2EE', border: '1px solid rgba(0,0,0,0.06)',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#EDEAE6'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F5F2EE'}
                              >
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1916' }}>{s.name}</div>
                                  <div style={{ fontSize: 10, color: '#9A9690' }}>{s.g} · P:{s.p}g C:{s.c}g G:{s.f}g</div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#FF9F0A' }}>{s.cal} kcal</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}