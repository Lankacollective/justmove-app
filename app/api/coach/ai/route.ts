import { NextRequest, NextResponse } from 'next/server'

function buildPrompt(module: string, user: any, extraContext: string): string {
  const userSummary = `
Nombre: ${user.name}
Sexo: ${user.sex === 'F' ? 'Femenino' : 'Masculino'}
Objetivo: ${user.objetivo || 'no especificado'}
Biotype: ${user.biotype || 'no especificado'}
Nivel: ${user.level || 'intermedio'}
Peso actual: ${user.current_weight ? user.current_weight + ' kg' : 'no especificado'}
Peso objetivo: ${user.target_weight ? user.target_weight + ' kg' : 'no especificado'}
Calorías target: ${user.target_cal || 'no especificado'} kcal
Macros: P${user.prot}g / C${user.carbs}g / G${user.fat}g
${extraContext ? `\nContexto adicional: ${extraContext}` : ''}
`.trim()

  if (module === 'macros') return `Eres un nutricionista deportivo experto. Analiza el perfil y recalcula macros óptimos.

PERFIL:
${userSummary}

Calcula TDEE, ajusta según objetivo, distribuye macros según biotype (endomorfo: menos carbos; mesomorfo: balanceado; ectomorfo: más carbos).

Explica el razonamiento y responde con JSON:
\`\`\`json
{"target_cal": número, "prot": número, "carbs": número, "fat": número, "razonamiento": "explicación"}
\`\`\``

  if (module === 'meal_plan') return `Eres un nutricionista deportivo experto. Genera plan de comidas para el atleta.

PERFIL:
${userSummary}

Crea plan para un día típico con 4-6 comidas. Total de calorías cercano al target.

\`\`\`json
{"meals": [{"id": "m1", "name": "Desayuno", "time": "08:00", "items": [{"name": "Alimento", "g": "150g", "cal": 200, "p": 20, "c": 15, "f": 5}]}]}
\`\`\``

  if (module === 'train_plan') return `Eres un entrenador personal experto. Genera plan de entrenamiento semanal.

PERFIL:
${userSummary}

Plan con 3-5 días según nivel y objetivo. Incluye series, reps, descanso y progresión.

\`\`\`json
{"plan": {"dias_semana": 4, "enfoque": "Hipertrofia", "semanas": [{"semana": 1, "dias": [{"dia": "Lunes", "nombre": "Empuje", "ejercicios": [{"nombre": "Press banca", "series": 4, "reps": "8-10", "descanso": "90s", "nota": "Progresión lineal"}]}]}]}}
\`\`\``

  return `Eres un coach de fitness experto. Analiza el perfil y sugiere 3-5 ajustes concretos priorizados por impacto.

PERFIL:
${userSummary}

Sé directo y accionable. Responde en español.`
}

export async function POST(req: NextRequest) {
  try {
    const { module, user, extraContext } = await req.json()
    if (!module || !user) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const prompt = buildPrompt(module, user, extraContext || '')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: 'Eres un coach de fitness y nutrición experto. Responde siempre en español.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || 'Sin respuesta'
    return NextResponse.json({ result })

  } catch (error: any) {
    console.error('AI Coach error:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}