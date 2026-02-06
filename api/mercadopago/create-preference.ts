// Vercel Serverless Function for Mercado Pago
// This API route creates a payment preference

import type { VercelRequest, VercelResponse } from '@vercel/node';

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

interface PreferenceRequest {
  appointmentId: string;
  title: string;
  description: string;
  price: number;
  clientEmail: string;
  clientName: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Mercado Pago not configured' });
  }

  try {
    const { appointmentId, title, description, price, clientEmail, clientName } = req.body as PreferenceRequest;

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const preference = {
      items: [
        {
          id: appointmentId,
          title: title,
          description: description,
          quantity: 1,
          currency_id: 'MXN',
          unit_price: price,
        },
      ],
      payer: {
        email: clientEmail,
        name: clientName,
      },
      back_urls: {
        success: `${baseUrl}/client?payment=success`,
        failure: `${baseUrl}/client?payment=failure`,
        pending: `${baseUrl}/client?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: appointmentId,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Mercado Pago error:', error);
      return res.status(500).json({ error: 'Failed to create preference' });
    }

    const data = await response.json();

    return res.status(200).json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error creating preference:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
