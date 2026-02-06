// Mercado Pago Integration
// This file contains utilities for integrating with Mercado Pago checkout

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

export interface PaymentPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface CreatePreferenceData {
  appointmentId: string;
  title: string;
  description: string;
  price: number;
  clientEmail: string;
  clientName: string;
}

// Create a payment preference (should be called from a backend API)
export async function createPaymentPreference(data: CreatePreferenceData): Promise<PaymentPreference | null> {
  try {
    const response = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment preference');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment preference:', error);
    return null;
  }
}

// Load Mercado Pago SDK
export function loadMercadoPagoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load MercadoPago SDK'));
    document.head.appendChild(script);
  });
}

// Initialize Mercado Pago checkout
export async function initMercadoPagoCheckout(preferenceId: string): Promise<void> {
  await loadMercadoPagoSDK();

  if (!MP_PUBLIC_KEY) {
    console.error('Mercado Pago public key not configured');
    return;
  }

  const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
    locale: 'es-MX',
  });

  const checkout = mp.checkout({
    preference: {
      id: preferenceId,
    },
    autoOpen: true,
  });

  return checkout;
}

// Webhook handler types
export interface MercadoPagoWebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

export interface PaymentInfo {
  id: number;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded';
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payer: {
    email: string;
  };
  external_reference: string; // appointmentId
}

// Declare global window type for MercadoPago
declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale: string }) => {
      checkout: (options: {
        preference: { id: string };
        autoOpen?: boolean;
      }) => void;
    };
  }
}
