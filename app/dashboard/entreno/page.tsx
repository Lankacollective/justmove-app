'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Play, Pause, RotateCcw, Check, Plus, ChevronRight } from 'lucide-react'
import { today, getRealDayIndex } from '@/lib/store'

const WEEK_PLAN = [
  { day: 'Lun', name: 'Espalda + Bíceps', type: 'Fuerza', gym: true, dur: 60 },
  { day: 'Mar', name: 'Indoor Cycling', type: 'Cardio', gym: false, dur: 45 },
  { day: 'Mié', name: 'Piernas + Glúteos', type: 'Fuerza', gym: true, dur: 70 },
  { day: 'Jue', name: 'Indoor Cycling', type: 'Cardio', gym: false, dur: 45 },
  { day: 'Vie', name: 'Pecho + Hombros', type: 'Fuerza', gym: true, dur: 60 },
  { day: 'Sáb', name: 'LISS + Core', type: 'Cardio', gym: false, dur: 50 },
  { day: 'Dom', name: 'Descanso activo', type: 'Descanso', gym: false, dur: 0, rest: true },
]

const EXERCISES: Record<string, any[]> = {
  'Espalda + Bíceps': [
    { name: 'Jalón al pecho agarre ancho', sets: 4, reps: '10-12', weight: 30 },
    { name: 'Remo con mancuerna unilateral', sets: 3, reps: '12-15', weight: 10 },
    { name: 'Remo en polea sentada', sets: 3, reps: '12-15', weight: 25 },
    { name: 'Curl de bíceps mancuerna', sets: 3, reps: '12-15', weight: 8 },
  ],
  'Piernas + Glúteos': [
    { name: 'Sentadilla libre o goblet', sets: 4, reps: '10-12', weight: 30 },
    { name: 'Hip Thrust', sets: 4, reps: '12-15', weight: 40 },
    { name: 'Peso muerto rumano', sets: 3, reps: '12-15', weight: 30 },
    { name: 'Abducción en máquina', sets: 3, reps: '15-20', weight: 30 },
  ],
  'Pecho + Hombros': [
    { name: 'Press de pecho mancuernas', sets: 4, reps: '10-12', weight: 10 },
    { name: 'Press hombro mancuerna', sets: 4, reps: '10-12', weight: 8 },
    { name: 'Elevaciones laterales', sets: 4, reps: '15-20', weight: 5 },
    { name: 'Face pull polea', sets: 3, reps: '15-20', weight: 15 },
  ],
}

const ACTIVITY_TYPES = [
  { name: 'Running', icon: '🏃', calsPerMin: 10 },
  { name: 'Indoor Cycling', icon: '🚴', calsPerMin: 9 },
  { name: 'Yoga', icon: '🧘', calsPerMin: 4 },
  { name: 'Pádel', icon: '🎾', calsPerMin: 8 },
  { name: 'Natación', icon: '🏊', calsPerMin: 11 },
  { name: 'Funcional', icon: '⚡', calsPerMin: 8 },
  { name: 'Caminata', icon: '🚶', calsPerMin: 5 },
  { name: 'Otro', icon: '🏅', calsPerMin: 7 },
]

export default function Entreno() {
  const [profile, setProfile] = useState<any>(null)
  const [curDay, setCurDay] = useState(0)
  const [exStates, setExStates] = useState<any[]>([])
  const [timer, setTimer] = useState(120)
  const [timerOn, setTimerOn] = useState(false)
  const [timerMax, setTimerMax] = useState(120)
  const [finished, setFinished] = useState(false)
  const [userId, setUserId] = useState('')
  const [showFreeActivity, setShowFreeActivity] = useState(false)
  const [freeActivity, setFreeActivity] = useState({ type: 'Running', duration: 30, distance: 0, notes: '' })
  const [savedActivity, setSavedActivity] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const timerRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      const realDay = getRealDayIndex()
      setCurDay(realDay)
      initExercises(realDay)

      const { data: wlog } = await supabase
        .from('workout_logs').select('*')
        .eq('user_id', data.user.id).eq('date', today()).single()
      if (wlog) {
        setFinished(true)
        if (wlog.name && !EXERCISES[wlog.name]) setSavedActivity(wlog)
      }

      const { data: hist } = await supabase
        .from('workout_logs').select('*')
        .eq('user_id', data.user.id)
        .order('date', { ascending: false })
        .limit(20)
      setHistorial(hist || [])
    })
  }, [])

  function initExercises(dayIdx: number) {
    const day = WEEK_PLAN[dayIdx]
    const exs = EXERCISES[day.name] || []
    setExStates(exs.map(ex => ({
      ...ex,
      sets: Array(ex.sets).fill(null).map(() => ({ done: false, skip: false, weight: ex.weight }))
    })))
    setFinished(false)
    setSavedActivity(null)
  }

  function selectDay(i: number) { setCurDay(i); initExercises(i); stopTimer() }

  function tapSet(exIdx: number, setIdx: number) {
    setExStates(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const s = updated[exIdx].sets[setIdx]
      if (!s.done && !s.skip) { s.done = true; startTimer() }
      else if (s.done) { s.done = false; s.skip = true }
      else { s.skip = false }
      return updated
    })
  }

  function updateWeight(exIdx: number, val: number) {
    setExStates(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      updated[exIdx].weight = val
      updated[exIdx].sets.forEach((s: any) => s.weight = val)
      return updated
    })
  }

  function startTimer() {
    stopTimer()
    setTimerOn(true)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { stopTimer(); return 0 } return t - 1 })
    }, 1000)
  }

  function stopTimer() { clearInterval(timerRef.current); setTimerOn(false) }
  function resetTimer() { stopTimer(); setTimer(timerMax) }
  function setTimerPreset(s: number) { setTimerMax(s); setTimer(s); stopTimer() }

  async function finishWorkout() {
    const vol = exStates.reduce((a, ex) =>
      a + ex.sets.filter((s: any) => s.done).reduce((b: number, s: any) => b + s.weight * parseInt(ex.reps), 0), 0)
    const done = exStates.reduce((a, ex) => a + ex.sets.filter((s: any) => s.done).length, 0)
    const total = exStates.reduce((a, ex) => a + ex.sets.length, 0)
    const cals = Math.round(vol * 0.05 + done * 8)
    const supabase = createClient()
    const row = {
      user_id: userId, date: today(),
      name: WEEK_PLAN[curDay].name,
      volume: vol, sets_done: done, sets_total: total, rpe: 7,
      calories_burned: cals,
    }
    await supabase.from('workout_logs').upsert(row, { onConflict: 'user_id,date' })
    setHistorial(prev => [row, ...prev.filter(h => h.date !== today())])
    stopTimer()
    setFinished(true)
    router.refresh()
  }

  async function saveFreeActivity() {
    const act = ACTIVITY_TYPES.find(a => a.name === freeActivity.type)
    const cals = Math.round((act?.calsPerMin || 7) * freeActivity.duration)
    const supabase = createClient()
    const row = {
      user_id: userId, date: today(),
      name: freeActivity.type,
      volume: 0, sets_done: 0, sets_total: 0, rpe: 7,
      calories_burned: cals,
      completed_sets: { duration: freeActivity.duration, distance: freeActivity.distance, notes: freeActivity.notes },
    }
    await supabase.from('workout_logs').upsert(row, { onConflict: 'user_id,date' })
    setHistorial(prev => [row, ...prev.filter(h => h.date !== today())])
    setSavedActivity({ name: freeActivity.type, calories_burned: cals, duration: freeActivity.duration })
    setShowFreeActivity(false)
    setFinished(true)
    router.refresh()
  }

  const day = WEEK_PLAN[curDay]
  const m = Math.floor(timer / 60), s = timer % 60
  const timerPct = (timer / timerMax) * 100
  const realDayIdx = getRealDayIndex()

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>Cargando...</div>
  )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800 }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Entrenamiento</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>Sesión de hoy</div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Week pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' as const, paddingBottom: 4 }}>
        {WEEK_PLAN.map((d, i) => {
          const isToday = i === realDayIdx
          const isSelected = i === curDay
          return (
            <div key={i} onClick={() => selectDay(i)} style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              background: isSelected ? '#1A1916' : isToday ? '#FFF3E0' : '#FFFFFF',
              border: `1.5px solid ${isSelected ? 'transparent' : isToday ? '#FF9F0A' : 'rgba(0,0,0,0.08)'}`,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, color: isSelected ? 'rgba(255,255,255,0.5)' : isToday ? '#FF9F0A' : '#9A9690', letterSpacing: 0.4 }}>
                {d.day}{isToday ? ' · HOY' : ''}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#FFFFFF' : '#1A1916', marginTop: 2 }}>
                {new Date(new Date().setDate(new Date().getDate() - realDayIdx + i)).getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actividad libre */}
      {!finished && (
        <div onClick={() => setShowFreeActivity(!showFreeActivity)} style={{
          background: showFreeActivity ? '#1A1916' : '#FFFFFF',
          borderRadius: 14, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1.5px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plus size={16} color={showFreeActivity ? '#FF9F0A' : '#1A1916'} strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 600, color: showFreeActivity ? '#FFFFFF' : '#1A1916' }}>Registrar otra actividad</span>
          </div>
          <span style={{ fontSize: 11, color: showFreeActivity ? 'rgba(255,255,255,0.4)' : '#9A9690' }}>yoga, running, pádel...</span>
        </div>
      )}

      {/* Free activity form */}
      {showFreeActivity && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 14 }}>¿Qué hiciste hoy?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
            {ACTIVITY_TYPES.map((a, i) => (
              <div key={i} onClick={() => setFreeActivity(f => ({ ...f, type: a.name }))} style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: freeActivity.type === a.name ? '#1A1916' : '#F5F2EE',
                border: `1.5px solid ${freeActivity.type === a.name ? 'transparent' : 'rgba(0,0,0,0.06)'}`,
                fontSize: 12, fontWeight: 600,
                color: freeActivity.type === a.name ? '#FFFFFF' : '#1A1916',
              }}>
                {a.icon} {a.name}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Duración (min)', key: 'duration', step: 1 },
              { label: 'Distancia (km)', key: 'distance', step: 0.1 },
            ].map(({ label, key, step }) => (
              <div key={key}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                <input type="number" step={step} value={(freeActivity as any)[key]}
                  onChange={e => setFreeActivity(f => ({ ...f, [key]: +e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 15, fontWeight: 700, outline: 'none', background: '#F5F2EE', color: '#1A1916', fontFamily: '-apple-system, sans-serif' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9A9690', textTransform: 'uppercase' as const, letterSpacing: 0.4, marginBottom: 6 }}>Notas (opcional)</div>
            <input value={freeActivity.notes} onChange={e => setFreeActivity(f => ({ ...f, notes: e.target.value }))}
              placeholder="ej. buena sesión, sentí energía..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13, outline: 'none', background: '#F5F2EE', color: '#1A1916', fontFamily: '-apple-system, sans-serif' }}
            />
          </div>
          <div style={{ background: '#F5F2EE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6B6762' }}>Calorías estimadas:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#FF9F0A' }}>
              ~{Math.round((ACTIVITY_TYPES.find(a => a.name === freeActivity.type)?.calsPerMin || 7) * freeActivity.duration)} kcal
            </span>
          </div>
          <div onClick={saveFreeActivity} style={{ padding: '13px', borderRadius: 12, cursor: 'pointer', background: '#FF9F0A', fontSize: 13, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' as const }}>
            ✓ Guardar actividad
          </div>
        </div>
      )}

      {/* Saved free activity */}
      {savedActivity && !EXERCISES[savedActivity.name] && (
        <div style={{ background: 'rgba(48,209,88,0.08)', border: '1.5px solid rgba(48,209,88,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#30D158', marginBottom: 4 }}>✓ {savedActivity.name} registrado</div>
          <div style={{ fontSize: 12, color: '#6B6762' }}>{savedActivity.duration || freeActivity.duration} min · ~{savedActivity.calories_burned} kcal quemadas</div>
        </div>
      )}

      {/* Session card */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#FF9F0A', marginBottom: 4 }}>{day.type}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1916' }}>{day.name}</div>
            <div style={{ fontSize: 12, color: '#9A9690', marginTop: 2 }}>{day.rest ? 'Descanso' : `~${day.dur} min`}</div>
          </div>
          {finished && <div style={{ background: '#30D158', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>✓ Completado</div>}
        </div>

        {/* Timer */}
        {!day.rest && !finished && (
          <div style={{ background: '#F5F2EE', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', textAlign: 'center' as const, marginBottom: 10 }}>Descanso entre series</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
                  <circle cx="40" cy="40" r="34" fill="none"
                    stroke={timer <= 10 ? '#FF453A' : '#FF9F0A'} strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: timer <= 10 ? '#FF453A' : '#1A1916', letterSpacing: -1 }}>
                    {m}:{s < 10 ? '0' + s : s}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
              {[60, 90, 120, 180].map(sec => (
                <div key={sec} onClick={() => setTimerPreset(sec)} style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: timerMax === sec ? '#1A1916' : '#FFFFFF',
                  color: timerMax === sec ? '#FFFFFF' : '#6B6762',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}>
                  {sec < 60 ? sec + 's' : sec / 60 + 'min'}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <div onClick={timerOn ? stopTimer : startTimer} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, cursor: 'pointer', background: '#1A1916', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>
                {timerOn ? <Pause size={14} /> : <Play size={14} />}
                {timerOn ? 'Pausar' : 'Iniciar'}
              </div>
              <div onClick={resetTimer} style={{ padding: '9px 14px', borderRadius: 10, cursor: 'pointer', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
                <RotateCcw size={14} color="#6B6762" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exercises */}
      {!day.rest && day.gym && !finished && exStates.map((ex, exIdx) => {
        const allDone = ex.sets.every((s: any) => s.done)
        return (
          <div key={exIdx} style={{
            background: '#FFFFFF', borderRadius: 18, padding: '18px 20px', marginBottom: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            border: `1.5px solid ${allDone ? '#FF9F0A' : 'transparent'}`,
            transition: 'border-color 0.3s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916' }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: '#9A9690', marginTop: 2 }}>{ex.sets.length} series · {ex.reps} reps</div>
              </div>
              {allDone && <div style={{ fontSize: 11, fontWeight: 700, color: '#FF9F0A' }}>✓ Listo</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              {ex.sets.map((set: any, setIdx: number) => (
                <div key={setIdx} onClick={() => tapSet(exIdx, setIdx)} style={{
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: set.done ? '#FF9F0A' : set.skip ? 'rgba(255,69,58,0.1)' : '#F5F2EE',
                  border: `1px solid ${set.done ? 'transparent' : set.skip ? 'rgba(255,69,58,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  transition: 'all 0.15s', textAlign: 'center' as const, minWidth: 56,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: set.done ? '#FFFFFF' : '#9A9690' }}>S{setIdx + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: set.done ? '#FFFFFF' : '#1A1916', marginTop: 2 }}>
                    {set.weight}×{ex.reps.split('-')[0]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9A9690' }}>Peso:</span>
              <input type="number" step="2.5" value={ex.weight}
                onChange={e => updateWeight(exIdx, +e.target.value)}
                style={{ width: 70, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(0,0,0,0.08)', outline: 'none', background: '#F5F2EE', fontFamily: '-apple-system, sans-serif', color: '#1A1916' }}
              />
              <span style={{ fontSize: 12, color: '#9A9690' }}>kg</span>
              {allDone && (
                <span style={{ fontSize: 11, color: '#9A9690', marginLeft: 4 }}>
                  → próx: <strong style={{ color: '#FF9F0A' }}>{+(ex.weight + 2.5).toFixed(1)} kg</strong>
                </span>
              )}
            </div>
          </div>
        )
      })}

      {/* Cardio */}
      {!day.rest && !day.gym && !finished && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' as const }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚴</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>{day.name}</div>
          <div style={{ fontSize: 13, color: '#9A9690' }}>Cardio · Zona 2-3 · 65-75% FC máx · {day.dur} min</div>
          <div onClick={finishWorkout} style={{ marginTop: 16, padding: '12px', borderRadius: 12, cursor: 'pointer', background: '#1A1916', color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
            ✓ Completar cardio
          </div>
        </div>
      )}

      {/* Rest */}
      {day.rest && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' as const }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Descanso activo</div>
          <div style={{ fontSize: 13, color: '#9A9690' }}>Movilidad · stretching · caminata tranquila</div>
        </div>
      )}

      {/* Finish button */}
      {!day.rest && !finished && day.gym && (
        <div onClick={finishWorkout} style={{
          marginTop: 16, padding: '15px', borderRadius: 14, cursor: 'pointer',
          background: '#1A1916', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          <Check size={16} />
          Terminar sesión
        </div>
      )}

      {finished && EXERCISES[WEEK_PLAN[curDay].name] && (
        <div style={{ marginTop: 16, background: 'rgba(48,209,88,0.08)', border: '1.5px solid rgba(48,209,88,0.2)', borderRadius: 14, padding: '16px 20px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#30D158', marginBottom: 4 }}>🎉 ¡Sesión completada!</div>
          <div style={{ fontSize: 12, color: '#6B6762' }}>
            {exStates.filter(ex => ex.sets.every((s: any) => s.done)).map(ex =>
              `📈 ${ex.name}: ${+(ex.weight + 2.5).toFixed(1)}kg próx`
            ).join(' · ')}
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      <div style={{ marginTop: 24 }}>
        <div onClick={() => setShowHistorial(!showHistorial)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
          background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={14} color="#FF9F0A" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>Historial de entrenos</div>
              <div style={{ fontSize: 11, color: '#9A9690' }}>{historial.length} sesiones registradas</div>
            </div>
          </div>
          <ChevronRight size={16} color="#9A9690"
            style={{ transform: showHistorial ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {showHistorial && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9A9690', fontSize: 13, background: '#FFFFFF', borderRadius: 14 }}>
                No hay sesiones registradas aún
              </div>
            ) : historial.map((w, i) => {
              const isToday = w.date === today()
              const isGym = !!EXERCISES[w.name]
              return (
                <div key={i} style={{
                  background: '#FFFFFF', borderRadius: 14, padding: '14px 18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: isToday ? '1.5px solid #FF9F0A' : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isGym ? 'rgba(255,159,10,0.1)' : 'rgba(10,132,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {isGym ? '🏋️' : '🏃'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916' }}>
                        {w.name}
                        {isToday && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#FF9F0A', background: 'rgba(255,159,10,0.1)', padding: '2px 6px', borderRadius: 4 }}>HOY</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#9A9690', marginTop: 2 }}>
                        {w.date} · {w.calories_burned ? w.calories_burned + ' kcal' : '—'}
                        {w.sets_done && w.sets_total ? ` · ${w.sets_done}/${w.sets_total} series` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    {w.volume > 0 && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1916' }}>
                        {w.volume.toLocaleString()}
                        <span style={{ fontSize: 9, fontWeight: 500, color: '#9A9690', marginLeft: 2 }}>kg vol</span>
                      </div>
                    )}
                    {w.rpe && <div style={{ fontSize: 10, color: '#9A9690', marginTop: 2 }}>RPE {w.rpe}/10</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}