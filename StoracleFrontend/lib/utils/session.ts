import { cookies } from 'next/headers'

export interface SessionData {
  userId: string
  email: string
  firstName: string
  lastName: string
  businessName: string
  accessToken: string
  createdAt: number
}

const ACCESS_TOKEN_COOKIE = 'access_token'
const SESSION_DURATION = 3600 // 1 hour

export async function createSession(accessToken: string): Promise<void> {
  try {
    const cookieStore = await cookies()

    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    })
  } catch (error) {
    console.error('[session] Failed to create session:', error)
    throw error
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(ACCESS_TOKEN_COOKIE)
    
    if (!sessionCookie) {
      return null
    }
    
    return sessionCookie
  } catch (error) {
    console.error('[session] Failed to parse session:', error)
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get(ACCESS_TOKEN_COOKIE)
    
    if (!tokenCookie?.value) {
      return null
    }
    
    return tokenCookie.value
  } catch (error) {
    console.error('[v0] Failed to get access token:', error)
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}
