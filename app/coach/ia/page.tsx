'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Sparkles, Zap, Utensils, Dumbbell, TrendingUp,
  CheckCircle, RefreshCw, Save, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react'

type AIModule = 'macros' | 'meal_plan' | 'train_plan' | 'adjustments'

const MODULES: { id: AIModule; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'macros',      label: 'Recalcular macros',       desc: 'Calcula TDEE y distribución de macros según objetivo y biotype',  icon: Zap,        color: '#FF9F0A' },
  { id: 'meal_plan',   label: 'Generar plan de comidas',  desc: 'Plan semanal con comidas, porciones y recetas adaptadas',         icon: Utensils,   color: '#0A84FF' },
  { id: 'train_plan',  label: 'Generar plan de entreno',  desc: 'Rutina semanal progresiva según nivel, objetivo y equipo',        icon: Dumbbell,   color: '#30D158' },
  { id: 'adjustments', label: 'Sugerir ajustes',          desc: 'Analiza el progreso reciente y propone cambios al plan actual',   icon: TrendingUp, color: '#BF5AF2' },
]

export default function CoachIA() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [activeModule, setActiveModule] = useState<AIModule>('macros')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string>('')
  const [parsed, setParsed] = useState<any>(null)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [expandedInfo, setExpandedInfo] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').neq('role', 'coach').order('name')
      .then(async ({ data: profs }) => {
        if (profs?.length) {
          setProfiles(profs)
          setSelectedUser(profs[0])
        }
        setLoading(false)
      })
  }, [])

  // Reset result when module or user changes
  useEffect(() => {
    setResult('')
    setParsed(null)
    setApproved(false)
  }, [activeModule, selectedUser?.id])

  async function generate() {
    if (!selectedUser) return
    setGenerating(true)
    setResult('')
    setParsed(null)
    setApproved(false)

    try {
      const res = await fetch('/api/coach/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: activeModule,
          user: selectedUser,
          extraContext,
        }),
      })
      const data = await res.json()
      setResult(data.result || data.error || 'Sin respuesta')

      // Try to parse JSON if present
      try {
        const jsonMatch = data.result.match(/```json\n?([\s\S]*?)\n?```/)
        if (jsonMatch) setParsed(JSON.parse(jsonMatch[1]))
      } catch {}
    } catch (e) {
      setResult('Error al conectar con la IA. Verifica tu API key.')
    }
    setGenerating(false)
  }

  async function approve() {
    if (!parsed || !selectedUser) return
    setApproving(true)
    const supabase = createClient()

    try {
      if (activeModule === 'macros' && parsed.target_cal) {
        await supabase.from('profiles').update({
          target_cal: parsed.target_cal,
          prot: parsed.prot,
          carbs: parsed.carbs,
          fat: parsed.fat,
        }).eq('id', selectedUser.id)
        // Update local state
        setSelectedUser((u: any) => ({ ...u, ...parsed }))
        setProfiles(ps => ps.map(p => p.id === selectedUser.id ? { ...p, ...parsed } : p))
      }

      if (activeModule === 'meal_plan' && parsed.meals) {
        await supabase.from('meal_plans').upsert(
          { user_id: selectedUser.id, meals: parsed.meals, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
      }

      if (activeModule === 'train_plan' && parsed.plan) {
        await supabase.from('train_plans').upsert(
          { user_id: selectedUser.id, plan: parsed.plan, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
      }

      setApproved(true)
    } catch (e) {
      console.error(e)
    }
    setApproving(false)
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ color: '#9A9690', fontSize: 13 }}>Cargando...</div>

  const activeModuleData = MODULES.find(m => m.id === activeModule)!

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 6 }}>
          Panel Coach
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Sparkles size={22} color="#FF9F0A" strokeWidth={2.5} />
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>
            IA Coach
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#6B6762' }}>
          Genera planes y recalcula macros con IA. Revisa y aprueba antes de guardar.
        </div>
      </div>

      {/* User selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {profiles.map(prof => (
          <div key={prof.id} onClick={() => setSelectedUser(prof)} style={{
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
            }}>
              {prof.name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedUser?.id === prof.id ? '#FFFFFF' : '#1A1916' }}>
                {prof.name}
              </div>
              <div style={{ fontSize: 10, color: selectedUser?.id === prof.id ? 'rgba(255,255,255,0.4)' : '#9A9690' }}>
                {prof.objetivo || 'sin objetivo'} · {prof.biotype}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <>
          {/* User context card (collapsible) */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <div onClick={() => setExpandedInfo(!expandedInfo)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', cursor: 'pointer',
              background: expandedInfo ? 'rgba(255,159,10,0.04)' : '#FAFAF8',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>
                Contexto de {selectedUser.name?.split(' ')[0]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#9A9690' }}>
                  {selectedUser.target_cal} kcal · {selectedUser.prot}P / {selectedUser.carbs}C / {selectedUser.fat}G
                </div>
                {expandedInfo ? <ChevronUp size={14} color="#9A9690" /> : <ChevronDown size={14} color="#9A9690" />}
              </div>
            </div>
            {expandedInfo && (
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['Nombre', selectedUser.name],
                  ['Objetivo', selectedUser.objetivo],
                  ['Biotype', selectedUser.biotype],
                  ['Nivel', selectedUser.level],
                  ['Sexo', selectedUser.sex === 'F' ? 'Femenino' : 'Masculino'],
                  ['Peso actual', selectedUser.current_weight ? selectedUser.current_weight + ' kg' : '—'],
                  ['Peso objetivo', selectedUser.target_weight ? selectedUser.target_weight + ' kg' : '—'],
                  ['Calorías target', selectedUser.target_cal?.toLocaleString() + ' kcal'],
                  ['Macros', `P${selectedUser.prot}g C${selectedUser.carbs}g G${selectedUser.fat}g`],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            {MODULES.map(mod => {
              const active = activeModule === mod.id
              const Icon = mod.icon
              return (
                <div key={mod.id} onClick={() => setActiveModule(mod.id)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                  background: active ? '#1A1916' : '#FFFFFF',
                  border: `1.5px solid ${active ? 'transparent' : 'rgba(0,0,0,0.07)'}`,
                  boxShadow: active ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: active ? 'rgba(255,255,255,0.1)' : `${mod.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={active ? '#FFFFFF' : mod.color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#FFFFFF' : '#1A1916', marginBottom: 3 }}>
                      {mod.label}
                    </div>
                    <div style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.5)' : '#9A9690', lineHeight: 1.4 }}>
                      {mod.desc}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Extra context */}
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: '14px 16px',
            marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#9A9690', marginBottom: 8 }}>
              Contexto adicional (opcional)
            </div>
            <textarea
              value={extraContext}
              onChange={e => setExtraContext(e.target.value)}
              placeholder={
                activeModule === 'macros' ? 'Ej: Tiene entrenamiento doble los lunes, prefiere evitar lácteos...' :
                activeModule === 'meal_plan' ? 'Ej: No come gluten, prefiere desayunos ligeros, cocina en casa...' :
                activeModule === 'train_plan' ? 'Ej: Solo tiene mancuernas, 3 días disponibles, lesión de hombro...' :
                'Ej: Lleva 2 semanas estancada en el peso, sube el estrés laboral...'
              }
              rows={2}
              style={{
                width: '100%', resize: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: '#1A1916', background: 'transparent',
                fontFamily: '-apple-system, sans-serif', lineHeight: 1.5,
              }}
            />
          </div>

          {/* Generate button */}
          <div onClick={!generating ? generate : undefined} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '16px', borderRadius: 14, cursor: generating ? 'default' : 'pointer',
            background: generating ? '#2A2724' : `linear-gradient(135deg, ${activeModuleData.color}, ${activeModuleData.color}CC)`,
            fontSize: 14, fontWeight: 700, color: '#FFFFFF',
            boxShadow: generating ? 'none' : `0 6px 24px ${activeModuleData.color}44`,
            transition: 'all 0.3s', marginBottom: result ? 20 : 0,
            opacity: generating ? 0.8 : 1,
          }}>
            {generating ? (
              <>
                <RefreshCw size={16} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} />
                Generando con IA...
              </>
            ) : (
              <>
                <Sparkles size={16} strokeWidth={2.5} />
                Generar {activeModuleData.label.toLowerCase()} para {selectedUser.name?.split(' ')[0]}
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div style={{
              background: '#FFFFFF', borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Result header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)',
                background: '#FAFAF8',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1916' }}>
                    Resultado IA — pendiente de revisión
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div onClick={copyResult} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                    borderRadius: 8, cursor: 'pointer', background: '#F0EDE8',
                    fontSize: 11, fontWeight: 600, color: '#6B6762', transition: 'all 0.15s',
                  }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </div>
                  <div onClick={generate} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                    borderRadius: 8, cursor: 'pointer', background: '#F0EDE8',
                    fontSize: 11, fontWeight: 600, color: '#6B6762',
                  }}>
                    <RefreshCw size={12} />
                    Regenerar
                  </div>
                </div>
              </div>

              {/* Result content */}
              <div style={{ padding: '20px 22px' }}>
                <pre style={{
                  fontSize: 13, color: '#1A1916', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  margin: 0, maxHeight: 500, overflowY: 'auto',
                }}>
                  {result}
                </pre>
              </div>

              {/* Approve / save */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#FAFAF8' }}>
                {approved ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 12,
                    background: 'rgba(48,209,88,0.1)', fontSize: 14, fontWeight: 700, color: '#30D158',
                  }}>
                    <CheckCircle size={18} strokeWidth={2.5} />
                    Guardado en Supabase para {selectedUser.name?.split(' ')[0]}
                  </div>
                ) : parsed ? (
                  <div>
                    <div style={{ fontSize: 11, color: '#9A9690', marginBottom: 10, textAlign: 'center' as const }}>
                      Se detectó estructura JSON. ¿Aprobar y guardar en Supabase?
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div onClick={generate} style={{
                        flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                        background: '#F0EDE8', fontSize: 13, fontWeight: 700, color: '#6B6762',
                        textAlign: 'center' as const,
                      }}>
                        Regenerar
                      </div>
                      <div onClick={!approving ? approve : undefined} style={{
                        flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '13px', borderRadius: 12, cursor: approving ? 'default' : 'pointer',
                        background: '#1A1916', fontSize: 13, fontWeight: 700, color: '#FFFFFF',
                        transition: 'all 0.2s', opacity: approving ? 0.7 : 1,
                      }}>
                        <Save size={15} strokeWidth={2.5} />
                        {approving ? 'Guardando...' : `Aprobar y guardar`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#9A9690', textAlign: 'center' as const, lineHeight: 1.5 }}>
                    La IA no devolvió JSON estructurado. Puedes copiar el resultado y aplicarlo manualmente,<br />
                    o pide a la IA que sea más específica añadiendo contexto arriba.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
