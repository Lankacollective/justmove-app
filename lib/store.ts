import { createClient } from '@/lib/supabase'

export async function getDailyLog(userId: string, date: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()
  return data
}

export async function getMealPlan(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('meal_plans')
    .select('meals')
    .eq('user_id', userId)
    .single()
  return data?.meals || []
}

export function calcTotalsFromChecks(meals: any[], checks: Record<string, boolean>) {
  let cal = 0, p = 0, c = 0, f = 0
  meals.forEach(meal => {
    meal.items.forEach((item: any, idx: number) => {
      if (checks[`${meal.id}_${idx}`]) {
        cal += item.cal; p += item.p; c += item.c; f += item.f
      }
    })
  })
  return { cal: Math.round(cal), p: Math.round(p), c: Math.round(c), f: Math.round(f) }
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function getRealDayIndex() {
  const dow = new Date().getDay() // 0=Dom
  return [6, 0, 1, 2, 3, 4, 5][dow]
}