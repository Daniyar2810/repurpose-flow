import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// 1. Aşama: Ham metinden çekirdek veri çıkarma (Core Extraction)
export async function extractCoreContent(rawText: string) {
  // Groq token limitine takılmamak için çok uzun metinleri (YouTube altyazıları vb.) ilk 6000 karakterle sınırla
  const maxChars = 6000;
  const truncatedText = rawText.length > maxChars ? rawText.substring(0, maxChars) + '...' : rawText;

  const prompt = `
  Sana verilen metni analiz et ve aşağıdaki bilgileri JSON formatında çıkar:
  1. "summary": Metnin 2-3 cümlelik ana özeti.
  2. "key_takeaways": En önemli 3-5 ders/ipucu (dizi olarak).
  3. "quotes": Varsa dikkat çekici alıntılar (dizi olarak).
  4. "subtopics": Metindeki ana 3-5 alt başlık (dizi olarak).

  Sadece geçerli bir JSON objesi döndür. Ekstra açıklama yazma.
  `;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: truncatedText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

// 2. Aşama: Paralel Prompt Matrisi (Platformlara Özgü Üretim)
export async function generatePlatformOutputs(coreData: any, tone: string) {
  const platforms = ['linkedin', 'x', 'newsletter', 'shorts'] as const;

  const tasks = platforms.map(async (platform) => {
    const systemPrompt = buildSystemPrompt(platform, tone);

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(coreData) },
      ],
      temperature: 0.7,
    });

    return {
      platform,
      content: response.choices[0].message.content || '',
    };
  });

  return await Promise.all(tasks);
}

function buildSystemPrompt(platform: string, tone: string): string {
  const antiClicheRules = `
  NEGATİF KISITLAMALAR (ASLA KULLANMA):
  - "Dijital çağda", "Günümüz dünyasında", "Ezber bozan", "Liderlik sırları" gibi jenerik kalıpları asla kullanma.
  - Cümleleri kısa tut. Edilgen çatı yerine etken çatı kullan.
  - Seçilen Ton: ${tone}
  `;

  switch (platform) {
    case 'linkedin':
      return `LinkedIn için profesyonel ama merak uyandıran bir gönderi oluştur. İlk 2 satırda güçlü bir kanca (hook) olsun. Bol satır boşluğu kullan. Türkçe yaz. ${antiClicheRules}`;
    case 'x':
      return `X (Twitter) için 4-5 tweetlik bir Thread oluştur. Her tweet max 280 karakter olmalı ve "1/", "2/" şeklinde numaralandırılmalı. Türkçe yaz. ${antiClicheRules}`;
    case 'newsletter':
      return `E-posta bülteni formatında yaz. İlgi çekici bir Konu Başlığı (Subject Line), samimi bir giriş, ana fikirler ve eylem çağrısı (CTA) ekle. Türkçe yaz. ${antiClicheRules}`;
    case 'shorts':
      return `YouTube Shorts / Reels için 30-60 saniyelik video senaryosu yaz. 0-3. sn Kanca, 3-45. sn Anlatım, ayrıca köşeli parantez içinde [B-roll görsel ipuçları] ekle. Türkçe yaz. ${antiClicheRules}`;
    default:
      return '';
  }
}