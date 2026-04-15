'use server'

import { redirect } from 'next/navigation'
import { Supplier, ApiResponse, SuppliersResponse } from '../types'
import { ServerSupplier } from '../types/sse-events'
import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

/** Fetch suppliers from the real server via the dashboard bootstrap endpoint. */
export async function getSuppliers(): Promise<ApiResponse<ServerSupplier[]>> {
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
    data: data.suppliers ?? [],
    timestamp: Date.now(),
  }
}

export async function createSupplier({
  supplierEmail, supplierWallet, supplierName
}: {
  supplierEmail: string, supplierWallet: string, supplierName: string
}): Promise<ApiResponse<any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/suppliers/add`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplierEmail, supplierWallet, supplierName })
  })

  const data = await response.json()
  console.log(data)

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function updateSupplier(
  supplierEmail: string, supplierWallet: string, supplierName: string, supplierId: string
): Promise<ApiResponse<Supplier | any>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/suppliers/edit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplierEmail, supplierWallet, supplierName, supplierId })
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function deleteSupplier(supplierId: string): Promise<ApiResponse<{ deleted: boolean } | any>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/suppliers/delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplierId })
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
