'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

export default function Config() {
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
    })
  }, [])

  function update(field: string, value: any) {
    setProfile((p: any) => ({ ...p, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      name: profile.name,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      goal_weight: profile.goal_weight,
      body_fat: profile.body_fat,
      goal_date: profile.goal_date,
      sleep_hours: profile.sleep_hours,
      cycle_day: profile.cycle_day,
      injuries: profile.injuries,
      level: profile.level,
    }).eq('id', userId)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>
      Cargando...
    </div>
  )

  const Field = ({ label, field, type = 'text', step }: any) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        step={step}
        value={profile[field] ?? ''}
        onChange={e => update(field, type === 'number' ? +e.target.value : e.target.value)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 10,
          border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14, fontWeight: 500,
          outline: 'none', background: '#F5F2EE', color: '#1A1916',
          fontFamily: '-apple-system, sans-serif',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#FF9F0A'}
        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
      />
    </div>
  )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 600 }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Configuración</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>Mi perfil</div>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: profile.color || '#FF9F0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#FFFFFF',
        }}>
          {profile.name?.[0]}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1916' }}>{profile.name}</div>
          <div style={{ fontSize: 12, color: '#9A9690', marginTop: 2 }}>
            {profile.target_cal?.toLocaleString()} kcal · P{profile.prot}g C{profile.carbs}g G{profile.fat}g
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>
          Datos personales
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}><Field label="Nombre completo" field="name" /></div>
          <Field label="Edad" field="age" type="number" />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 6 }}>Sexo</div>
            <select
              value={profile.sex || 'F'}
              onChange={e => update('sex', e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14,
                outline: 'none', background: '#F5F2EE', color: '#1A1916',
                fontFamily: '-apple-system, sans-serif',
              }}
            >
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <Field label="Altura (m)" field="height" type="number" step="0.01" />
         <div>
  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 6 }}>Nivel</div>
  <select
    value={profile.level || 'Intermedio'}
    onChange={e => update('level', e.target.value)}
    style={{
      width: '100%', padding: '11px 14px', borderRadius: 10,
      border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14,
      outline: 'none', background: '#F5F2EE', color: '#1A1916',
      fontFamily: '-apple-system, sans-serif',
    }}
  >
    <option value="Principiante">Principiante</option>
    <option value="Intermedio">Intermedio</option>
    <option value="Avanzado">Avanzado</option>
  </select>
</div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>
          Métricas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Peso actual (kg)" field="weight" type="number" step="0.1" />
          <Field label="Peso objetivo (kg)" field="goal_weight" type="number" step="0.1" />
          <Field label="% Grasa corporal" field="body_fat" type="number" step="0.1" />
          <Field label="Fecha objetivo" field="goal_date" type="date" />
        </div>
      </div>

      {/* Bienestar */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#9A9690', marginBottom: 16 }}>
          Bienestar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Horas de sueño" field="sleep_hours" type="number" step="0.5" />
          {profile.sex === 'F' && (
            <Field label="Día del ciclo" field="cycle_day" type="number" />
          )}
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Lesiones / limitaciones" field="injuries" />
          </div>
        </div>
      </div>

      {/* Macros — readonly */}
      <div style={{ background: '#1A1916', borderRadius: 18, padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
          Macros calculados por el coach
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Calorías', val: profile.target_cal?.toLocaleString() + ' kcal' },
            { label: 'Proteína', val: profile.prot + 'g' },
            { label: 'Carbos', val: profile.carbs + 'g' },
            { label: 'Grasa', val: profile.fat + 'g' },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.3, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FF9F0A' }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div onClick={save} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '15px', borderRadius: 14, cursor: 'pointer',
        background: saved ? '#30D158' : '#1A1916',
        fontSize: 14, fontWeight: 700, color: '#FFFFFF',
        transition: 'all 0.3s', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        opacity: saving ? 0.7 : 1,
      }}>
        <Save size={16} />
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </div>
    </div>
  )
}