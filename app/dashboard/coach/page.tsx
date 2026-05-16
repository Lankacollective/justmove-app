import { redirect } from 'next/navigation'

// El coach ya no vive en /dashboard/coach — tiene su propio espacio en /coach
export default function OldCoachRedirect() {
  redirect('/coach')
}
