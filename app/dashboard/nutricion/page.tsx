'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

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

function today() { return new Date().toISOString().split('T')[0] }

function getCyclePhase(day: number) {
  return CYCLE_PHASES.find(p => day >= p.s && day <= p.e) || CYCLE_PHASES[1]
}

function getDayAdjustment(profile: any) {
  const dowIndex = new Date().getDay() // 0=Dom, 1=Lun...
  const mapped = [6, 0, 1, 2, 3, 4, 5][dowIndex] // mapear a nuestro array
  const todayPlan = WEEK_PLAN[mapped]

  let calAdj = 0
  let dayLabel = 'Día normal'

  if (todayPlan.gym) { calAdj = +200; dayLabel = 'Día de entreno +200 kcal' }
  if (todayPlan.rest) { calAdj = -150; dayLabel = 'Día de descanso −150 kcal' }

  // Ciclo solo para mujeres
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
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)

      // Perfil
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      setProfile(prof)

      // Plan nutricional
      const { data: mp } = await supabase
        .from('meal_plans')
        .select('meals')
        .eq('user_id', data.user.id)
        .single()
      if (mp?.meals) setMeals(mp.meals)

      // Checks del día
      const { data: log } = await supabase
        .from('daily_logs')
        .select('checks')
        .eq('user_id', data.user.id)
        .eq('date', today())
        .single()
      if (log?.checks) setChecks(log.checks)

      setLoading(false)
    })
  }, [])

  async function toggleCheck(mealId: string, idx: number) {
    const key = `${mealId}_${idx}`
    const newChecks = { ...checks, [key]: !checks[key] }
    setChecks(newChecks)
    const supabase = createClient()
    await supabase
      .from('daily_logs')
      .upsert({ user_id: userId, date: today(), checks: newChecks },
        { onConflict: 'user_id,date' })
  }

  function calcTotals() {
    let cal = 0, p = 0, c = 0, f = 0
    meals.forEach(meal => {
      meal.items.forEach((item: any, idx: number) => {
        if (checks[`${meal.id}_${idx}`]) {
          cal += item.cal; p += item.p; c += item.c; f += item.f
        }
      })
    })
    return { cal, p, c, f }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>
      Cargando...
    </div>
  )

  const { calAdj, dayLabel, phase } = getDayAdjustment(profile)
  const baseTarget = profile?.target_cal || 2213
  const targetCal = baseTarget + calAdj
  const targetProt = profile?.prot || 193
  const targetCarbs = profile?.carbs || 221
  const targetFat = profile?.fat || 61
  const totals = calcTotals()
  const calPct = Math.min(Math.round(totals.cal / targetCal * 100), 100)

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Nutrición</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>
          Plan del día
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Ajuste del día */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#FFFFFF', borderRadius: 100, padding: '7px 14px',
        marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {phase && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: phase.color, flexShrink: 0,
          }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1916' }}>
          {targetCal.toLocaleString()} kcal hoy
        </span>
        <span style={{ fontSize: 11, color: '#9A9690' }}>· {dayLabel}</span>
      </div>

      {/* CALORIE HERO */}
      <div style={{
        background: '#1A1916', borderRadius: 20, padding: '24px',
        marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
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

          {/* Ring */}
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

        {/* Macros */}
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
          if (checks[`${meal.id}_${idx}`]) {
            return { cal: acc.cal + item.cal, p: acc.p + item.p }
          }
          return acc
        }, { cal: 0, p: 0 })

        const allDone = meal.items.every((_: any, idx: number) => checks[`${meal.id}_${idx}`])

        return (
          <div key={meal.id} style={{
            background: '#FFFFFF', borderRadius: 18,
            marginBottom: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            border: `1.5px solid ${allDone ? '#FF9F0A' : 'transparent'}`,
            transition: 'border-color 0.3s',
          }}>
            {/* Header */}
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
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: allDone ? '#FF9F0A' : '#1A1916' }}>
                  {mealTotals.cal} kcal
                </div>
                <div style={{ fontSize: 10, color: '#9A9690' }}>P: {mealTotals.p}g</div>
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: '4px 0' }}>
              {meal.items.map((item: any, idx: number) => {
                const done = !!checks[`${meal.id}_${idx}`]
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(meal.id, idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 18px', cursor: 'pointer',
                      borderBottom: idx < meal.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      transition: 'background 0.15s',
                    }}
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
                        textDecoration: done ? 'line-through' : 'none',
                        transition: 'all 0.2s',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9A9690', marginTop: 1 }}>
                        {item.g} · P:{item.p}g C:{item.c}g G:{item.f}g
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, color: done ? '#B0ACA8' : '#1A1916' }}>
                      {item.cal}
                    </div>
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