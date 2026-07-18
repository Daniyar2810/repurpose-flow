import { NextRequest, NextResponse } from 'next/server';
import { extractCoreContent, generatePlatformOutputs } from '@/lib/ai';
import { parseWebUrl, extractYouTubeId, parseYouTubeTranscript } from '@/lib/parser';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, sourceType, rawContent, tone, userId } = body;

    if (!rawContent || !sourceType) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik (rawContent, sourceType)' },
        { status: 400 }
      );
    }

    let textToProcess = rawContent;
    let finalSourceType = sourceType; // DB'ye doğru türü kaydetmek için değişken oluşturduk

    // Eğer kullanıcı URL girdiyse (Web sitesi veya YouTube)
    if (sourceType === 'url') {
      try {
        const youtubeId = extractYouTubeId(rawContent);

        if (youtubeId) {
          // YouTube Linki ise türü 'youtube' yap ve altyazısını çek
          finalSourceType = 'youtube';
          textToProcess = await parseYouTubeTranscript(rawContent);
        } else {
          // Normal Web Sayfası ise metnini çek
          textToProcess = await parseWebUrl(rawContent);
        }
      } catch (parseError: any) {
        return NextResponse.json(
          { error: `İçerik okunamadı: ${parseError.message}` },
          { status: 400 }
        );
      }
    }

    // 1. Çekirdek içerik analizi (Core Extraction)
    const coreJSON = await extractCoreContent(textToProcess);

    // 2. Paralel platform çıktısı üretimi
    const platformOutputs = await generatePlatformOutputs(coreJSON, tone || 'Profesyonel');

    // 3. Supabase DB Kaydı
    let projectId: string | null = null;
    if (userId) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
         {
            user_id: userId,
            // Statik başlık yerine dinamik ve akıllı başlık yapısını ekledik:
            title: title && title.startsWith('http') 
              ? (finalSourceType === 'youtube' ? `YouTube Videosu (${title.slice(0, 25)}...)` : `Web Makalesi (${title.slice(0, 25)}...)`) 
              : (title || 'Düz Metin Dönüşümü'),
            source_type: finalSourceType,
            raw_content: textToProcess,
          },
        ])
        .select()
        .single();

      if (projectError) {
        console.error('PROJE KAYIT HATASI (SUPABASE):', projectError.message);
        return NextResponse.json({ error: `Projeyi kaydederken hata oluştu: ${projectError.message}` }, { status: 500 });
      }

      if (projectData) {
        projectId = projectData.id;

        const outputsToInsert = platformOutputs.map((out) => ({
          project_id: projectId,
          platform: out.platform,
          generated_text: out.content,
        }));

        const { error: outputsError } = await supabase.from('outputs').insert(outputsToInsert);
        
        if (outputsError) {
          console.error('ÇIKTI KAYIT HATASI (SUPABASE):', outputsError.message);
        }
      }
    } else {
      console.warn('UYARI: userId gönderilmediği için veritabanına kayıt yapılmadı.');
    }

    return NextResponse.json({
      success: true,
      projectId,
      extractedLength: textToProcess.length,
      outputs: platformOutputs,
    });
  } catch (error: any) {
    console.error('Genel API Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
