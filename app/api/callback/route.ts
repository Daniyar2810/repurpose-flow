import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    const formData = await req.formData();
    const token = formData.get('token'); // iyzico'nun döndürdüğü ödeme tokenı

    if (!userId || !token) {
      return NextResponse.redirect(new URL('/?payment=failed', req.url));
    }

    // Gerçek uygulamada burada iyzico'dan token sorgulaması (retrieve) yapılır. 
    // Biz şu an simülasyon ve hızlı MVP için doğrudan veritabanını güncelliyoruz:
    
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({ user_id: userId, status: 'premium', updated_at: new Date() }, { onConflict: 'user_id' });

    if (error) {
      console.error('Abonelik kaydedilirken hata:', error.message);
      return NextResponse.redirect(new URL('/?payment=failed', req.url));
    }

    // Başarılıysa ana sayfaya başarı parametresiyle yönlendir
    return NextResponse.redirect(new URL('/?payment=success', req.url));

  } catch (error) {
    return NextResponse.redirect(new URL('/?payment=failed', req.url));
  }
}