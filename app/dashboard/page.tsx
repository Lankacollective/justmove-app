'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Droplets, Flame, Target, ChevronRight, Moon, Dumbbell, Weight, Apple, Zap, AlertTriangle, Check } from 'lucide-react'
import { getDailyLog, getMealPlan, calcTotalsFromChecks, today, getRealDayIndex } from '@/lib/store'

const WEEK_PLAN_MATHIAS = [
  { day: 'Lun', name: 'Tren Superior', type: 'Fuerza', gym: false, dur: 45 },
  { day: 'Mar', name: 'Tren Inferior + Core', type: 'Fuerza', gym: false, dur: 45 },
  { day: 'Mié', name: 'Cardio + Movilidad', type: 'Cardio', gym: false, dur: 60 },
  { day: 'Jue', name: 'Tren Superior', type: 'Fuerza', gym: false, dur: 45 },
  { day: 'Vie', name: 'Tren Inferior + Core', type: 'Fuerza', gym: false, dur: 45 },
  { day: 'Sáb', name: 'Descanso activo', type: 'Cardio', gym: false, dur: 30 },
  { day: 'Dom', name: 'Descanso', type: 'Descanso', gym: false, dur: 0, rest: true },
]

const WEEK_PLAN_PAOLA = [
  { day: 'Lun', name: 'Tren Superior', type: 'Fuerza', gym: true, dur: 45 },
  { day: 'Mar', name: 'Cardio suave', type: 'Cardio', gym: false, dur: 45 },
  { day: 'Mié', name: 'Tren Inferior', type: 'Fuerza', gym: false, dur: 45 },
  { day: 'Jue', name: 'Descanso activo', type: 'Descanso', gym: false, dur: 25 },
  { day: 'Vie', name: 'Full Body', type: 'Fuerza', gym: true, dur: 45 },
  { day: 'Sáb', name: 'Cardio', type: 'Cardio', gym: false, dur: 40 },
  { day: 'Dom', name: 'Descanso total', type: 'Descanso', gym: false, dur: 0, rest: true },
]

const CHECKLIST_MATHIAS = [
  'Kéfir + agua con limón en ayunas (antes 7:30am)',
  'Jugo verde preparado y tomado',
  'Desayuno registrado en app ANTES de comer',
  'Toda la proteína pesada en báscula',
  'NINGUNA grasa sin pesar y registrar',
  'Cardio completado (mínimo 30 min)',
  '2.5-3 litros de agua',
  'Sin alimentos procesados (sodio controlado)',
  'Colación nocturna registrada si hubo',
  'Total del día dentro de 2,300-2,500 kcal',
]

const CHECKLIST_PAOLA = [
  'Kéfir de cabra + agua tibia con limón en ayunas',
  'Vitamina D3 + Omega-3 con el desayuno',
  'Sin pan, azúcar refinada ni lácteos convencionales',
  'Proteína pesada y registrada en cada comida',
  'Colación anti-cortisol lista para emergencias',
  'Entrenamiento completado (máx 50 min)',
  '3.0-3.5 litros de agua',
  'Distensión abdominal post-comida: Sin malestar',
  'Glutamina en ayunas (5g)',
  'Total del día dentro de 1,900-2,150 kcal',
]

const GRASAS_OCULTAS = [
  { name: 'Cacahuates', porcion: '30g', grasa: '15g', kcal: 170, pct: 23 },
  { name: 'Aguacate', porcion: '½ pieza', grasa: '11g', kcal: 115, pct: 17 },
  { name: 'Aceite oliva', porcion: '1 cda', grasa: '14g', kcal: 120, pct: 22 },
  { name: 'Chorizo', porcion: '50g', grasa: '18g', kcal: 220, pct: 28 },
  { name: 'Queso panela', porcion: '60g', grasa: '8g', kcal: 140, pct: 12 },
]

function getWeekDates(): string[] {
  const now = new Date()
  const dow = now.getDay()
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

function HabitBar({ icon: Icon, label, color, days, target, subtitle }: {
  icon: any, label: string, color: string, days: (number | boolean)[]
  target: number, subtitle?: string
}) {
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const completed = days.filter(d => typeof d === 'boolean' ? d : (d as number) >= target).length
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={12} color={color} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>{label}</div>
            {subtitle && <div style={{ fontSize: 10, color: '#9A9690' }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color }}>{completed}</span>
          <span style={{ fontSize: 10, color: '#B0ACA8' }}>/7</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {weekDays.map((d, i) => {
          const val = days[i]
          const done = typeof val === 'boolean' ? val : (val as number) >= target
          const isFuture = i >= days.length
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: '100%', height: 24, borderRadius: 5,
                background: isFuture ? '#F0EDE8' : done ? color : '#F0EDE8',
                border: isFuture ? '1px dashed rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!isFuture && done && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 7, fontWeight: 600, color: isFuture ? '#D4D0CB' : '#9A9690' }}>{d}</span>
            </div>
          )
        })}
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
  const [checklist, setChecklist] = useState<Record<number, boolean>>({})
  const [showGrasas, setShowGrasas] = useState(false)
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

      const log = await getDailyLog(data.user.id, today())
      if (log) {
        setWater(log.water || 0)
        if (log.checklist) setChecklist(log.checklist)
        const meals = await getMealPlan(data.user.id)
        const t = calcTotalsFromChecks(meals, log.checks || {})
        setTotals(t)
      }

      const { data: wlog } = await supabase.from('workout_logs').select('*').eq('user_id', data.user.id).eq('date', today()).single()
      if (wlog) { setWorkoutDone(true); setCalsBurned(wlog.calories_burned || 0) }

      const weekDates = getWeekDates()
      const { data: weekLogs } = await supabase.from('daily_logs').select('date, water, checks').eq('user_id', data.user.id).in('date', weekDates)
      const { data: weekWorkouts } = await supabase.from('workout_logs').select('date').eq('user_id', data.user.id).in('date', weekDates)
      const { data: weekMedidas } = await supabase.from('medidas').select('date, sueno').eq('user_id', data.user.id).in('date', weekDates)
      const meals = await getMealPlan(data.user.id)
      const totalItems = meals.reduce((a: number, m: any) => a + (m.items?.length || 0), 0)

      const pArr = Array(7).fill(0), wArr = Array(7).fill(0)
      const woArr = Array(7).fill(false), slArr = Array(7).fill(false)
      weekDates.forEach((date, i) => {
        const log = weekLogs?.find(l => l.date === date)
        const workout = weekWorkouts?.find(w => w.date === date)
        const medida = weekMedidas?.find(m => m.date === date)
        if (log) {
          if (log.checks && totalItems > 0) pArr[i] = Math.round((Object.values(log.checks).filter(Boolean).length / totalItems) * 100)
          wArr[i] = log.water || 0
        }
        if (workout) woArr[i] = true
        if (medida?.sueno) slArr[i] = medida.sueno >= 7
      })
      setHabitProtein(pArr); setHabitWater(wArr); setHabitWorkout(woArr); setHabitSleep(slArr)
      setLoading(false)
    })
  }, [])

  async function tapWater(i: number) {
    const newVal = water === i + 1 ? i : i + 1
    setWater(newVal)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert({ user_id: userId, date: today(), water: newVal }, { onConflict: 'user_id,date' })
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
    setHabitWater(prev => { const n = [...prev]; n[todayIdx] = newVal; return n })
  }

  async function toggleChecklist(i: number) {
    const newChecklist = { ...checklist, [i]: !checklist[i] }
    setChecklist(newChecklist)
    const supabase = createClient()
    await supabase.from('daily_logs').upsert({ user_id: userId, date: today(), checklist: newChecklist }, { onConflict: 'user_id,date' })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>Cargando...</div>
  )

  const isMathias = profile?.name?.toLowerCase().includes('mathias')
  const isPaola = profile?.sex === 'F'
  const name = profile?.name?.split(' ')[0]
  const weekPlan = isMathias ? WEEK_PLAN_MATHIAS : WEEK_PLAN_PAOLA
  const checklistItems = isMathias ? CHECKLIST_MATHIAS : CHECKLIST_PAOLA
  const todayPlan = weekPlan[getRealDayIndex()]
  const waterGoal = isMathias ? 12 : 14 // 3L / 3.5L en vasos de 250ml
  const calPct = Math.min(Math.round(totals.cal / (profile?.target_cal || 2000) * 100), 100)
  const checklistDone = Object.values(checklist).filter(Boolean).length
  const goalPct = profile?.goal_weight && profile?.weight
    ? Math.min(Math.round(Math.abs((profile.weight - (isMathias ? 120 : 68.5)) / ((isMathias ? 120 : 68.5) - profile.goal_weight)) * 100), 100)
    : 0

  // KPIs semanales según el plan real
  const weekNumber = 1 // TODO: calcular semana real del programa
  const kpiWeight = isMathias
    ? weekNumber === 1 ? '118-119 kg' : weekNumber === 2 ? '117-118 kg' : '116-117 kg'
    : weekNumber === 1 ? '68-68.5 kg' : weekNumber === 2 ? '67.5-68 kg' : '67-67.5 kg'
  const kpiCintura = isMathias
    ? weekNumber === 1 ? '104-105 cm' : weekNumber === 2 ? '103-104 cm' : '102-103 cm'
    : weekNumber === 1 ? '80-81 cm' : weekNumber === 2 ? '79-80 cm' : '78-79 cm'

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900 }}>

      {/* Header personalizado */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 4 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>
          Hola, {name} 👋
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(255,159,10,0.1)', fontSize: 11, fontWeight: 700, color: '#FF9F0A' }}>
            {profile?.biotype}
          </div>
          <div style={{ padding: '3px 10px', borderRadius: 6, background: '#F0EDE8', fontSize: 11, fontWeight: 600, color: '#6B6762' }}>
            Fase 1 · Mes 1
          </div>
          {isPaola && (
            <div style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(191,90,242,0.1)', fontSize: 11, fontWeight: 700, color: '#BF5AF2' }}>
              🤱 Lactancia activa
            </div>
          )}
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Calorías', value: totals.cal.toLocaleString(), meta: `de ${profile?.target_cal?.toLocaleString()} kcal`, icon: Flame, dark: true },
          { label: 'Proteína', value: totals.p + 'g', meta: `de ${profile?.prot}g objetivo`, icon: Target, accent: true },
          { label: 'Agua', value: `${water}/${waterGoal}`, meta: `${(water * 0.25).toFixed(1)}L hoy`, icon: Droplets },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          const bg = kpi.dark ? '#1A1916' : kpi.accent ? '#FF9F0A' : '#FFFFFF'
          const textColor = kpi.dark || kpi.accent ? '#FFFFFF' : '#1A1916'
          const subColor = kpi.dark || kpi.accent ? 'rgba(255,255,255,0.35)' : '#9A9690'
          return (
            <div key={i} style={{ background: bg, borderRadius: 18, padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: subColor, marginBottom: 8 }}>{kpi.label}</div>
                <Icon size={14} color={kpi.dark ? '#FF9F0A' : kpi.accent ? '#FFFFFF' : '#FF9F0A'} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1.5, color: textColor, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, marginTop: 5, color: subColor }}>{kpi.meta}</div>
            </div>
          )
        })}
      </div>

      {/* KPIs semanales del plan real */}
      <div style={{ background: '#1A1916', borderRadius: 16, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
            Meta Semana {weekNumber}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FF9F0A' }}>{kpiWeight}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>peso objetivo</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FF9F0A' }}>{kpiCintura}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>cintura objetivo</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FF9F0A' }}>{profile?.weight || '—'} kg</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>peso actual</div>
            </div>
          </div>
        </div>
        <div onClick={() => router.push('/dashboard/progreso')} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,159,10,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#FF9F0A' }}>
          Registrar →
        </div>
      </div>

      {/* WATER */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '14px 18px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 10 }}>
          Hidratación · {(water * 0.25).toFixed(2)}L de {(waterGoal * 0.25).toFixed(1)}L
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {Array.from({ length: waterGoal }, (_, i) => (
            <div key={i} onClick={() => tapWater(i)} style={{
              width: 28, height: 28, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
              background: i < water ? '#0A84FF' : '#F0EDE8',
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, marginBottom: 14 }}>
        {/* Workout */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 12 }}>Hoy</div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: workoutDone ? 'rgba(48,209,88,0.1)' : '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Dumbbell size={18} color={workoutDone ? '#30D158' : '#1A1916'} strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>{todayPlan.name}</div>
          <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 14 }}>
            {workoutDone ? '✓ Completado' : `${todayPlan.type} · ${todayPlan.dur} min`}
          </div>
          {!workoutDone && !todayPlan.rest && (
            <div onClick={() => router.push('/dashboard/entreno')} style={{ background: '#1A1916', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              Iniciar <ChevronRight size={13} color="#FF9F0A" />
            </div>
          )}
        </div>

        {/* Macros */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 12 }}>Macros de hoy</div>
          {[
            { label: 'Proteína', val: totals.p, target: profile?.prot || 155, color: '#FF453A' },
            { label: 'Carbos', val: totals.c, target: profile?.carbs || 230, color: '#0A84FF' },
            { label: 'Grasa', val: totals.f, target: profile?.fat || 57, color: '#FF9F0A' },
          ].map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1916' }}>{m.label}</span>
                <span style={{ fontSize: 11, color: '#9A9690' }}>{m.val}g / {m.target}g</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#F0EDE8', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(m.val / m.target * 100, 100)}%`, background: m.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
          <div onClick={() => router.push('/dashboard/nutricion')} style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#FF9F0A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Ver plan <ChevronRight size={12} />
          </div>
        </div>
      </div>

      {/* CHECKLIST DIARIO */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Checklist diario</div>
            <div style={{ fontSize: 12, color: '#B0ACA8', marginTop: 2 }}>Protocolo personal de {name}</div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: 20,
            background: checklistDone === checklistItems.length ? '#30D158' : checklistDone >= 7 ? '#FF9F0A' : '#F0EDE8',
            fontSize: 12, fontWeight: 800,
            color: checklistDone >= 7 ? '#FFFFFF' : '#6B6762',
          }}>
            {checklistDone}/{checklistItems.length}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checklistItems.map((item, i) => {
            const done = !!checklist[i]
            return (
              <div key={i} onClick={() => toggleChecklist(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: done ? 'rgba(255,159,10,0.06)' : '#F7F4F0',
                border: `1px solid ${done ? 'rgba(255,159,10,0.2)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#FF9F0A' : 'transparent',
                  border: done ? 'none' : '1.5px solid #D4D0CB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: done ? 600 : 500, color: done ? '#1A1916' : '#6B6762', textDecoration: done ? 'none' : 'none', flex: 1 }}>
                  {item}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROTOCOLO GRASAS OCULTAS — solo Mathias */}
      {isMathias && (
        <div style={{ marginBottom: 14 }}>
          <div onClick={() => setShowGrasas(!showGrasas)} style={{
            background: '#FFFFFF', borderRadius: 16, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,69,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={14} color="#FF453A" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>Protocolo grasas ocultas</div>
                <div style={{ fontSize: 11, color: '#9A9690' }}>Si no lo pesas, no lo comes</div>
              </div>
            </div>
            <ChevronRight size={16} color="#9A9690" style={{ transform: showGrasas ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {showGrasas && (
            <div style={{ background: '#FFFFFF', borderRadius: '0 0 16px 16px', padding: '16px 18px', boxShadow: '0 4px 12px rgba(0,0,0,0.07)', marginTop: -4 }}>
              <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 12, padding: '8px 12px', background: 'rgba(255,69,58,0.05)', borderRadius: 8, lineHeight: 1.5 }}>
                Las grasas ocultas no son un problema de disciplina — son un problema de invisibilidad. Lo que no se ve, no se cuenta. Lo que no se cuenta, rompe el déficit.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {GRASAS_OCULTAS.map((g, i) => (
                  <div key={i} style={{ background: '#F7F4F0', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>{g.name}</div>
                    <div style={{ fontSize: 10, color: '#9A9690', marginTop: 2 }}>{g.porcion} · {g.grasa} grasa</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#FF453A' }}>{g.kcal} kcal</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9F0A', background: 'rgba(255,159,10,0.1)', padding: '2px 6px', borderRadius: 4 }}>{g.pct}% cuota</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#1A1916', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#FF9F0A', marginBottom: 4 }}>Protocolo de 3 segundos</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  ¿Ya lo pesé y registré? → Si NO: no lo comes.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HÁBITOS SEMANALES */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px 22px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Hábitos semanales</div>
            <div style={{ fontSize: 11, color: '#B0ACA8', marginTop: 1 }}>Reset automático cada lunes</div>
          </div>
        </div>
        <HabitBar icon={Apple} label="Proteína completa" color="#FF453A" days={habitProtein} target={80} subtitle="80%+ de comidas completadas" />
        <HabitBar icon={Droplets} label="Hidratación" color="#0A84FF" days={habitWater} target={waterGoal} subtitle={`${waterGoal} vasos al día`} />
        <HabitBar icon={Dumbbell} label="Entreno completado" color="#30D158" days={habitWorkout} target={1} subtitle="Sesión registrada" />
        <HabitBar icon={Moon} label="Sueño reparador" color="#BF5AF2" days={habitSleep} target={1} subtitle="7+ horas registradas" />
      </div>

      {/* PESO + ACTIVIDAD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690' }}>Peso actual</div>
            <Weight size={14} color="#9A9690" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -2, color: '#1A1916', lineHeight: 1 }}>{profile?.weight || '—'}</div>
          <div style={{ fontSize: 11, color: '#9A9690', marginTop: 4, marginBottom: 14 }}>
            kg · objetivo <strong style={{ color: '#1A1916' }}>{profile?.goal_weight} kg</strong>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#F0EDE8', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${Math.max(goalPct, 2)}%`, borderRadius: 2, background: '#FF9F0A', transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: 10, color: '#9A9690' }}>{goalPct}% del camino</div>
        </div>

        <div style={{ background: '#E8E4DE', borderRadius: 18, padding: '18px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'absolute', right: 20, top: 10, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,159,10,0.4)', filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', right: 50, top: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,69,58,0.3)', filter: 'blur(18px)' }} />
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 4, position: 'relative', zIndex: 2 }}>Actividad hoy</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, position: 'relative', zIndex: 2 }}>
            {[
              { label: 'Consumidas', value: totals.cal > 0 ? totals.cal.toLocaleString() : '—' },
              { label: 'Quemadas', value: calsBurned > 0 ? calsBurned.toLocaleString() : '—' },
              { label: 'Balance', value: calsBurned > 0 ? (totals.cal - calsBurned).toLocaleString() : '—' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1916' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#9A9690', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}