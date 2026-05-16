import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { itemName, itemCal, itemP, itemC, itemF, profile } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Eres nutriólogo experto en México. El usuario no tiene "${itemName}" (${itemCal} kcal, P:${itemP}g C:${itemC}g G:${itemF}g). Perfil: ${profile?.sex === 'F' ? 'Mujer' : 'Hombre'}, objetivo: ${profile?.goal_weight}kg, nivel: ${profile?.level}${profile?.injuries ? ', lesiones: ' + profile.injuries : ''}. Sugiere 3 sustitutos fáciles de conseguir en México. Responde SOLO con JSON sin texto extra: [{"name":"nombre","cal":número,"p":número,"c":número,"f":número,"g":"cantidad","reason":"razón breve"}]`
      }]
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'
  const clean = text.replace(/```json|```/g, '').trim()
  const suggestions = JSON.parse(clean)
  return NextResponse.json({ suggestions })
}