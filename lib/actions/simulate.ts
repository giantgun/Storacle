'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

export async function simulatePurchase(itemId: string, quantitySold: number) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const res = await fetch(`${baseUrl}/simulate/purchase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item_id: itemId, quantity_sold: quantitySold }),
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.error || `Server error (${res.status})`)
  }

  return res.json()
}
