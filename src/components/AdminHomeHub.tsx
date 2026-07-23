import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured, getSupabaseCredentials } from '../lib/supabase';
import { Questionnaire } from '../types';
import { FileText, Plus, Search, Trash2, Edit3, BarChart2, Check, Loader2, Link as LinkIcon, Share2, Users, LayoutGrid, BarChart3, Database, ShieldCheck, Settings, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from './GlassCard';
import { getStoredQuestionnaires, deleteStoredQuestionnaire, saveStoredQuestionnaire, getStoredQuestionnaireData } from '../lib/storage';
import { syncAllLocalQuestionnairesToSupabase, syncQuestionnaireToSupabase } from '../lib/supabaseSync';
import SupabaseSettingsModal from './SupabaseSettingsModal';

export default function AdminHomeHub() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'forms' | 'dashboards'>('forms');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Questionnaire | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    setLoading(true);
    try {
      let sbList: Questionnaire[] = [];
      const supabaseActive = isSupabaseConfigured();

      if (supabaseActive) {
        try {
          const { data, error } = await supabase
            .from('questionnaires')
            .select('*, responses(count)')
            .order('updated_at', { ascending: false });

          if (!error && data) {
            sbList = data;
          }
        } catch (err) {
          console.warn('Supabase query failed:', err);
        }
      }

      let merged: Questionnaire[] = [];
      if (supabaseActive) {
        merged = sbList.map(q => ({
          ...q,
          responses: q.responses || [{ count: 0 }]
        }));
      } else {
        const localList = getStoredQuestionnaires();
        const map = new Map<string, Questionnaire>();
        for (const q of localList) {
          if (q.id && q.id !== 'demo-id') map.set(q.id, q);
        }
        merged = Array.from(map.values());
      }
      
      // Seulement si aucune donnée ET que Supabase n'est PAS du tout configuré, afficher le demo-id
      if (merged.length === 0 && !supabaseActive) {
        merged = [
          {
            id: 'demo-id',
            title: 'Questionnaire de Satisfaction (Exemple)',
            description: 'Exemple de démonstration. Connectez votre base Supabase pour créer vos propres questionnaires.',
            status: 'published',
            company_name: 'Acme Corp',
            created_at: new Date().toISOString(),
            responses: [{ count: 124 }],
            dashboard_token: 'demo-token'
          }
        ];
      }

      setQuestionnaires(merged);
    } catch (error) {
      console.error('Error fetching questionnaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestionnaire = async (id: string) => {
    try {
      if (!isSupabaseConfigured()) {
        deleteStoredQuestionnaire(id);
      } else {
        await supabase.from('questionnaires').delete().eq('id', id);
      }
      setQuestionnaires(prev => prev.filter(q => q.id !== id));
      setFormToDelete(null);
      showToast('Questionnaire supprimé avec succès.');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Erreur lors de la suppression.');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncAll = async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncAllLocalQuestionnairesToSupabase();
      if (result.errorCount === 0) {
        showToast(`✅ ${result.syncedCount} questionnaire(s) synchronisé(s) vers Supabase !`);
      } else {
        showToast(`⚠️ ${result.syncedCount} sync, ${result.errorCount} erreur(s). Voir détails.`);
        if (result.messages.length > 0) {
          alert("Résultats de la synchronisation Supabase :\n\n" + result.messages.join("\n"));
        }
      }
      await fetchQuestionnaires();
    } catch (err: any) {
      alert("Erreur lors de la synchronisation : " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSingle = async (q: Questionnaire) => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseModalOpen(true);
      return;
    }

    setSyncingId(q.id || null);
    try {
      // Get full local data including settings, sections, questions
      const fullData = getStoredQuestionnaireData(q.id || '');
      const settings = fullData?.settings || { main_color: '#3B82F6', background_color: '#F8FAFC' };
      const sections = fullData?.sections || [];
      const questions = fullData?.questions || [];

      const res = await syncQuestionnaireToSupabase(q, settings, sections, questions);
      if (res.success) {
        showToast(`✅ "${q.title}" synchronisé avec succès sur Supabase !`);
        await fetchQuestionnaires();
      } else {
        alert(`Échec de la synchronisation Supabase pour "${q.title}" :\n\n${res.message}`);
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const copyFormLink = (q: Questionnaire) => {
    const link = `${window.location.origin}/f/${q.custom_slug || q.id}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Lien du questionnaire copié !');
    });
  };

  const copyDashboardLink = async (q: Questionnaire) => {
    let token = q.dashboard_token;
    
    if (!token) {
      token = Math.random().toString(36).substring(2, 15);
      const updatedQ = { ...q, dashboard_token: token };
      
      if (!isSupabaseConfigured()) {
        saveStoredQuestionnaire(updatedQ);
      }

      if (q.id !== 'demo-id' && isSupabaseConfigured()) {
        try {
          await supabase
            .from('questionnaires')
            .update({ dashboard_token: token })
            .eq('id', q.id);
        } catch (e) {
          console.warn('Error updating dashboard token on Supabase:', e);
        }
      }
      
      setQuestionnaires(questionnaires.map(item => 
        item.id === q.id ? { ...item, dashboard_token: token } : item
      ));
    }

    const link = `${window.location.origin}/shared-dashboard/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Lien du Dashboard copié !');
    });
  };

  const filteredQuestionnaires = questionnaires.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (q.company_name && q.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans pb-16">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast Notification (Top Right) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-xl border border-white/40 text-slate-800 rounded-2xl shadow-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-bold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 relative z-10 space-y-8">
        
        {/* Header Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-lg">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              {viewMode === 'forms' ? 'Tous les Formulaires' : 'Tous les Dashboards'}
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              {viewMode === 'forms' 
                ? 'Consultez, modifiez et partagez vos questionnaires en toute simplicité.' 
                : 'Accédez aux statistiques et résultats d’analyse en temps réel.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Supabase Status Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm border transition-all ${
                isSupabaseConfigured()
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 animate-pulse'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>{isSupabaseConfigured() ? 'Supabase Connecté' : 'Lier Supabase'}</span>
              <Settings className="w-3.5 h-3.5 opacity-60 ml-1" />
            </motion.button>

            {/* Sync All Button if Supabase configured */}
            {isSupabaseConfigured() && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50"
                title="Synchroniser tous les formulaires locaux vers Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser tout'}</span>
              </motion.button>
            )}

            {/* View Toggle Tabs */}
            <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('forms')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  viewMode === 'forms'
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Tous les Formulaires</span>
              </button>

              <button
                onClick={() => setViewMode('dashboards')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  viewMode === 'dashboards'
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Tous les Dashboards</span>
              </button>
            </div>

            {/* Create Button */}
            <motion.div whileTap={{ scale: 0.95 }}>
              <Link 
                to="/builder"
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-md hover:shadow-xl overflow-hidden"
              >
                <Plus className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Nouveau Questionnaire</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Supabase Connection Warning Banner if not configured */}
        {!isSupabaseConfigured() && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-300/60 rounded-3xl p-6 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Liez votre propre base de données Supabase</h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5 max-w-2xl leading-relaxed">
                  Pour enregistrer directement vos formulaires et recevoir les réponses dans votre base de données en temps réel, renseignez votre <strong>Project URL</strong> et votre <strong>Anon Key</strong>.
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurer Supabase
            </motion.button>
          </div>
        )}

        {/* Search Bar & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par titre, entreprise ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all"
            />
          </div>

          <div className="text-sm font-semibold text-slate-500 bg-white/50 px-4 py-2.5 rounded-2xl border border-white/50 w-fit">
            {filteredQuestionnaires.length} {filteredQuestionnaires.length > 1 ? 'éléments' : 'élément'}
          </div>
        </div>

        {/* Main Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          </div>
        ) : filteredQuestionnaires.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-5 shadow-inner border border-white/50">
              <FileText className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Aucun élément trouvé</h2>
            <p className="text-slate-500 mb-6 max-w-sm">
              {searchQuery ? "Essayez d'autres termes de recherche." : "Vous n'avez pas encore créé de questionnaire. Commencez dès maintenant !"}
            </p>
            {!searchQuery && (
              <motion.div whileTap={{ scale: 0.95 }}>
                <Link 
                  to="/builder"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Créer un questionnaire
                </Link>
              </motion.div>
            )}
          </GlassCard>
        ) : viewMode === 'forms' ? (
          /* FORMS VIEW GRID */
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredQuestionnaires.map((q) => {
              const responseCount = q.responses?.[0]?.count || 0;
              const createdDate = q.created_at ? new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récent';
              
              return (
                <motion.div key={q.id} variants={itemVariants}>
                  <div className="h-full flex flex-col p-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl rounded-3xl hover:bg-white/90 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1.5 ${
                        q.status === 'published' 
                          ? 'bg-emerald-100/70 text-emerald-700 border border-emerald-200/50' 
                          : 'bg-slate-100/70 text-slate-600 border border-slate-200/50'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${q.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {q.status === 'published' ? 'Publié' : 'Brouillon'}
                      </div>

                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setFormToDelete(q)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                    
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-800 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{q.title || 'Sans titre'}</h3>
                      {q.company_name ? (
                        <p className="text-sm font-medium text-slate-500">{q.company_name}</p>
                      ) : q.description ? (
                        <p className="text-xs text-slate-400 line-clamp-2">{q.description}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucune description</p>
                      )}
                    </div>
                    
                    {/* Metrics */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-6">
                      <span className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg border border-white/60">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {responseCount} {responseCount > 1 ? 'réponses' : 'réponse'}
                      </span>
                      <span className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg border border-white/60">
                        {createdDate}
                      </span>
                    </div>

                    <div className="mt-auto space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/builder/${q.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                        >
                          <Edit3 className="w-4 h-4" />
                          Modifier
                        </motion.button>
                        
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyFormLink(q)}
                          className="flex items-center justify-center px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-bold rounded-xl transition-all text-xs"
                          title="Copier le lien public du formulaire"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </motion.button>

                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSyncSingle(q)}
                          disabled={syncingId === q.id}
                          className="flex items-center justify-center px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 font-bold rounded-xl transition-all text-xs disabled:opacity-50"
                          title="Pousser ce questionnaire vers Supabase"
                        >
                          {syncingId === q.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <UploadCloud className="w-4 h-4" />
                          )}
                        </motion.button>

                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/analytics/${q.id}`)}
                          className="flex items-center justify-center px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 font-bold rounded-xl transition-all text-xs"
                          title="Voir le Dashboard"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* DASHBOARDS VIEW GRID */
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredQuestionnaires.map((q) => {
              const responseCount = q.responses?.[0]?.count || 0;
              
              return (
                <motion.div key={q.id} variants={itemVariants}>
                  <div className="h-full flex flex-col p-6 bg-white/80 backdrop-blur-xl border border-indigo-100/60 shadow-xl rounded-3xl hover:bg-white transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        Dashboard
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-800 line-clamp-1 mb-1">{q.title || 'Sans titre'}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {q.company_name ? `${q.company_name} — ` : ''}{q.description || 'Analytiques et réponses en temps réel.'}
                      </p>
                    </div>

                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Réponses collectées</p>
                        <p className="text-2xl font-extrabold text-slate-800">{responseCount}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="mt-auto space-y-2">
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/analytics/${q.id}`)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 text-sm"
                      >
                        <BarChart2 className="w-4 h-4" />
                        Ouvrir le Dashboard
                      </motion.button>

                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyDashboardLink(q)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs"
                        >
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                          Copier lien public
                        </motion.button>

                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/builder/${q.id}`)}
                          className="flex items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-all text-xs"
                          title="Éditer le questionnaire"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {formToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-red-100">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Supprimer ce formulaire ?</h3>
                <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                  Voulez-vous vraiment supprimer <span className="font-semibold text-slate-700">"{formToDelete.title}"</span> ? Cette action est irréversible et toutes les réponses associées seront supprimées.
                </p>
                <div className="flex gap-4">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormToDelete(null)}
                    className="flex-1 py-3.5 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors text-sm"
                  >
                    Annuler
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => deleteQuestionnaire(formToDelete.id!)}
                    className="flex-1 py-3.5 font-bold text-white bg-red-500 hover:bg-red-600 rounded-2xl transition-colors shadow-lg shadow-red-500/20 text-sm"
                  >
                    Supprimer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={() => {
          fetchQuestionnaires();
          showToast('Configuration Supabase mise à jour !');
        }}
      />
    </div>
  );
}
