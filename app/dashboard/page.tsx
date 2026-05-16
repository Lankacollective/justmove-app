'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Droplets, Flame, Target, ChevronRight, Moon, Dumbbell, Weight, Apple, Zap } from 'lucide-react'
import { getDailyLog, getMealPlan, calcTotalsFromChecks, today, getRealDayIndex } from '@/lib/store'

const WEEK_PLAN = [
  { day: 'Lun', name: 'Espalda + Bíceps', type: 'Fuerza', gym: true, dur: 60 },
  { day: 'Mar', name: 'Indoor Cycling', type: 'Cardio', gym: false, dur: 45 },
  { day: 'Mié', name: 'Piernas + Glúteos', type: 'Fuerza', gym: true, dur: 70 },
  { day: 'Jue', name: 'Indoor Cycling', type: 'Cardio', gym: false, dur: 45 },
  { day: 'Vie', name: 'Pecho + Hombros', type: 'Fuerza', gym: true, dur: 60 },
  { day: 'Sáb', name: 'LISS + Core', type: 'Cardio', gym: false, dur: 50 },
  { day: 'Dom', name: 'Descanso activo', type: 'Descanso', gym: false, dur: 0, rest: true },
]

// Obtiene las fechas de lunes a hoy de la semana actual
function getWeekDates(): string[] {
  const now = new Date()
  const dow = now.getDay() // 0=Dom
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const dates: string[] = []
  for (let i = 0; i <= (dow === 0 ? 6 : dow - 1); i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// Widget de hábito semanal
function HabitBar({
  icon: Icon, label, color, days, target, unit = '', subtitle,
}: {
  icon: any, label: string, color: string, days: (number | boolean)[]
  target: number, unit?: string, subtitle?: string
}) {
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const completed = days.filter(d => typeof d === 'boolean' ? d : (d as number) >= target).length
  const pct = Math.round((completed / 7) * 100)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={color} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>{label}</div>
            {subtitle && <div style={{ fontSize: 10, color: '#9A9690' }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color }}>{completed}</span>
          <span style={{ fontSize: 11, color: '#B0ACA8' }}>/7 días</span>
        </div>
      </div>

      {/* Day dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
        {weekDays.map((d, i) => {
          const val = days[i]
          const done = typeof val === 'boolean' ? val : (val as number) >= target
          const hasData = val !== undefined && val !== null && val !== false && val !== 0
          const isFuture = i >= days.length
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', height: 28, borderRadius: 6,
                background: isFuture ? '#F0EDE8' : done ? color : hasData ? `${color}30` : '#F0EDE8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
                border: isFuture ? '1px dashed rgba(0,0,0,0.08)' : 'none',
              }}>
                {!isFuture && done && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {!isFuture && !done && hasData && (
                  <span style={{ fontSize: 8, fontWeight: 700, color }}>{typeof val === 'number' ? val : ''}</span>
                )}
              </div>
              <span style={{ fontSize: 8, fontWeight: 600, color: isFuture ? '#D4D0CB' : '#9A9690' }}>{d}</span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: '#F0EDE8', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null)
  const [totals, setTotals] = useState({ cal: 0, p: 0, c: 0, f: 0 })
  const [water, setWater] = useState(0)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [calsBurned, setCalsBurned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  // Hábitos semanales: array de 7 slots (lunes a domingo)
  const [habitProtein, setHabitProtein] = useState<number[]>(Array(7).fill(0))
  const [habitWater, setHabitWater] = useState<number[]>(Array(7).fill(0))
  const [habitWorkout, setHabitWorkout] = useState<boolean[]>(Array(7).fill(false))
  const [habitSleep, setHabitSleep] = useState<boolean[]>(Array(7).fill(false))

  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)

      // Log de hoy
      const log = await getDailyLog(data.user.id, today())
      if (log) {
        setWater(log.water || 0)
        const meals = await getMealPlan(data.user.id)
        const t = calcTotalsFromChecks(meals, log.checks || {})
        setTotals(t)
      }

      // Workout hoy
      const { data: wlog } = await supabase.from('workout_logs').select('*').eq('user_id', data.user.id).eq('date', today()).single()
      if (wlog) { setWorkoutDone(true); setCalsBurned(wlog.calories_burned || 0) }

      // ── Hábitos semanales ──────────────────────────────────────────────────
      const weekDates = getWeekDates()
      const todayDow = new Date().getDay()
      const daysElapsed = todayDow === 0 ? 7 : todayDow // lunes=1 ... domingo=7

      // Daily logs de toda la semana
      const { data: weekLogs } = await supabase
        .from('daily_logs').select('date, water, checks')
        .eq('user_id', data.user.id)
        .in('date', weekDates)

      // Workout logs de toda la semana
      const { data: weekWorkouts } = await supabase
        .from('workout_logs').select('date')
        .eq('user_id', data.user.id)
        .in('date', weekDates)

      // Medidas de la semana (sueño)
      const { data: weekMedidas } = await supabase
        .from('medidas').select('date, sueno')
        .eq('user_id', data.user.id)
        .in('date', weekDates)

      // Meal plan para calcular proteína
      const meals = await getMealPlan(data.user.id)
      const totalItems = meals.reduce((a: number, m: any) => a + (m.items?.length || 0), 0)

      const pArr = Array(7).fill(0)
      const wArr = Array(7).fill(0)
      const woArr = Array(7).fill(false)
      const slArr = Array(7).fill(false)

      weekDates.forEach((date, i) => {
        const log = weekLogs?.find(l => l.date === date)
        const workout = weekWorkouts?.find(w => w.date === date)
        const medida = weekMedidas?.find(m => m.date === date)
        const dayIdx = i // 0=lunes

        if (log) {
          // Proteína: % de checks completados (0-100)
          if (log.checks && totalItems > 0) {
            const checked = Object.values(log.checks).filter(Boolean).length
            pArr[dayIdx] = Math.round((checked / totalItems) * 100)
          }
          wArr[dayIdx] = log.water || 0
        }
        if (workout) woArr[dayIdx] = true
        if (medida?.sueno) slArr[dayIdx] = medida.sueno >= 7
      })

      setHabitProtein(pArr)
      setHabitWater(wArr)
      setHabitWorkout(woArr)
      setHabitSleep(slArr)

      setLoading(false)
    })
  }, [])

  async function tapWater(i: number) {
    const newVal = water === i + 1 ? i : i + 1
    setWater(newVal)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date: today(), water: newVal },
      { onConflict: 'user_id,date' }
    )
    // Actualizar hábito agua de hoy
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
    setHabitWater(prev => { const n = [...prev]; n[todayIdx] = newVal; return n })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>Cargando...</div>
  )

  const name = profile?.name?.split(' ')[0]
  const goalPct = profile ? Math.min(Math.round((1 - (profile.weight - profile.goal_weight) / (68.5 - profile.goal_weight)) * 100), 100) : 0
  const weightLeft = profile ? Math.max(profile.weight - profile.goal_weight, 0).toFixed(1) : '—'
  const todayPlan = WEEK_PLAN[getRealDayIndex()]
  const waterGoal = Math.round((profile?.weight || 65) * 0.035) + 2
  const calPct = Math.min(Math.round(totals.cal / (profile?.target_cal || 1400) * 100), 100)

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>Hola, {name} 👋</div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>Veamos tu actividad de hoy</div>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Calorías', value: totals.cal.toLocaleString(), meta: `de ${profile?.target_cal?.toLocaleString()} kcal`, icon: Flame, dark: true },
          { label: 'Proteína', value: totals.p + 'g', meta: `de ${profile?.prot}g`, icon: Target, accent: true },
          { label: 'Agua', value: `${water}/${waterGoal}`, meta: `${(water * 0.25).toFixed(2)}L`, icon: Droplets },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          const bg = kpi.dark ? '#1A1916' : kpi.accent ? '#FF9F0A' : '#FFFFFF'
          const textColor = kpi.dark || kpi.accent ? '#FFFFFF' : '#1A1916'
          const subColor = kpi.dark || kpi.accent ? 'rgba(255,255,255,0.35)' : 'rgba(26,25,22,0.4)'
          return (
            <div key={i} style={{ background: bg, borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: subColor, marginBottom: 10 }}>{kpi.label}</div>
                <Icon size={15} color={kpi.dark ? '#FF9F0A' : kpi.accent ? '#FFFFFF' : '#FF9F0A'} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.5, color: textColor, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, marginTop: 6, color: subColor }}>{kpi.meta}</div>
            </div>
          )
        })}
      </div>

      {/* WATER */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 12 }}>
          Hidratación · {(water * 0.25).toFixed(2)}L de {(waterGoal * 0.25).toFixed(1)}L
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {Array.from({ length: waterGoal }, (_, i) => (
            <div key={i} onClick={() => tapWater(i)} style={{
              width: 32, height: 32, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
              background: i < water ? '#0A84FF' : '#F0EDE8',
              border: `1px solid ${i < water ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14, marginBottom: 16 }}>
        {/* Workout */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 14 }}>Entrenamiento hoy</div>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: workoutDone ? 'rgba(48,209,88,0.1)' : '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Dumbbell size={20} color={workoutDone ? '#30D158' : '#1A1916'} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 3 }}>{todayPlan.name}</div>
          <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 18 }}>
            {workoutDone ? '✓ Completado hoy' : `${todayPlan.type} · ~${todayPlan.dur} min`}
          </div>
          {!workoutDone && (
            <div onClick={() => router.push('/dashboard/entreno')} style={{ background: '#1A1916', borderRadius: 10, padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              Iniciar sesión <ChevronRight size={15} color="#FF9F0A" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Macros */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 14 }}>Macros de hoy</div>
          {[
            { label: 'Proteína', val: totals.p, target: profile?.prot || 120, color: '#FF453A' },
            { label: 'Carbos', val: totals.c, target: profile?.carbs || 140, color: '#0A84FF' },
            { label: 'Grasa', val: totals.f, target: profile?.fat || 50, color: '#FF9F0A' },
          ].map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1916' }}>{m.label}</span>
                <span style={{ fontSize: 12, color: '#9A9690' }}>{m.val}g / {m.target}g</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#F0EDE8', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(m.val / m.target * 100, 100)}%`, background: m.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
          <div onClick={() => router.push('/dashboard/nutricion')} style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#FF9F0A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver plan completo <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* HÁBITOS SEMANALES */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '22px 24px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Hábitos semanales</div>
            <div style={{ fontSize: 12, color: '#B0ACA8', marginTop: 2 }}>Se resetea cada lunes automáticamente</div>
          </div>
          {/* Semana actual */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9A9690', background: '#F5F2EE', padding: '4px 10px', borderRadius: 8 }}>
            Semana {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </div>
        </div>

        <HabitBar
          icon={Apple} label="Proteína completa" color="#FF453A"
          days={habitProtein} target={80}
          subtitle="80%+ de comidas completadas"
        />
        <HabitBar
          icon={Droplets} label="Hidratación" color="#0A84FF"
          days={habitWater} target={waterGoal}
          subtitle={`${waterGoal} vasos al día`}
        />
        <HabitBar
          icon={Dumbbell} label="Entreno completado" color="#30D158"
          days={habitWorkout} target={1}
          subtitle="Sesión registrada"
        />
        <HabitBar
          icon={Moon} label="Sueño reparador" color="#BF5AF2"
          days={habitSleep} target={1}
          subtitle="7+ horas registradas"
        />
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        {/* Activity */}
        <div style={{ background: '#E8E4DE', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', minHeight: 160, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 4, position: 'relative', zIndex: 2 }}>Resultados de hoy</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1916', position: 'relative', zIndex: 2 }}>Tu actividad</div>
          <div style={{ position: 'absolute', right: 50, top: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,159,10,0.4)', filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', right: 90, top: 50, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,69,58,0.3)', filter: 'blur(18px)' }} />
          <div style={{ position: 'absolute', right: 30, top: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(26,25,22,0.5)', filter: 'blur(14px)' }} />
          <div style={{ marginTop: 48, display: 'flex', gap: 24, position: 'relative', zIndex: 2 }}>
            {[
              { label: 'Kcal consumidas', value: totals.cal > 0 ? totals.cal.toLocaleString() : '—' },
              { label: 'Kcal quemadas', value: calsBurned > 0 ? calsBurned.toLocaleString() : '—' },
              { label: 'Balance', value: calsBurned > 0 ? (totals.cal - calsBurned).toLocaleString() : '—' },
            ].map((s, i) => (
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
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2, color: '#1A1916', lineHeight: 1 }}>{profile?.weight || '—'}</div>
          <div style={{ fontSize: 12, color: '#9A9690', marginTop: 5, marginBottom: 18 }}>
            kg · objetivo <strong style={{ color: '#1A1916' }}>{profile?.goal_weight} kg</strong>
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