import {
    createHSPSignature,
    generateNonce,
    getCurrentTimestamp,
    canonicalJSON,
} from './crypto';
import { createMerchantJWT } from './jwt';

/**
 * HSP Protocol - API Client
 * Handles authenticated requests to HashKey Merchant API
 */

export interface HSPConfig {
    appKey: string;
    appSecret: string;
    merchantName: string;
    merchantPrivateKey: string;
    baseUrl: string; // https://merchant-qa.hashkeymerchant.com or production URL
}

export interface CartMandateContents {
    id: string; // Order ID / cart_mandate_id
    user_cart_confirmation_required: boolean;
    payment_request: {
        method_data: Array<{
            supported_methods: string;
            data: {
                x402Version: number;
                network: string;
                chain_id: number;
                contract_address: string;
                pay_to: string;
                coin: string;
            };
        }>;
        details: {
            id: string;
            display_items?: Array<{
                label: string;
                amount: { currency: string; value: string };
            }>;
            total: { label: string; amount: { currency: string; value: string } };
        };
    };
    cart_expiry: string; // RFC 3339
    merchant_name: string;
}

export interface CreateOrderRequestBody {
    cart_mandate: {
        contents: CartMandateContents;
        merchant_authorization: string; // ES256K JWT
    };
    redirect_url?: string;
}

export interface CreateOrderResponse {
    code: number;
    msg: string;
    data: {
        payment_request_id: string;
        payment_url: string;
        multi_pay: boolean;
    };
}

export interface PaymentQueryParams {
    cart_mandate_id?: string;
    payment_request_id?: string;
    flow_id?: string;
}

export interface PaymentQueryResponse {
    code: number;
    msg: string;
    data: PaymentRecord | PaymentRecord[] | PaginatedPaymentList;
}

export interface PaymentRecord {
    payment_request_id: string;
    request_id: string;
    token_address: string;
    flow_id: string;
    app_key: string;
    amount: string;
    usd_amount: string;
    token: string;
    chain: string;
    network: string;
    extra_protocol?: string;
    status: string;
    status_reason?: string;
    payer_address: string;
    to_pay_address: string;
    risk_level?: string;
    tx_signature?: string;
    broadcast_at?: string;
    gas_limit?: number;
    gas_fee?: string;
    gas_fee_amount?: string;
    service_fee_rate?: string;
    service_fee_type?: string;
    deadline_time: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface PaginatedPaymentList {
    list: PaymentRecord[];
    total: number;
    page: number;
    page_size: number;
}

export class HSPClient {
    private config: HSPConfig;

    constructor(config: HSPConfig) {
        this.config = config;
    }

    /**
     * Create a one-time payment order
     */
    async createOrder(
        cartMandateContents: CartMandateContents,
        redirectUrl?: string,
    ): Promise<CreateOrderResponse> {
        // Create JWT merchant authorization
        const merchantAuthorization = createMerchantJWT(
            this.config.merchantName,
            cartMandateContents,
            this.config.merchantPrivateKey,
        );

        // Build request
        const requestBody: CreateOrderRequestBody = {
            cart_mandate: {
                contents: cartMandateContents,
                merchant_authorization: await merchantAuthorization,
            },
            redirect_url: redirectUrl,
        };

        return this._makeAuthenticatedRequest<CreateOrderResponse>(
            'POST',
            '/merchant/orders',
            requestBody,
        );
    }

    /**
     * Query payment status by various IDs
     */
    async queryPayments(
        params: PaymentQueryParams,
    ): Promise<PaymentQueryResponse> {
        const queryString = Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        return this._makeAuthenticatedRequest<PaymentQueryResponse>(
            'GET',
            '/merchant/payments',
            undefined,
            queryString,
        );
    }

    /**
     * Make HMAC-signed API request
     */
    private async _makeAuthenticatedRequest<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: CreateOrderRequestBody,
        query?: string,
    ): Promise<T> {
        const timestamp = getCurrentTimestamp();
        const nonce = generateNonce();

        // Create HMAC signature
        const signature = createHSPSignature({
            method,
            path,
            query,
            body,
            timestamp,
            nonce,
            appSecret: this.config.appSecret,
        });

        // Build headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-App-Key': this.config.appKey,
            'X-Timestamp': timestamp.toString(),
            'X-Nonce': nonce,
            'X-Signature': signature,
        };

        console.log("headers:", headers);
        console.log("body:", body);

        // Build URL
        const url = new URL(this.config.baseUrl);
        url.pathname = `/api/v1${path}`;
        if (query) {
            url.search = query;
        }

        // Make request
        const response = await fetch(url.toString(), {
            method,
            headers,
            body: body ? `${JSON.stringify(body, null, 2)}` : undefined,
        });

        if (!response.ok) {
            console.log('HSP API error response:', await response.text());
            throw new Error(`HSP API error: ${response.status}`);
        }

        return response.json();
    }
}

/**
 * Helper to format amount in token decimals
 * E.g., formatAmount(10.50, 6) = "10500000" for USDT
 */
export function formatAmount(value: number, decimals: number): string {
    return Math.floor(value * Math.pow(10, decimals)).toString();
}

/**
 * Helper to format amount for display
 * E.g., formatDisplayAmount(10.50) = "10.50"
 */
export function formatDisplayAmount(value: number): string {
    return value.toFixed(2);
}
