import crypto from 'crypto';
import { CreateOrderRequestBody } from './client';
import { canonicalize } from 'json-canonicalize';

/**
 * HSP Protocol - Cryptographic utilities
 * Handles HMAC-SHA256 signing and canonical JSON formatting
 */

/** Canonical JSON format (sorted keys, minimal spacing) */
export function canonicalJSON(obj: unknown): string {
  return canonicalize(obj);
}

/** Compute SHA256 hash as hex string */
export function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf-8').digest('hex');
}

/** HMAC-SHA256 signing for HSP API requests */
export interface HSPSignatureParams {
  method: 'GET' | 'POST';
  path: string;
  query?: string;
  body?: CreateOrderRequestBody;
  timestamp: number;
  nonce: string;
  appSecret: string;
}

export function createHSPSignature({
  method,
  path,
  query = '',
  body,
  timestamp,
  nonce,
  appSecret,
}: HSPSignatureParams): string {
  // Step 1: Compute body hash
  const bodyHash = body ? sha256Hex(canonicalJSON(body)) : '';

  // Step 2: Create message string with newlines
  const message = `${method}\n${path}\n${query}\n${bodyHash}\n${timestamp}\n${nonce}`;

  // Step 3: HMAC-SHA256
  return crypto
    .createHmac('sha256', appSecret)
    .update(message, 'utf-8')
    .digest('hex');
}

/** Generate a random nonce for replay protection */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** Get current Unix timestamp in seconds */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
