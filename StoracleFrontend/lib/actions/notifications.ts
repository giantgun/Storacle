'use server'

import { ServerNotification } from '../types/sse-events'
import { ApiResponse } from '../types'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

/** Fetch notifications from the real server via the dashboard bootstrap endpoint. */
export async function getNotifications(): Promise<ApiResponse<ServerNotification[]>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/dashboard/data`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    return {
      success: false,
      data: [],
      timestamp: Date.now(),
    }
  }

  const data = await response.json()
  return {
    success: true,
    data: data.notifications ?? [],
    timestamp: Date.now(),
  }
}

/** Mark a notification as read on the server. */
export async function markNotificationAsRead(
  notificationId: string
): Promise<ApiResponse<void>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    return {
      success: false,
      data: undefined,
      timestamp: Date.now(),
    }
  }

  return {
    success: true,
    data: undefined,
    timestamp: Date.now(),
  }
}
