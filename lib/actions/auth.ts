'use server'

import { User, AuthResponse, ApiResponse } from '../types'
import { DashboardBootstrapData } from '../types/sse-events'
import { createSession, destroySession } from '../utils/session'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { EnableSessionResult } from '../zerodev-session-key'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL!

export async function signup(
  firstName: string,
  lastName: string,
  businessName: string,
  email: string,
  message: string,
  signedMessage: string,
  walletAddress: string,
  nonce: string,
): Promise<ApiResponse<AuthResponse | any>> {

  const cookieStore = await cookies()
  const storedNonce = cookieStore.get('auth-nonce')?.value

  // Verify the nonce exists in the message to prevent replay
  if (!storedNonce || !message.includes(storedNonce)) {
    throw new Error("Invalid or expired nonce")
  }

  try {
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessEmail: email,
        message, signedMessage, firstName, lastName, businessName, walletAddress, nonce
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[server/signup] ' + JSON.stringify(data));
      return {
        success: false,
        timestamp: Date.now(),
        error: data?.error || `Signup failed (${response.status})`
      };
    }

    if (!data?.session?.access_token) {
      console.error('[server/signup] No session in response:', data);
      return {
        success: false,
        timestamp: Date.now(),
        error: 'Server did not return a valid session'
      };
    }

    await createSession(data.session.access_token)
    return {
      success: true,
      data: data,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error(error)
  }
  return {
    success: false,
    data: {},
    timestamp: Date.now(),
  }
}

export async function getAuthNonce() {
  // Generate a random 16-byte hex string (128 bits of entropy)
  const nonce = randomBytes(16).toString('hex')

  // Store it in an HttpOnly cookie to verify it later during sign-in
  const cookieStore = await cookies()
  cookieStore.set('auth-nonce', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600 // Valid for 10 minutes to match Supabase requirements
  })

  return nonce
}

export async function login(
  message: string,
  signedMessage: string,
  nonce: string,
) {
  const cookieStore = await cookies()
  const storedNonce = cookieStore.get('auth-nonce')?.value

  // Verify the nonce exists in the message to prevent replay
  if (!storedNonce || !message.includes(storedNonce)) {
    throw new Error("Invalid or expired nonce")
  }

  try {
    const response = await fetch(`${baseUrl}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message, signedMessage, nonce
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        timestamp: Date.now(),
        error: data?.error || `Sign in failed (${response.status})`
      }
    }

    if (!data?.session?.access_token) {
      return {
        success: false,
        timestamp: Date.now(),
        error: 'No session returned from server'
      }
    }

    await createSession(data.session.access_token)

    return {
      success: true,
      data: data,
      timestamp: Date.now(),
    }
  } catch (error: any) {
    console.error(error)
    return {
      success: false,
      timestamp: Date.now(),
      error: error.message
    }
  }
}

export async function updateUserProfile(info: any): Promise<ApiResponse<User | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/auth/org/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...info }),
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function getUserData(): Promise<ApiResponse<User | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/auth/org/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (token) {
    try {
      await fetch(`${baseUrl}/auth/signout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    } catch (err) {
      console.error('Logout server error:', err)
    }
  }

  await destroySession()

  return {
    success: true,
    data: { success: true },
    timestamp: Date.now(),
  }
}

export async function getSessionAddress(): Promise<ApiResponse<User | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/auth/session-address`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function toggleAgentActiveForOrg(isAgentActive: boolean, hash?: string | undefined): Promise<ApiResponse<User | any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/auth/org/agent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      isAgentActive,
      hash
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

/**
 * Fetch all dashboard data in a single server-side call.
 * This is the primary bootstrap endpoint — returns everything
 * needed to render the dashboard on initial load.
 */
export async function getDashboardData(): Promise<ApiResponse<DashboardBootstrapData>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/dashboard/data`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    return {
      success: false,
      data: undefined,
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function saveSessionApproval(result: EnableSessionResult): Promise<ApiResponse<any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/wallet/session-approval`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_key_approval: result.serializedApproval,
      session_key_address: result.sessionKeyAddress,
      smart_account_address: result.smartAccountAddress,
      policy_config: result.policyConfig,
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  console.log(data)
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}

export async function revokeSessionKeyApproval(): Promise<ApiResponse<any>> {

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect("/onboarding")
  }

  const response = await fetch(`${baseUrl}/wallet/session-revoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      success: false,
      data: {},
      timestamp: Date.now(),
    }
  }

  const data = await response.json();
  console.log(data)
  return {
    success: true,
    data: data,
    timestamp: Date.now(),
  }
}