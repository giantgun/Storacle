import { redirect } from 'next/navigation'
import { isAuthenticated, getSession } from '@/lib/utils/session'
import DashboardContent from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect('/onboarding')
  }

  const session = await getSession()

  return <DashboardContent access_token={session?.value!} />
}
