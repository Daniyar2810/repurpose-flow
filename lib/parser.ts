import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Verilen bir Web URL'sinden (Blog/Haber) temiz metni çeker.
 */
export async function parseWebUrl(url: string): Promise<string> {
  try {
    let formattedUrl = url.trim();

    // Kullanıcı protokol yazmadıysa varsayılan olarak https:// ekle
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Sayfa çekilemedi. HTTP Kodu: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Reklamlar, menüler, footer ve script'leri temizle
    $('script, style, nav, footer, header, iframe, noscript, svg, button').remove();

    // Öncelikli olarak makale ana gövdesini (article/main) hedefle
    let articleText = $('article').text() || $('main').text();

    // Eğer article veya main bulunamazsa paragraf metinlerini topla
    if (!articleText.trim()) {
      const paragraphs: string[] = [];
      $('p').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 30) { // Kısa kalıp metinleri ele
          paragraphs.push(text);
        }
      });
      articleText = paragraphs.join('\n\n');
    }

    // Gereksiz boşlukları ve satır başlarını temizle
    const cleanedText = articleText
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) {
      throw new Error('Web sayfasından anlamlı bir metin çıkarılamadı.');
    }

    return cleanedText;
  } catch (error: any) {
    throw new Error(`URL Okuma Hatası: ${error.message}`);
  }
}

/**
 * YouTube Linkinden Video ID'sini ayıklar.
 */
export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * YouTube Linki veya ID'sinden videonun altyazı metnini çeker.
 */
export async function parseYouTubeTranscript(videoUrlOrId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrlOrId);
    if (!transcript || transcript.length === 0) {
      throw new Error('Videoda altyazı bulunamadı.');
    }

    const fullText = transcript.map((item) => item.text).join(' ');
    return fullText;
  } catch (error: any) {
    throw new Error(`YouTube Altyazı Çekme Hatası: ${error.message}`);
  }
}