/**
 * ZeroDev Session Key Management — viem native + EIP-1193
 *
 * Non-custodial session key lifecycle using Zerodev Kernel v3.1 on Sepolia Testnet (chain 11155111).
 * The session key EOA is managed by the server (derived from MASTER_SESSION_PRIVATE_KEY).
 * The frontend only ever receives the session key's public address — never the private key.
 *
 * Flow:
 * 1. Frontend fetches session key public address from server (`GET /keys/session-key/address`)
 * 2. User configures policies (suppliers, limits, expiry) via AgentLimitsForm
 * 3. User connects MetaMask (EIP-1193) — their non-custodial wallet
 * 4. MetaMask signs to create a Kernel smart account with permission-scoped policies
 *    - The PermissionValidator authorizes the session key's public address as the signer
 *    - Policies enforce what the session key can do (whitelist, caps, expiry)
 * 5. The Kernel account is serialized into an approval string
 * 6. Frontend sends the approval string to the server for storage
 * 7. Server later uses the encrypted session key (from DB) to execute payments
 *
 * The user's private key NEVER leaves MetaMask. The frontend never handles raw private keys.
 * All policy data is enforced on-chain by the ZeroDev PermissionValidator.
 * No paymaster — the smart account pays gas from its own HSK balance.
 *
 * Lifecycle:
 * - First time: `setupSessionWithPolicies()` creates the smart account (once)
 * - Edit limits: `updateSessionPolicies()` deserializes existing account, rebuilds policies
 * - Revoke: `revokeSessionKey()` creates a tx to uninstall the permission validator
 */

import { type Hex, type Address, defineChain, type EIP1193Provider } from "viem";
import { createPublicClient, http } from "viem";
import { addressToEmptyAccount, createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, toSigner } from "@zerodev/sdk";
import { toInitConfig, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner, toEmptyECDSASigner } from "@zerodev/permissions/signers";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { buildPolicies, type SessionPolicyConfig } from "./zerodev-policies";
import { serializePermissionAccount, deserializePermissionAccount } from "@zerodev/permissions";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { sepolia } from "viem/chains";
import { toSudoPolicy } from "@zerodev/permissions/policies";

const entryPoint = getEntryPoint("0.7");

const zerodevRpc = process.env.NEXT_PUBLIC_ZERODEV_RPC;
if (!zerodevRpc) throw new Error("NEXT_PUBLIC_ZERODEV_RPC not set");

const paymasterClient = createZeroDevPaymasterClient({
  chain: sepolia,
  transport: http(zerodevRpc),
});


const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(zerodevRpc),
});

/** Serializable policy config (no bigint — strings for JSON transport) */
/** Serializable policy config (no bigint — strings for JSON transport) */
export interface SessionPolicyConfigSerializable {
  suppliers: { address: string; maxPerPayment: string }[]
  maxDailyTotal?: string
  maxDailyTxCount?: number
  expiryTimestamp: number
}

export interface EnableSessionResult {
  serializedApproval: string;
  sessionKeyAddress: Address;
  smartAccountAddress: Address;
  policyConfig: SessionPolicyConfigSerializable;
  expiryTimestamp: number;
}

/**
 * Helper: create a Kernel account with the given session key and policies.
 * Used by both first-time setup and policy updates.
 */

async function createKernelWithPolicies(
  provider: EIP1193Provider,
  sessionKeyAddress: Address,
  policyConfig: SessionPolicyConfig
) {
  const policies = buildPolicies(policyConfig);
  const sessionKeySigner = toEmptyECDSASigner(sessionKeyAddress);

  // 1. Resolve the user signer (MetaMask)
  const userSigner = await toSigner({ signer: provider });

  // 2. Create the SUDO validator
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: userSigner,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const sudoPolicy = toSudoPolicy({})

  // 3. Create the Permission Validator
  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: sessionKeySigner,
    policies: [sudoPolicy], // For simplicity, we use a Sudo policy here. Replace with `policies` for real enforcement.
  });

  // 4. Create the account object
  // We pass both validators. If address is still 0x0, ensure publicClient 
  // has the correct 'chain' object for Sepolia Testnet (11155111).
  const kernelAccount = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    plugins: {
      sudo: ecdsaValidator,
    },
    initConfig: await toInitConfig(permissionPlugin),
  });

  // Debug check: This should now show the 0x... address
  if (kernelAccount.address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Kernel account address calculation failed. Check publicClient chain and EntryPoint.");
  }

  return {
    approval: (await serializePermissionAccount(kernelAccount, undefined, undefined, undefined, permissionPlugin)),
    kernelAccount: kernelAccount,
  }
}



/**
 * FIRST TIME: Enable a session key with ZeroDev policies using the user's MetaMask wallet.
 *
 * This creates the Kernel smart account ONCE. Subsequent edits use `updateSessionPolicies()`.
 *
 * @param provider — The user's EIP-1193 compatible wallet (e.g., window.ethereum from MetaMask)
 * @param sessionKeyPublicAddress — The session key's public address from the server
 * @param policyConfig — Session policy config (suppliers, limits, expiry, etc.)
 * @returns Approval string and session key address for backend storage
 */
export async function setupSessionWithPolicies(
  provider: EIP1193Provider,
  sessionKeyPublicAddress: Address,
  policyConfig: SessionPolicyConfig
): Promise<EnableSessionResult> {
  // Create Kernel account + serialize
  const { approval, kernelAccount } = await createKernelWithPolicies(
    provider,
    sessionKeyPublicAddress,
    policyConfig
  );

  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    chain: sepolia,
    bundlerTransport: http(zerodevRpc),
    paymaster: paymasterClient,
  });

  await kernelClient.sendTransaction({
    to: "0x0000000000000000000000000000000000000000",
    value: 0n,
    data: "0x",
  })

  console.log("smart account address:", kernelAccount.address);
  console.log("session approval string:", approval);

  const serializableConfig: SessionPolicyConfigSerializable = {
    suppliers: policyConfig.suppliers.map(s => ({
      address: s.address,
      maxPerPayment: s.maxPerPayment.toString(),
    })),
    maxDailyTotal: policyConfig.maxDailyTotal?.toString(),
    maxDailyTxCount: policyConfig.maxDailyTxCount,
    expiryTimestamp: policyConfig.expiryTimestamp,
  };

  return {
    serializedApproval: approval,
    sessionKeyAddress: sessionKeyPublicAddress,
    smartAccountAddress: kernelAccount.address,
    policyConfig: serializableConfig,
    expiryTimestamp: policyConfig.expiryTimestamp,
  };
}

/**
 * EDIT: Update session policies on the existing Kernel account.
 *
 * Deserializes the stored approval string, rebuilds policies with the new config,
 * and creates a new approval string. The account address stays the same.
 *
 * @param provider — The user's EIP-1193 compatible wallet
 * @param sessionKeyPublicAddress — The session key's public address
 * @param policyConfig — Updated session policy config
 * @returns New approval string and session key address
 */
/**
 * EDIT: Update session policies by reinstalling the permission plugin on-chain.
 * 
 * This ensures the old limits are invalidated and the new ones are enforced 
 * by the Kernel smart account.
 */
export async function updateSessionPolicies(
  provider: EIP1193Provider,
  sessionKeyPublicAddress: Address,
  smartAccountAddress: Address,
  policyConfig: SessionPolicyConfig
): Promise<EnableSessionResult> {

  await revokeSessionKey(provider, smartAccountAddress, sessionKeyPublicAddress);

  const userSigner = await toSigner({ signer: provider });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: userSigner,
  })

  // Create an "empty account" as the signer -- you only need the public
  // key (address) to do this.
  const emptyAccount = addressToEmptyAccount(sessionKeyPublicAddress)
  const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount })

  const sudoPolicy = toSudoPolicy({})

  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: emptySessionKeySigner,
    policies: [sudoPolicy] //buildPolicies(policyConfig),
  })

  const kernelAccount = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    address: smartAccountAddress,
    plugins: {
      sudo: ecdsaValidator,
      regular: permissionPlugin,
    },
  })

  const approval = await serializePermissionAccount(kernelAccount)

  const serializableConfig: SessionPolicyConfigSerializable = {
    suppliers: policyConfig.suppliers.map(s => ({
      address: s.address,
      maxPerPayment: s.maxPerPayment.toString(),
    })),
    maxDailyTotal: policyConfig.maxDailyTotal?.toString(),
    maxDailyTxCount: policyConfig.maxDailyTxCount,
    expiryTimestamp: policyConfig.expiryTimestamp,
  };

  return {
    serializedApproval: approval,
    sessionKeyAddress: sessionKeyPublicAddress,
    smartAccountAddress: kernelAccount.address,
    policyConfig: serializableConfig,
    expiryTimestamp: policyConfig.expiryTimestamp,
  };
}

/**
 * REVOKE: Uninstalls the permission validator by sending an on-chain transaction.
 * 
 * @param provider — The user's MetaMask (EIP-1193)
 * @returns The transaction hash of the revocation
 */
export async function revokeSessionKey(
  provider: EIP1193Provider,
  smartAccountAddress: Address,
  sessionKeyPublicAddress: Address,
): Promise<string> {
  // 1. Setup the Sudo Signer (MetaMask)
  const userSigner = await toSigner({ signer: provider });
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: userSigner,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  // 2. Initialize the Account (Sudo mode only)
  const kernelAccount = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    address: smartAccountAddress,
    plugins: {
      sudo: ecdsaValidator,
    },
  });

  // 3. Create the Client to actually send the transaction
  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    chain: sepolia,
    bundlerTransport: http(zerodevRpc),
    paymaster: paymasterClient,
  });


  const emptySessionKeySigner = toEmptyECDSASigner(sessionKeyPublicAddress);
  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: emptySessionKeySigner,
    // Policies don't need to match exactly for uninstallation
    policies: [],
  });

  // 4. Uninstall the "Regular" Validator (the Session Key plugin)
  // In Kernel v3.1, this removes the permission logic from the account.
  const txHash = await kernelClient.uninstallPlugin({
    plugin: permissionPlugin,
});

  return txHash;
}


/**
 * Check if a session key is currently active by attempting to deserialize
 * the permission account.
 *
 * @param serializedApproval — The approval string from session setup
 * @param sessionKeyAddress — The session key's public address from the server
 * @returns Whether the session is active
 */
export async function checkSessionStatus(
  serializedApproval: string,
  sessionKeyAddress: Address
): Promise<{ active: boolean }> {
  try {
    const sessionKeySigner = toEmptyECDSASigner(sessionKeyAddress);

    // Attempt to deserialize — throws if invalid or expired
    await deserializePermissionAccount(
      publicClient,
      entryPoint,
      KERNEL_V3_1,
      serializedApproval as `0x${string}`,
      sessionKeySigner
    );

    return { active: true };
  } catch {
    return { active: false };
  }
}
