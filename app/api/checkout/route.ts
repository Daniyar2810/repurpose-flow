import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27',
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Kullanıcı bilgileri eksik' }, { status: 400 });
    }

    // İstek atan kaynağı (origin) yakalıyoruz (localhost veya Vercel canlı linki)
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: '10 Adet Ek Kullanım Hakkı (Kredi)',
              description: 'RepurposeFlow üzerinde 10 yeni içerik dönüştürme hakkı tanımlar.',
            },
            unit_amount: 10000, // 100.00 TL
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      client_reference_id: userId,
      
      // Dinamik URL: Kullanıcı hangi ortamdaysa oraya geri döner
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=failed`,
    });

    return NextResponse.json({ paymentUrl: session.url });

  } catch (error: any) {
    console.error('Stripe Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
