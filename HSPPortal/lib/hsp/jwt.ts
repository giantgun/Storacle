import { CartMandateContents } from './client';
import { canonicalJSON, sha256Hex } from './crypto';
import crypto from 'crypto';
import { ethers, SigningKey } from 'ethers';
import * as jose from 'jose';


/**
 * ES256K JWT signing for HSP Cart Mandate authorization
 * Uses secp256k1 elliptic curve (same as Ethereum/Bitcoin)
 */

export interface MerchantJWTClaims {
    iss: string; // Issuer - merchant name
    sub: string; // Subject - merchant name
    aud: "HashkeyMerchant"; // Audience - must be "HashkeyMerchant"
    iat: number; // Issued-at timestamp
    exp: number; // Expiry timestamp
    jti: string; // Unique JWT ID
    cart_hash: string; // SHA256 of cart contents
}

/** Create ES256K JWT header */
function createHeader(): string {
    return Buffer.from(
        canonicalJSON({ alg: 'ES256K', typ: 'JWT' })
    ).toString('base64url');
}

/** Create JWT claims */
function createClaims(
    merchantName: string,
    cartHash: string,
    expirySeconds: number = 3600
): MerchantJWTClaims {
    const now = Math.floor(Date.now() / 1000);

    console.log('Creating JWT claims with cart hash:', cartHash);
    console.log("merchantName:", merchantName);

    return {
        iss: merchantName,
        sub: merchantName,
        aud: "HashkeyMerchant",
        iat: now - 60,
        exp: now + expirySeconds,
        jti: `JWT-${now}-${Math.random().toString(36).slice(2, 11)}`,
        cart_hash: cartHash,
    };
}

/** Encode JWT payload (claims) */
function encodePayload(claims: MerchantJWTClaims): string {
    return Buffer.from(canonicalJSON(claims)).toString('base64url');
}

/**
 * Sign ES256K JWT with merchant private key
 * 
 * NOTE: This is a MOCK implementation that returns a valid JWT-like string.
 * For production, you must use a proper secp256k1 signing library like:
 * - ethers.js: SigningKey with secp256k1
 * - @noble/secp256k1: sign() function
 * - crypto-js + elliptic libraries
 * 
 * The signature should be:
 * 1. Sign the message with private key using secp256k1
 * 2. Extract r and s from the signature
 * 3. Encode as base64url
 */
export async function createMerchantJWT(
    merchantName: string,
    cart: CartMandateContents,
    merchantPrivateKey: string, // Will be used in production signing
): Promise<string> {
    // Compute cart hash
    const cartHash = sha256Hex(canonicalJSON(cart));

    // Create JWT components
    const header = createHeader();
    const claims = createClaims(merchantName, cartHash);
    // const payload = encodePayload(claims);
    // const message = `${header}.${payload}`;

    const privateKey = crypto.createPrivateKey(merchantPrivateKey);

    // const jwk = privateKey.export({ format: 'jwk' });
    // const hexPrivateKey = '0x' + Buffer.from(jwk.d!, 'base64url').toString('hex');

    // // 2. Initialize SigningKey
    // const key = new ethers.SigningKey(hexPrivateKey);

    // // 3. Hash the message (Standard for JWT/ES256)
    // // Using sha256 because ES256 (JWT standard) expects a SHA-256 hash
    // const messageBytes = ethers.toUtf8Bytes(message);

    // // 4. Sign the digest
    // const sig = key.sign(messageBytes);

    // // Ensure R and S are exactly 32 bytes (64 hex chars) by padding
    // const rHex = sig.r.slice(2).padStart(64, '0');
    // const sHex = sig.s.slice(2).padStart(64, '0');

    // // Combine and encode
    // const signature = Buffer.from(rHex + sHex, 'hex').toString('base64url');


    // return `${message}.${signature}`;
    const privateKeyJ = await jose.importPKCS8(merchantPrivateKey, 'ES256K');

  // 2. Canonicalize the claims yourself
  const canonicalClaims = canonicalJSON(claims);
  const payload = new TextEncoder().encode(canonicalClaims);

  // 3. Manually construct and sign
  const jwt = await new jose.CompactSign(payload)
    .setProtectedHeader({alg:'ES256K',typ:'JWT'})
    .sign(privateKeyJ);

  return jwt;
}

/**
 * For production use, implement this with ethers.js or @noble/secp256k1
 * Example with ethers.js:
 * 
 * import { SigningKey } from 'ethers';
 * 
 * export function createMerchantJWTProduction(
 *   merchantName: string,
 *   cart: Record<string, unknown>,
 *   merchantPrivateKeyPEM: string,
 * ): string {
 *   const cartHash = sha256Hex(canonicalJSON(cart));
 *   const claims = createClaims(merchantName, cartHash);
 *   
 *   const header = createHeader();
 *   const payload = encodePayload(claims);
 *   const message = `${header}.${payload}`;
 *   
 *   // Sign with secp256k1
 *   const key = new SigningKey(merchantPrivateKeyPEM);
 *   const sig = key.sign(Buffer.from(message));
 *   const signature = Buffer.from(sig.r + sig.s).toString('base64url');
 *   
 *   return `${message}.${signature}`;
 * }
 */
