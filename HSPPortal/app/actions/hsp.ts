'use server';

import { HSPClient, type CartMandateContents, formatAmount, formatDisplayAmount } from '../../lib/hsp/client';

/**
 * Server-side HSP order creation action
 * Handles invoice data and returns payment URL and details
 */

export interface CreateInvoiceOrderParams {
    itemName: string;
    quantity: number;
    unitPrice: number;
    expiryDate: string;
    payeeAddress: string;
    merchantName?: string;
    redirectUrl?: string;
}

export interface CreateInvoiceOrderResult {
    success: boolean;
    paymentUrl?: string;
    paymentRequestId?: string;
    flowId?: string;
    cartMandateId?: string;
    amount?: string;
    usdAmount?: string;
    error?: string;
}

/**
 * Create a payment order in HSP using invoice details
 * Returns payment URL and order IDs
 */
export async function createInvoiceOrder(
    params: CreateInvoiceOrderParams,
): Promise<CreateInvoiceOrderResult> {
    try {
        // Validate inputs
        if (!params.itemName || params.quantity <= 0 || params.unitPrice <= 0) {
            return {
                success: false,
                error: 'Invalid invoice details',
            };
        }

        if (!params.payeeAddress || !params.payeeAddress.startsWith('0x')) {
            return {
                success: false,
                error: 'Invalid payee address',
            };
        }

        // Get HSP configuration from environment
        const appKey = process.env.NEXT_PUBLIC_HSP_APP_KEY;
        const appSecret = process.env.HSP_APP_SECRET;
        const merchantName = params.merchantName || process.env.NEXT_PUBLIC_HSP_MERCHANT_NAME || 'Merchant';
        const merchantPrivateKey = process.env.HSP_MERCHANT_PRIVATE_KEY;
        const baseUrl = process.env.NEXT_PUBLIC_HSP_BASE_URL || 'https://merchant-qa.hashkeymerchant.com';

        // USDT on Sepolia testnet
        const usdtAddress = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS;
        const usdtDecimals = 6;

        if (!appKey || !appSecret || !merchantPrivateKey || !usdtAddress) {
            return {
                success: false,
                error: 'HSP configuration missing',
            };
        }

        // Calculate amounts
        const totalUSD = params.quantity * params.unitPrice;
        const cartMandateId = `ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const paymentRequestId = `PAY-REQ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Format amount
        const amountInSmallestUnits = formatAmount(totalUSD, usdtDecimals);

        // Build cart mandate contents
        const cartMandateContents: CartMandateContents = {
            id: cartMandateId,
            user_cart_confirmation_required: true,
            payment_request: {
                method_data: [
                    {
                        supported_methods: 'https://www.x402.org/',
                        data: {
                            x402Version: 2,
                            network: 'sepolia',
                            chain_id: 11155111,
                            contract_address: usdtAddress,
                            pay_to: params.payeeAddress,
                            coin: 'USDT',
                        },
                    },
                ],
                details: {
                    id: paymentRequestId,
                    display_items: [
                        {
                            label: params.itemName,
                            amount: {
                                currency: 'USD',
                                value: formatDisplayAmount(totalUSD),
                            },
                        },
                        {
                            label: `Quantity: ${params.quantity} @ $${formatDisplayAmount(params.unitPrice)} each`,
                            amount: {
                                currency: 'USD',
                                value: formatDisplayAmount(totalUSD),
                            },
                        },
                    ],
                    total: {
                        label: 'Total Amount Due',
                        amount: {
                            currency: 'USD',
                            value: formatDisplayAmount(totalUSD),
                        },
                    },
                },
            },
            cart_expiry: new Date(params.expiryDate).toISOString(),
            merchant_name: merchantName,
        };

        // Create HSP client and order
        const client = new HSPClient({
            appKey,
            appSecret,
            merchantName,
            merchantPrivateKey,
            baseUrl,
        });

        const response = await client.createOrder(
            cartMandateContents,
            params.redirectUrl,
        );

        if (response.code !== 0) {
            return {
                success: false,
                error: `HSP API error: ${response.msg}`,
            };
        }

        return {
            success: true,
            paymentUrl: response.data.payment_url,
            paymentRequestId: response.data.payment_request_id,
            cartMandateId,
            amount: amountInSmallestUnits,
            usdAmount: formatDisplayAmount(totalUSD),
        };
    } catch (error) {
        console.error('[hsp] Order creation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Query payment status (for checking invoice payment status)
 */
export async function queryInvoicePayment(
    cartMandateId: string,
): Promise<CreateInvoiceOrderResult> {
    try {
        const appKey = process.env.NEXT_PUBLIC_HSP_APP_KEY;
        const appSecret = process.env.HSP_APP_SECRET;
        const merchantName = process.env.NEXT_PUBLIC_HSP_MERCHANT_NAME || 'Merchant';
        const merchantPrivateKey = process.env.HSP_MERCHANT_PRIVATE_KEY;
        const baseUrl = process.env.NEXT_PUBLIC_HSP_BASE_URL || 'https://merchant-qa.hashkeymerchant.com';

        if (!appKey || !appSecret || !merchantPrivateKey) {
            return {
                success: false,
                error: 'HSP configuration missing',
            };
        }

        const client = new HSPClient({
            appKey,
            appSecret,
            merchantName,
            merchantPrivateKey,
            baseUrl,
        });

        const response = await client.queryPayments({
            cart_mandate_id: cartMandateId,
        });

        if (response.code !== 0) {
            return {
                success: false,
                error: `HSP query error: ${response.msg}`,
            };
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error('[hsp] Payment query error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
