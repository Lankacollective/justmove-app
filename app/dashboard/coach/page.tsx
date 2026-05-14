'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Save, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function CoachPanel() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [meals, setMeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isCoach, setIsCoach] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (prof?.role !== 'coach') { router.push('/dashboard'); return }
      setIsCoach(true)

      const { data: allProfs } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'coach')
        .order('name')

      if (allProfs?.length) {
        setProfiles(allProfs)
        setSelectedUser(allProfs[0])
        await loadMealPlan(allProfs[0].id)
      }
      setLoading(false)
    })
  }, [])

  async function loadMealPlan(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('meal_plans')
      .select('meals')
      .eq('user_id', userId)
      .single()
    if (data?.meals) setMeals(JSON.parse(JSON.stringify(data.meals)))
    else setMeals([])
  }

  async function switchUser(prof: any) {
    setSelectedUser(prof)
    setMeals([])
    setExpandedMeal(null)
    await loadMealPlan(prof.id)
  }

  async function savePlan() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('meal_plans')
      .upsert(
        { user_id: selectedUser.id, meals, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function updateItem(mealIdx: number, itemIdx: number, field: string, value: any) {
    const updated = JSON.parse(JSON.stringify(meals))
    updated[mealIdx].items[itemIdx][field] = field === 'name' || field === 'g' ? value : +value
    setMeals(updated)
  }

  function addItem(mealIdx: number) {
    const updated = JSON.parse(JSON.stringify(meals))
    updated[mealIdx].items.push({ name: 'Nuevo alimento', cal: 0, p: 0, c: 0, f: 0, g: '100g' })
    setMeals(updated)
  }

  function deleteItem(mealIdx: number, itemIdx: number) {
    const updated = JSON.parse(JSON.stringify(meals))
    updated[mealIdx].items.splice(itemIdx, 1)
    setMeals(updated)
  }

  function addMeal() {
    const updated = JSON.parse(JSON.stringify(meals))
    updated.push({
      id: 'm' + Date.now(),
      name: 'Nueva comida',
      time: '12:00',
      items: [{ name: 'Alimento', cal: 0, p: 0, c: 0, f: 0, g: '100g' }]
    })
    setMeals(updated)
  }

  function deleteMeal(mealIdx: number) {
    if (!confirm('¿Eliminar esta comida?')) return
    const updated = JSON.parse(JSON.stringify(meals))
    updated.splice(mealIdx, 1)
    setMeals(updated)
  }

  function updateMealField(mealIdx: number, field: string, value: string) {
    const updated = JSON.parse(JSON.stringify(meals))
    updated[mealIdx][field] = value
    setMeals(updated)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#9A9690', fontSize: 14 }}>
      Cargando...
    </div>
  )

  if (!isCoach) return null

  return (
    <div style={{ padding: '32px 28px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: '#9A9690', marginBottom: 4, fontWeight: 500 }}>Panel Coach</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1916', letterSpacing: -0.8 }}>
          Editor de planes
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 2 }}>
          Edita el plan nutricional de cada usuario
        </div>
      </div>

      {/* User selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {profiles.map(prof => (
          <div
            key={prof.id}
            onClick={() => switchUser(prof)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 14, cursor: 'pointer',
              background: selectedUser?.id === prof.id ? '#1A1916' : '#FFFFFF',
              border: `1.5px solid ${selectedUser?.id === prof.id ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: prof.color || '#FF9F0A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
            }}>
              {prof.name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedUser?.id === prof.id ? '#FFFFFF' : '#1A1916' }}>
                {prof.name}
              </div>
              <div style={{ fontSize: 10, color: selectedUser?.id === prof.id ? 'rgba(255,255,255,0.4)' : '#9A9690' }}>
                {prof.target_cal?.toLocaleString()} kcal · P{prof.prot}g
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <>
          {/* Stats bar */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '16px 20px',
            marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' as const,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {[
              { label: 'Target', val: selectedUser.target_cal?.toLocaleString() + ' kcal' },
              { label: 'Proteína', val: selectedUser.prot + 'g' },
              { label: 'Carbos', val: selectedUser.carbs + 'g' },
              { label: 'Grasa', val: selectedUser.fat + 'g' },
              { label: 'Sexo', val: selectedUser.sex === 'F' ? 'Femenino' : 'Masculino' },
              { label: 'Nivel', val: selectedUser.level },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 3 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Meals */}
          {meals.map((meal, mealIdx) => {
            const isOpen = expandedMeal === meal.id
            const mealTotal = meal.items.reduce((a: number, i: any) => a + (i.cal || 0), 0)
            return (
              <div key={meal.id} style={{
                background: '#FFFFFF', borderRadius: 18, marginBottom: 12,
                overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
                {/* Meal header */}
                <div
                  onClick={() => setExpandedMeal(isOpen ? null : meal.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 18px', cursor: 'pointer',
                    background: isOpen ? 'rgba(255,159,10,0.04)' : '#FAFAF8',
                    borderBottom: isOpen ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <input
                      value={meal.name}
                      onChange={e => updateMealField(mealIdx, 'name', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontSize: 15, fontWeight: 700, color: '#1A1916',
                        background: 'transparent', border: 'none', outline: 'none',
                        cursor: 'text', width: '100%',
                        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                      }}
                    />
                  </div>
                  <input
                    value={meal.time}
                    onChange={e => updateMealField(mealIdx, 'time', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 12, color: '#9A9690', background: 'transparent',
                      border: 'none', outline: 'none', width: 48,
                      textAlign: 'center' as const,
                      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FF9F0A', minWidth: 70, textAlign: 'right' as const }}>
                    {mealTotal} kcal
                  </div>
                  <div
                    onClick={e => { e.stopPropagation(); deleteMeal(mealIdx) }}
                    style={{ padding: 4, cursor: 'pointer', opacity: 0.3 }}
                  >
                    <X size={14} color="#FF453A" />
                  </div>
                  {isOpen
                    ? <ChevronUp size={16} color="#9A9690" />
                    : <ChevronDown size={16} color="#9A9690" />
                  }
                </div>

                {/* Items */}
                {isOpen && (
                  <div style={{ padding: '8px 0' }}>
                    {/* Column headers */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 50px 50px 50px 50px 32px',
                      gap: 6, padding: '4px 18px 8px',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      {['Alimento', 'Cantidad', 'kcal', 'P', 'C', 'G', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#B0ACA8' }}>
                          {h}
                        </div>
                      ))}
                    </div>

                    {meal.items.map((item: any, itemIdx: number) => (
                      <div key={itemIdx} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px 50px 50px 50px 50px 32px',
                        gap: 6, padding: '8px 18px',
                        borderBottom: itemIdx < meal.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        alignItems: 'center',
                      }}>
                        <input
                          value={item.name}
                          onChange={e => updateItem(mealIdx, itemIdx, 'name', e.target.value)}
                          style={{
                            fontSize: 13, color: '#1A1916', background: '#F5F2EE',
                            border: 'none', borderRadius: 7, padding: '6px 10px',
                            outline: 'none', width: '100%',
                            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                          }}
                        />
                        <input
                          value={item.g}
                          onChange={e => updateItem(mealIdx, itemIdx, 'g', e.target.value)}
                          style={{
                            fontSize: 12, color: '#6B6762', background: '#F5F2EE',
                            border: 'none', borderRadius: 7, padding: '6px 8px',
                            outline: 'none', width: '100%', textAlign: 'center' as const,
                            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                          }}
                        />
                        {['cal', 'p', 'c', 'f'].map(field => (
                          <input
                            key={field}
                            type="number"
                            value={item[field]}
                            onChange={e => updateItem(mealIdx, itemIdx, field, e.target.value)}
                            style={{
                              fontSize: 12, color: '#1A1916', background: '#F5F2EE',
                              border: 'none', borderRadius: 7, padding: '6px 4px',
                              outline: 'none', width: '100%', textAlign: 'center' as const,
                              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                            }}
                          />
                        ))}
                        <div
                          onClick={() => deleteItem(mealIdx, itemIdx)}
                          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', opacity: 0.3 }}
                        >
                          <X size={14} color="#FF453A" />
                        </div>
                      </div>
                    ))}

                    {/* Add item */}
                    <div
                      onClick={() => addItem(mealIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 18px', cursor: 'pointer',
                        color: '#0A84FF', fontSize: 12, fontWeight: 600,
                      }}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      Agregar alimento
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add meal */}
          <div
            onClick={addMeal}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: 14, cursor: 'pointer',
              border: '1.5px dashed rgba(0,0,0,0.15)',
              fontSize: 13, fontWeight: 600, color: '#9A9690',
              marginBottom: 20, transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#FF9F0A'
              ;(e.currentTarget as HTMLElement).style.color = '#FF9F0A'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.15)'
              ;(e.currentTarget as HTMLElement).style.color = '#9A9690'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Agregar comida
          </div>

          {/* Save */}
          <div
            onClick={savePlan}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px', borderRadius: 14, cursor: 'pointer',
              background: saved ? '#30D158' : '#1A1916',
              fontSize: 14, fontWeight: 700, color: '#FFFFFF',
              transition: 'all 0.3s', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={16} strokeWidth={2.5} />
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : `Guardar plan de ${selectedUser.name?.split(' ')[0]}`}
          </div>
        </>
      )}
    </div>
  )
}