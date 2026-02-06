// Vercel Serverless Function for Mercado Pago Webhook
// This handles payment notifications from Mercado Pago

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    // We only care about payment notifications
    if (type !== 'payment') {
      return res.status(200).json({ received: true });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment ID' });
    }

    // Fetch payment details from Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment details');
      return res.status(500).json({ error: 'Failed to fetch payment' });
    }

    const payment = await paymentResponse.json();
    const appointmentId = payment.external_reference;
    const status = payment.status;

    if (!appointmentId) {
      console.error('No appointment ID in payment');
      return res.status(400).json({ error: 'Missing appointment reference' });
    }

    // Update appointment in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let paymentStatus: 'pending' | 'paid' | 'refunded' = 'pending';
    if (status === 'approved') {
      paymentStatus = 'paid';
    } else if (status === 'refunded') {
      paymentStatus = 'refunded';
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: paymentStatus,
        payment_id: paymentId.toString(),
        payment_method: 'online',
      })
      .eq('id', appointmentId);

    if (error) {
      console.error('Failed to update appointment:', error);
      return res.status(500).json({ error: 'Failed to update appointment' });
    }

    // Create payment record
    await supabase.from('payments').insert({
      appointment_id: appointmentId,
      amount: payment.transaction_amount,
      payment_method: 'online',
      payment_provider: 'mercadopago',
      payment_provider_id: paymentId.toString(),
      status: paymentStatus === 'paid' ? 'completed' : paymentStatus,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
