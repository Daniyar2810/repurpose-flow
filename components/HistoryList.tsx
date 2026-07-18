'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, FileText, Globe, Video, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
}

// userId prop'unu buraya ekledik
export default function HistoryList({ 
  userId, 
  onSelectProject 
}: { 
  userId: string; 
  onSelectProject: (id: string) => void; 
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProjects();
    }
  }, [userId]); // userId değiştikçe veya geldikçe tetiklenecek

  const fetchProjects = async () => {
    setLoading(true);
    // Sadece mevcut giriş yapmış kullanıcıya ait projeleri çekiyoruz (.eq('user_id', userId))
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, source_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Globe size={16} className="text-blue-400" />;
      case 'youtube':
        return <Video size={16} className="text-red-400" />;
      default:
        return <FileText size={16} className="text-emerald-400" />;
    }
  };

  if (loading) {
    return <div className="text-slate-500 text-sm p-4">Geçmiş yükleniyor...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-slate-500 text-sm p-4 border border-slate-800 rounded-lg text-center">
        Henüz kaydedilmiş bir dönüştürme geçmişi yok.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Clock size={14} /> Geçmiş Projeler
      </h3>
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-left transition group"
          >
            <div className="flex items-center gap-2.5 truncate">
              {getIcon(p.source_type)}
              <span className="text-xs text-slate-300 truncate font-medium">{p.title}</span>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-300 transition" />
          </button>
        ))}
      </div>
    </div>
  );
}