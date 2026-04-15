'use server'

import { redirect } from 'next/navigation';
import { destroySession } from '../utils/session'
import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

export async function updateUserProfile(
  data: { orgName: string; firstName: string; lastName: string; businessEmail: string }
): Promise<{ success: boolean; error?: string; timestamp: number }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  try {
    const response = await fetch(`${baseUrl}/auth/org/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessName: data.orgName,
        businessEmail: data.businessEmail,
        firstName: data.firstName,
        lastName: data.lastName,
      }),
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to update profile', timestamp: Date.now() }
    }

    return { success: true, timestamp: Date.now() }
  } catch {
    return { success: false, error: 'Network error', timestamp: Date.now() }
  }
}

export async function logout(): Promise<{ success: boolean; data: { loggedOut: boolean }; timestamp: number }> {
  // Call server to destroy session
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (token) {
    try {
      await fetch(`${baseUrl}/auth/signout`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Continue with local cleanup even if server call fails
    }
  }

  // Destroy session cookie
  await destroySession()

  return {
    success: true,
    data: { loggedOut: true },
    timestamp: Date.now(),
  }
}
