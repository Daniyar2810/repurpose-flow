'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Loader2, LogOut, User } from 'lucide-react';
import HistoryList from '@/components/HistoryList';
import Auth from '@/components/Auth';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sourceType, setSourceType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState('Profesyonel');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('linkedin');
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Hak (Kredi) Sayısı State'i
  const [credits, setCredits] = useState<number | null>(null);

  // Veritabanından Kullanıcı Kredisini Çeken Fonksiyon
  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Kredi yüklenirken hata oluştu:', err);
    }
  };

  // Oturum Durumunu Dinle ve Krediyi Getir
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user?.id) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserCredits(session.user.id);
      } else {
        setCredits(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

// Ödeme Başarı/Başarısız Parametrelerini Dinle ve Krediyi Güncelle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (!paymentStatus || !session?.user?.id) return;

    const handlePaymentResult = async () => {
      if (paymentStatus === 'success') {
        // 1. Önce güncel krediyi alıp üstüne 10 ekleyerek veritabanını güncelliyoruz
        try {
          // Mevcut krediyi oku
          const { data: profileData } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', session.user.id)
            .single();

          const currentCredits = profileData?.credits ?? 0;
          const newCredits = currentCredits + 10;

          // Üzerine 10 ekleyip kaydet
          await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', session.user.id);

          // Arayüzdeki (state) krediyi güncelle
          setCredits(newCredits);

          alert('Tebrikler! 10 Ek Kullanım Hakkı başarıyla hesabınıza tanımlandı. 🚀');
        } catch (err) {
          console.error('Kredi yüklenirken hata oluştu:', err);
        }
      } else if (paymentStatus === 'failed') {
        alert('Ödeme sırasında bir hata oluştu, lütfen tekrar deneyin.');
      }

      // 2. SİHİRLİ DOKUNUŞ: Tarayıcı URL'sindeki "?payment=success" kısmını temizliyoruz.
      // Böylece sayfa her render olduğunda bu useEffect tekrar tekrar tetiklenip döngüye girmeyecek!
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.pathname);
    };

    handlePaymentResult();
  }, [session]); // Sadece oturum doğrulandığında bir kez çalışır
  const handleCheckout = async () => {
    if (!session?.user?.id) return alert('Lütfen önce giriş yapın.');
    
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: session.user.id, 
          email: session.user.email 
        })
      });
      
      const data = await res.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('Ödeme başlatılamadı: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      alert('İstek gönderilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) return alert('Lütfen bir içerik veya URL girin!');
    if (!session?.user?.id) return alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
    if (credits !== null && credits <= 0) return alert('Kullanım hakkınız kalmadı! Lütfen yeni kredi satın alın.');
    
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceType === 'url' ? content : content.slice(0, 30) + '...',
          sourceType,
          rawContent: content,
          tone,
          userId: session.user.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.outputs);
        setRefreshKey((prev) => prev + 1);

        // --- DATABASE VE FRONTEND'DEN 1 HAK DÜŞME ALANI ---
        // 1. Veritabanında (Supabase) kullanıcının kredisini 1 azaltıyoruz
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits: (credits || 1) - 1 })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Kredi düşülürken veritabanı hatası:', updateError);
        }

        // 2. Arayüzdeki (State) hakkı anlık olarak 1 eksiltiyoruz
        setCredits((prev) => (prev !== null ? prev - 1 : 0));
        // --------------------------------------------------

      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err) {
      alert('İstek gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  const handleSelectProject = async (projectId: string) => {
    setLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('profiles')
        .select('raw_content, source_type')
        .eq('id', projectId)
        .single();

      if (!projectError && projectData) {
        setContent(projectData.raw_content);
        setSourceType(projectData.source_type === 'youtube' ? 'url' : projectData.source_type);
      }

      const { data: outputsData, error: outputsError } = await supabase
        .from('outputs')
        .select('platform, generated_text')
        .eq('project_id', projectId);

      if (outputsError) throw outputsError;

      if (outputsData) {
        const formattedOutputs = outputsData.map((item) => ({
          platform: item.platform,
          content: item.generated_text,
        }));
        setResults(formattedOutputs);
        if (formattedOutputs.length > 0) {
          setActiveTab(formattedOutputs[0].platform);
        }
      }
    } catch (err: any) {
      alert('Geçmiş proje yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeContent = results.find((r) => r.platform === activeTab)?.content || '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setResults([]);
    setContent('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <Loader2 className="animate-spin text-indigo-500 mr-2" size={20} /> Yükleniyor...
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={() => setRefreshKey((prev) => prev + 1)} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sol Panel: Geçmiş & Profil Bilgisi */}
        <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 h-fit space-y-4">
          
          {/* Kullanıcı Profil Bilgisi */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 truncate">
              <div className="bg-slate-800 p-1.5 rounded-lg text-slate-300">
                <User size={16} />
              </div>
              <span className="text-xs text-slate-400 truncate max-w-[120px]" title={session.user.email}>
                {session.user.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-rose-400 transition"
              title="Çıkış Yap"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Ödeme Başlatma Butonu */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition shadow-lg shadow-orange-500/10 disabled:opacity-50"
          >
            {checkoutLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              '⚡ 10 Ek Hak Satın Al (100 TL)'
            )}
          </button>

          <HistoryList 
            key={refreshKey} 
            userId={session.user.id} 
            onSelectProject={handleSelectProject} 
          />
        </div>

        {/* Sağ Panel: Ana Alan */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles size={14} /> RepurposeFlow AI v1.2
            </div>
            <h1 className="text-3xl font-bold tracking-tight">İçeriğini Tüm Platformlara Dönüştür</h1>
            <p className="text-slate-400 text-sm">
              Uzun metinleri, Web linklerini veya YouTube videolarını tek tıkla sosyal medya paketine çevir.
            </p>
          </header>

          {/* Girdi Kutusu */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex gap-4 border-b border-slate-800 pb-2">
              <button
                onClick={() => setSourceType('text')}
                className={`pb-2 text-xs font-semibold tracking-wider uppercase ${sourceType === 'text' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400'}`}
              >
                Düz Metin
              </button>
              <button
                onClick={() => setSourceType('url')}
                className={`pb-2 text-xs font-semibold tracking-wider uppercase ${sourceType === 'url' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400'}`}
              >
                Link (Web / YouTube)
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={sourceType === 'text' ? 'Metnini buraya yapıştır...' : 'https://youtube.com/watch?v=... veya https://wikipedia.org/...'}
              className="w-full h-36 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none"
            />

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Ton:</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
                >
                  <option value="Profesyonel">Profesyonel 💼</option>
                  <option value="Samimi/Akıcı">Samimi / Akıcı 😊</option>
                  <option value="Akademik">Akademik 🎓</option>
                  <option value="Provokatif">Provokatif 🔥</option>
                </select>
              </div>

              {/* Dönüştür Butonu ve Yanındaki Hak Alanı */}
              <div className="flex items-center gap-3">
                <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-slate-400 font-medium">
                  Kalan Hak: <span className="text-indigo-400 font-bold">{credits !== null ? credits : '...'}</span>
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={loading || (credits !== null && credits <= 0)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {credits !== null && credits <= 0 ? 'Hakkınız Bitti' : 'Dönüştür'}
                </button>
              </div>
            </div>
          </div>

          {/* Çıktı Kutuları */}
          {results.length > 0 && (
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex gap-1.5 overflow-x-auto">
                  {results.map((r) => (
                    <button
                      key={r.platform}
                      onClick={() => setActiveTab(r.platform)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                        activeTab === r.platform ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r.platform}
                    </button>
                  ))}
                </div>

                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition shrink-0"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-[180px] whitespace-pre-wrap text-xs text-slate-300 leading-relaxed font-sans">
                {activeContent}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}