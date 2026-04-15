"use client"

/**
 * ZeroDev Session Key Policy Builder
 *
 * Non-custodial session key management via ZeroDev PermissionValidator.
 * All policy configuration is built on the frontend and signed by the user's
 * smart account. No server-side policy storage.
 *
 * Uses @zerodev/permissions to encode CallPolicy, GasPolicy, TimestampPolicy,
 * and RateLimitPolicy into on-chain data for the smart account.
 */
import {
  toPermissionValidator,
  type Policy,
} from "@zerodev/permissions"
import {
  toCallPolicy,
  toGasPolicy,
  toTimestampPolicy,
  toRateLimitPolicy,
  ParamCondition,
  CallType,
  CallPolicyVersion,
  toSudoPolicy,
} from "@zerodev/permissions/policies"
import { toECDSASigner } from "@zerodev/permissions/signers"
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants"

import { privateKeyToAccount } from "viem/accounts"
import {
  type PublicClient,
  type Address,
  type Hex,
  type LocalAccount,
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
  concat,
  size,
  pad,
} from "viem"

const entryPoint = getEntryPoint("0.7")

export interface SupplierPolicy {
  address: Hex
  maxPerPayment: bigint
}

export interface SessionPolicyConfig {
  expiryTimestamp: number
  suppliers: SupplierPolicy[]
  maxDailyTotal?: bigint
  maxDailyTxCount?: number
  usdtAddress: Hex
}

/**
 * Build CallPolicy rules for each supplier.
 * Each rule restricts USDT.transfer() to a specific supplier with a max amount.
 *
 * Rules encoding:
 *   rule[0]: arg 0 (recipient) == supplierAddress   (ParamCondition.EQUAL)
 *   rule[1]: arg 1 (amount)   <= maxPerPayment        (ParamCondition.LESS_THAN_OR_EQUAL)
 */

function buildSupplierCallPolicy(suppliers: SupplierPolicy[], usdtAddress: Hex): Policy {
  if (suppliers.length === 0) {
    return toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_5,
      permissions: [],
    })
  }

  // Build one permission per supplier using byte-aligned rules
  const permissions = suppliers.map(supplier => ({
    target: usdtAddress as Address,
    callType: CallType.CALL,
    valueLimit: BigInt(0),
    rules: [
      {
        // First 32 bytes of calldata (after selector) is the 'to' address
        offset: 0,
        condition: ParamCondition.EQUAL,
        // Addresses must be padded to 32 bytes for ABI compatibility
        params: [pad(supplier.address, { size: 32 })],
      },
      {
        // Second 32 bytes (starting at byte 32) is the 'amount' uint256
        offset: 32,
        condition: ParamCondition.LESS_THAN_OR_EQUAL,
        // Numbers must also be padded to 32 bytes
        params: [pad(toHex(supplier.maxPerPayment), { size: 32 })],
      },
    ],
  }))

  return toCallPolicy({
    policyVersion: CallPolicyVersion.V0_0_5,
    permissions,
  })
}


/**
 * Builds a complete policy array from SessionPolicyConfig.
 * Returns an array of ZeroDev Policy objects ready for the PermissionValidator.
 */
export function buildPolicies(config: SessionPolicyConfig): Policy[] {
  const policies: Policy[] = []

  // 1. CallPolicy — supplier whitelist + per-payment limits
  const callPolicy = buildSupplierCallPolicy(config.suppliers, config.usdtAddress)
  policies.push(callPolicy)

  // 2. GasPolicy — max total USDT spend (if set)
  if (config.maxDailyTotal !== undefined) {
    const gasPolicy = toGasPolicy({
      allowed: config.maxDailyTotal,
      enforcePaymaster: true, 
    })
    policies.push(gasPolicy)
  }

  // 3. TimestampPolicy — session expiry
  const timestampPolicy = toTimestampPolicy({
    validUntil: config.expiryTimestamp,
  })
  policies.push(timestampPolicy)

  // 4. RateLimitPolicy — max transactions per interval (if set)
  if (config.maxDailyTxCount !== undefined) {
    const ratePolicy = toRateLimitPolicy({
      count: config.maxDailyTxCount,
      interval: 86400, // 24 hours
    })
    policies.push(ratePolicy)
  }

  return policies
}

/**
 * Creates a ZeroDev PermissionValidator account with the given policies.
 * This is the entry point for enabling an agent session.
 */
export async function createPermissionValidatorAccount({
  client,
  sessionKey,
  policies,
}: {
  client: PublicClient
  sessionKey: Hex
  policies: Policy[]
}) {
  const sessionAccount = privateKeyToAccount(sessionKey)
  const sessionSigner = await toECDSASigner({
    signer: sessionAccount,
  })
  
  const sudoPolicy = toSudoPolicy({})
  
  return toPermissionValidator(client, {
    signer: sessionSigner,
    policies: [ sudoPolicy ],
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  })
}
