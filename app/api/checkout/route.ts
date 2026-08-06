import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// API versiyonunu siliyoruz, Stripe otomatik olarak kendi sürümünü kullanacak:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Kullanıcı bilgileri eksik' }, { status: 400 });
    }

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
            unit_amount: 10000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      client_reference_id: userId,
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=failed`,
    });

    return NextResponse.json({ paymentUrl: session.url });

  } catch (error: any) {
    console.error('Stripe Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
