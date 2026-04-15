import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/utils/session'

export default async function HomePage() {
  // Server-side redirect based on session authentication
  const authenticated = await isAuthenticated()
  
  if (authenticated) {
    redirect('/dashboard')
  } else {
    redirect('/onboarding')
  }
}
