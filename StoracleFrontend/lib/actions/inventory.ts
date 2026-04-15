'use server'

import { redirect } from 'next/navigation'
import { InventoryItem, ApiResponse, InventoryResponse } from '../types'
import { ServerInventoryItem } from '../types/sse-events'
import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

/** Fetch inventory items from the real server via the dashboard bootstrap endpoint. */
export async function getInventoryItems(): Promise<ApiResponse<ServerInventoryItem[]>> {
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
    data: data.inventory_items ?? [],
    timestamp: Date.now(),
  }
}

export async function createInventoryItem(
  item: Omit<InventoryItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version' | 'synced'>
): Promise<ApiResponse<InventoryItem | any>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/items/add`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...item })
  })

  if (!response.ok) {
    console.log(response.status)
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json()
  console.log(data)

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function updateInventoryItem(
  item: Partial<InventoryItem>
): Promise<ApiResponse<InventoryItem | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/items/edit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...item })
  })

  if (!response.ok) {
    console.log(response.status)
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json()

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function deleteInventoryItem(
  itemId: string,
): Promise<ApiResponse<InventoryItem | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/items/delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: itemId })
  })

  if (!response.ok) {
    console.log(response.status)
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json()

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function confirmItemTransit(
  orderId: string,
): Promise<ApiResponse<InventoryItem | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/items/transit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inventory_event_id: orderId }),
  })

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json()

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}
