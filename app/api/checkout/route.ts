import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
// Doğru kullanım:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Kullanıcı bilgileri eksik' }, { status: 400 });
    }

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
            unit_amount: 10000, // Stripe cent/kuruş mantığı çalışır. 100.00 TL için 10000 yazıyoruz.
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      client_reference_id: userId, // Ödemeyi yapan kullanıcının ID'sini Stripe'a geçiyoruz
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?payment=failed`,
    });

    return NextResponse.json({ paymentUrl: session.url });

  } catch (error: any) {
    console.error('Stripe Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
  