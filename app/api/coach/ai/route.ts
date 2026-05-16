import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildPrompt(module: string, user: any, extraContext: string): string {
  const userSummary = `
Nombre: ${user.name}
Sexo: ${user.sex === 'F' ? 'Femenino' : 'Masculino'}
Objetivo: ${user.objetivo || 'no especificado'}
Biotype: ${user.biotype || 'no especificado'}
Nivel: ${user.level || 'intermedio'}
Peso actual: ${user.current_weight ? user.current_weight + ' kg' : 'no especificado'}
Peso objetivo: ${user.target_weight ? user.target_weight + ' kg' : 'no especificado'}
Calorías target actuales: ${user.target_cal || 'no especificado'} kcal
Macros actuales: P${user.prot}g / C${user.carbs}g / G${user.fat}g
${extraContext ? `\nContexto adicional del coach: ${extraContext}` : ''}
`.trim()

  if (module === 'macros') {
    return `Eres un nutricionista deportivo experto. Analiza el perfil del atleta y recalcula sus macros óptimos.

PERFIL:
${userSummary}

Calcula el TDEE (Total Daily Energy Expenditure), ajusta según el objetivo, y distribuye macros según el biotype.
- Biotype endomorfo: menor carbos, mayor proteína y grasa saludable
- Biotype mesomorfo: distribución balanceada
- Biotype ectomorfo: mayor carbos, proteína alta

Responde con una explicación clara del razonamiento y luego el resultado en JSON:

\`\`\`json
{
  "target_cal": número,
  "prot": número en gramos,
  "carbs": número en gramos,
  "fat": número en gramos,
  "razonamiento": "explicación breve"
}
\`\`\`

Sé preciso. Los valores deben ser números enteros.`
  }

  if (module === 'meal_plan') {
    return `Eres un nutricionista deportivo experto. Genera un plan de comidas semanal para el atleta.

PERFIL:
${userSummary}

Crea un plan para un día típico (que se puede repetir con variaciones) con 4-6 comidas.
Cada comida debe incluir nombre del plato, ingredientes con gramos, y macros calculados.

Responde con explicación y luego el plan en JSON compatible con este schema:

\`\`\`json
{
  "meals": [
    {
      "id": "m1",
      "name": "Desayuno",
      "time": "08:00",
      "items": [
        { "name": "Nombre alimento", "g": "150g", "cal": 200, "p": 20, "c": 15, "f": 5 }
      ]
    }
  ]
}
\`\`\`

Asegúrate que el total de calorías sea cercano al target_cal del atleta. Los macros deben ser números enteros.`
  }

  if (module === 'train_plan') {
    return `Eres un entrenador personal experto en periodización. Genera un plan de entrenamiento semanal.

PERFIL:
${userSummary}

Crea un plan semanal con 3-5 días de entrenamiento según el nivel y objetivo.
Incluye series, repeticiones, descanso y notas de progresión.

Responde con explicación del enfoque y luego el plan en JSON:

\`\`\`json
{
  "plan": {
    "dias_semana": 4,
    "enfoque": "Hipertrofia / Fuerza / etc",
    "semanas": [
      {
        "semana": 1,
        "dias": [
          {
            "dia": "Lunes",
            "nombre": "Empuje (Pecho, Hombros, Tríceps)",
            "ejercicios": [
              {
                "nombre": "Press banca",
                "series": 4,
                "reps": "8-10",
                "descanso": "90s",
                "nota": "Progresión lineal: +2.5kg por sesión"
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

Adapta la dificultad al nivel indicado. Sé específico con los ejercicios.`
  }

  if (module === 'adjustments') {
    return `Eres un coach de fitness y nutrición experto. Analiza el perfil del atleta y sugiere ajustes a su plan actual.

PERFIL:
${userSummary}

Considera:
- ¿Están los macros bien distribuidos para el objetivo?
- ¿El déficit/superávit calórico es adecuado para el ritmo de cambio esperado?
- ¿Hay señales de que el plan necesita cambios?
- ¿Qué métricas deberíamos monitorear más de cerca?

Proporciona entre 3 y 5 sugerencias concretas, priorizadas por impacto. Para cada una indica:
- El problema o área de mejora
- La acción específica recomendada
- El impacto esperado

Sé directo y accionable. Responde en español.`
  }

  return 'Describe el perfil del atleta y proporciona recomendaciones generales.'
}

export async function POST(req: NextRequest) {
  try {
    const { module, user, extraContext } = await req.json()

    if (!module || !user) {
      return NextResponse.json({ error: 'Faltan parámetros (module, user)' }, { status: 400 })
    }

    const prompt = buildPrompt(module, user, extraContext || '')

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('AI Coach API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
