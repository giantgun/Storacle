'use server'

import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'

export async function signUpWithWeb3(message: string, signedMessage: any) {
  const supabase = await createClient()

  // Create a user with the wallet address as email
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: "ethereum",
    message: message,
    signature: signedMessage,
  });

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signInWithWeb3(message: string, signedMessage: any) {
  const supabase = await createClient()

  // Create a user with the wallet address as email
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: "ethereum",
    message: message,
    signature: signedMessage,
  });

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect('/')
}

export async function getSession() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

export async function getUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
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
