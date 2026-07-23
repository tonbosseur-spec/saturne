import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Question } from '../types';
import { Loader2, ArrowLeft, Users, FileText, BarChart3, TrendingUp, Share2, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStoredQuestionnaireData } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export default function DashboardAnalytics() {
  const { id, token } = useParams<{ id?: string, token?: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  const [isCopied, setIsCopied] = useState(false);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  useEffect(() => {
    if (questionnaire?.title) {
      document.title = `Exceller chez Pierre + ${questionnaire.title}`;
    } else {
      document.title = 'Exceller chez Pierre';
    }
  }, [questionnaire?.title]);

  useEffect(() => {
    let targetId = id;
    let subscription: any = null;

    async function fetchData() {
      if (!id && !token) {
        setError('ID ou token du questionnaire manquant.');
        setLoading(false);
        return;
      }
      
      try {
        // En mode démo explicite seulement
        if ((id === 'demo-id' || token === 'demo-token') && !isSupabaseConfigured()) {
          setQuestionnaire({ id: 'demo-id', title: 'Questionnaire de Satisfaction (Démo)', description: 'Analyse des résultats', dashboard_token: null });
          const fakeQuestions: Question[] = [
            { id: '1', type: 'text', label: 'Quel est votre âge ?', display_order: 0, is_required: true },
            { id: '2', type: 'multiple_choice', label: 'Quel est votre niveau de satisfaction global ?', display_order: 1, is_required: true },
            { id: '3', type: 'checkbox', label: 'Quels produits utilisez-vous régulièrement ?', display_order: 2, is_required: false }
          ];
          setQuestions(fakeQuestions);
          
          setResponses([
            { payload: { '1': '25', '2': 'Très satisfait', '3': ['Produit A', 'Produit B'] } },
            { payload: { '1': '34', '2': 'Satisfait', '3': ['Produit A'] } },
            { payload: { '1': '28', '2': 'Très satisfait', '3': ['Produit C'] } },
            { payload: { '1': '42', '2': 'Neutre', '3': ['Produit B', 'Produit C'] } },
            { payload: { '1': '19', '2': 'Satisfait', '3': ['Produit A'] } },
            { payload: { '1': 'non renseigné', '2': 'Très satisfait', '3': ['Produit A', 'Produit B', 'Produit C'] } },
          ]);
          setLoading(false);
          return;
        }

        // 1. Fetch Questionnaire
        let qData, qError;
        if (token) {
          const res = await supabase
            .from('questionnaires')
            .select('id, title, description, dashboard_token')
            .eq('dashboard_token', token)
            .single();
          qData = res.data;
          qError = res.error;
          if (qData) targetId = qData.id;
        } else {
          const res = await supabase
            .from('questionnaires')
            .select('id, title, description, dashboard_token')
            .eq('id', id)
            .single();
          qData = res.data;
          qError = res.error;
        }
          
        if (qError || !qData) {
          const localData = getStoredQuestionnaireData(id || token || '');
          if (localData && localData.questionnaire) {
            setQuestionnaire(localData.questionnaire);
            setQuestions(localData.questions || []);
            setResponses([]);
            setLoading(false);
            return;
          }
          if (qError) throw qError;
        }
        setQuestionnaire(qData);
        
        // 2. Fetch Questions
        const { data: qsData, error: qsError } = await supabase
          .from('questions')
          .select('*')
          .eq('questionnaire_id', targetId)
          .order('display_order', { ascending: true });
          
        if (qsError) throw qsError;
        setQuestions(qsData || []);

        // 3. Fetch Responses
        let respData = null;
        let respError = null;

        const r1 = await supabase
          .from('responses')
          .select('*')
          .eq('questionnaire_id', targetId);

        if (!r1.error) {
          respData = r1.data;
        } else {
          const r2 = await supabase
            .from('response')
            .select('*')
            .eq('questionnaire_id', targetId);
          if (!r2.error) {
            respData = r2.data;
          } else {
            respError = r1.error || r2.error;
          }
        }

        if (respError) throw respError;
        setResponses(respData || []);

        // 4. Setup Realtime Subscription
        try {
          const channelName = `responses_${targetId}_${Date.now()}`;
          const channel = supabase.channel(channelName);

          channel.on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'responses',
            filter: `questionnaire_id=eq.${targetId}`
          }, (payload) => {
            if (payload && payload.new) {
              setResponses(current => [...current, payload.new]);
            }
          });

          channel.subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn(`Supabase Realtime channel status: ${status}`);
            }
          });

          subscription = channel;
        } catch (rtErr) {
          console.warn('Supabase Realtime setup failed:', rtErr);
        }
        
      } catch (err: any) {
        console.error('Erreur lors du chargement des analytiques:', err);
        setError('Impossible de charger les données analytiques.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [id, token]);

  const togglePublicSharing = async (currentStatus: boolean) => {
    setIsUpdatingToken(true);
    try {
      const newToken = currentStatus ? null : Math.random().toString(36).substring(2, 15);
      
      if (questionnaire.id !== 'demo-id') {
        const { error } = await supabase
          .from('questionnaires')
          .update({ dashboard_token: newToken })
          .eq('id', questionnaire.id);
          
        if (error) throw error;
      }
      
      setQuestionnaire({ ...questionnaire, dashboard_token: newToken });
    } catch (err) {
      console.error('Error toggling public share:', err);
      alert('Erreur lors de la modification du partage public.');
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const copyPublicLink = () => {
    if (!questionnaire.dashboard_token) return;
    const link = `${window.location.origin}/shared-dashboard/${questionnaire.dashboard_token}`;
    navigator.clipboard.writeText(link).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !questionnaire) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full ring-1 ring-neutral-200">
          <p className="text-red-500 font-medium">{error}</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const totalResponses = responses.length;

  const calculateNumericStats = (values: number[]) => {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    let median = 0;
    if (count % 2 === 1) {
      median = sorted[Math.floor(count / 2)];
    } else {
      const mid1 = sorted[count / 2 - 1];
      const mid2 = sorted[count / 2];
      median = (mid1 + mid2) / 2;
    }

    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    let histogramData: { bin: string; count: number }[] = [];
    const uniqueVals = Array.from(new Set(sorted));

    if (uniqueVals.length <= 8) {
      const countsMap: Record<number, number> = {};
      sorted.forEach(v => { countsMap[v] = (countsMap[v] || 0) + 1; });
      histogramData = Object.entries(countsMap).map(([val, cnt]) => ({
        bin: String(val),
        count: cnt,
      }));
    } else {
      const binCount = Math.min(7, Math.max(4, Math.floor(Math.sqrt(count))));
      const range = max - min;
      const step = range / binCount;

      const bins = Array.from({ length: binCount }, (_, i) => {
        const start = min + i * step;
        const end = i === binCount - 1 ? max : start + step;
        return {
          start,
          end,
          label: `${Number(start.toFixed(1))} à ${Number(end.toFixed(1))}`,
          count: 0
        };
      });

      sorted.forEach(v => {
        let placed = false;
        for (let i = 0; i < bins.length; i++) {
          if (i === bins.length - 1 ? (v >= bins[i].start && v <= bins[i].end) : (v >= bins[i].start && v < bins[i].end)) {
            bins[i].count++;
            placed = true;
            break;
          }
        }
        if (!placed) bins[bins.length - 1].count++;
      });

      histogramData = bins.map(b => ({
        bin: b.label,
        count: b.count
      }));
    }

    return {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      histogramData,
      count
    };
  };

  const processDataForQuestion = (q: Question) => {
    const answers = responses.map(r => r.payload[q.id]).filter(a => a !== undefined && a !== null && String(a).trim() !== '');
    const answeredCount = answers.length;
    
    if (answeredCount === 0) {
      return { type: 'empty', summary: "Aucune réponse pour cette question." };
    }

    if (q.type === 'multiple_choice' || q.type === 'checkbox' || q.type === 'select') {
      const counts: Record<string, number> = {};
      answers.forEach(a => {
        if (Array.isArray(a)) {
          a.forEach(val => {
            const label = val === '__OTHER__' ? 'Autre' : val;
            counts[label] = (counts[label] || 0) + 1;
          });
        } else {
          const label = a === '__OTHER__' ? 'Autre' : a;
          counts[label] = (counts[label] || 0) + 1;
        }
      });

      const chartData = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const topAnswer = chartData[0];
      const percentage = Math.round((topAnswer.value / ((q.type === 'checkbox') ? totalResponses : answeredCount)) * 100);
      const summary = `${percentage}% des répondants ont choisi "${topAnswer.name}".`;

      return { type: 'categorical', chartData, summary, answeredCount };
    }

    const numValues = answers.map(a => parseFloat(a)).filter(n => !isNaN(n));
    const isNumericType = q.type === 'number';
    const isMostlyNumericText = q.type === 'text' && numValues.length > 0 && numValues.length >= answers.length * 0.7;

    if (isNumericType || isMostlyNumericText) {
      if (numValues.length > 0) {
        const stats = calculateNumericStats(numValues);
        return { 
          type: 'numeric', 
          stats,
          summary: `Données numériques : Moyenne de ${stats?.mean} (min: ${stats?.min}, max: ${stats?.max})`,
          answeredCount
        };
      }
    }

    // Default for short text, date, email, etc.
    const textAnswers = answers.map(a => Array.isArray(a) ? a.join(', ') : String(a));
    return { 
      type: 'text_short', 
      answers: textAnswers,
      summary: `${textAnswers.length} réponse(s) textuelle(s) collectée(s)`,
      answeredCount
    };
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-12 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-full shadow-xl"
          >
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">Lien copié dans le presse-papier</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {!token && (
              <Link to="/" className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">{questionnaire.title}</h1>
              <p className="text-sm text-neutral-500">Analytiques et résultats</p>
            </div>
          </div>

          {/* Action de partage public */}
          {!token && questionnaire && (
            <div className="flex items-center bg-white p-1.5 rounded-2xl border border-neutral-200 shadow-sm">
              {!questionnaire.dashboard_token ? (
                <button 
                  onClick={() => togglePublicSharing(false)}
                  disabled={isUpdatingToken}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors"
                >
                  {isUpdatingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  Activer le partage public
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">Public</span>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-200">
                    <span className="text-xs text-neutral-500 truncate max-w-[100px] sm:max-w-[200px] select-all">
                      {window.location.origin}/shared-dashboard/{questionnaire.dashboard_token}
                    </span>
                    <button
                      onClick={copyPublicLink}
                      className="p-1.5 hover:bg-white rounded-md text-neutral-500 hover:text-blue-600 transition-colors"
                      title="Copier le lien public"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-px h-6 bg-neutral-200 mx-1" />
                  
                  <button
                    onClick={() => togglePublicSharing(true)}
                    disabled={isUpdatingToken}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      questionnaire.dashboard_token ? 'bg-emerald-500' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        questionnaire.dashboard_token ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-5">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total des réponses</p>
              <p className="text-3xl font-bold text-neutral-900">{totalResponses}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-5">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Questions posées</p>
              <p className="text-3xl font-bold text-neutral-900">{questions.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-5">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Taux de réponse moyen</p>
              <p className="text-3xl font-bold text-neutral-900">
                {questions.length > 0 && totalResponses > 0
                  ? Math.round((questions.reduce((acc, q) => {
                      const ans = responses.filter(r => r.payload[q.id]).length;
                      return acc + (ans / totalResponses);
                    }, 0) / questions.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Questions Analysis */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neutral-400" />
            Analyse détaillée par question
          </h2>
          
          {questions.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 shadow-sm">
              Aucune question à analyser.
            </div>
          ) : totalResponses === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 shadow-sm">
              En attente de réponses pour générer les graphiques.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {questions.map((q, idx) => {
                const analysis = processDataForQuestion(q);
                
                return (
                  <div key={q.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-neutral-100 flex-grow">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-neutral-100 text-xs font-bold text-neutral-500 shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <h3 className="text-base font-semibold text-neutral-900 leading-snug">{q.label}</h3>
                      </div>
                      
                      {analysis.type === 'empty' ? (
                        <p className="text-neutral-400 text-sm italic">{analysis.summary}</p>
                      ) : (
                        <>
                          <div className="mb-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                            <p className="text-sm font-medium text-blue-900">{analysis.summary}</p>
                            <p className="text-xs text-blue-600/70 mt-1">{analysis.answeredCount} réponse(s)</p>
                          </div>

                          {analysis.type === 'categorical' && analysis.chartData && (
                            <div className="space-y-4">
                              {/* Graphique à barres horizontales */}
                              <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={analysis.chartData} 
                                    layout="vertical" 
                                    margin={{ top: 5, right: 25, left: 5, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis 
                                      dataKey="name" 
                                      type="category" 
                                      width={110} 
                                      tick={{ fontSize: 12, fill: '#334155' }} 
                                      axisLine={false} 
                                      tickLine={false}
                                      tickFormatter={(val) => (typeof val === 'string' && val.length > 14 ? `${val.substring(0, 14)}...` : val)}
                                    />
                                    <Tooltip 
                                      cursor={{ fill: '#f8fafc' }} 
                                      formatter={(value: number) => [value, 'Réponses']}
                                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                      {analysis.chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Légende détaillée */}
                              <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/80 space-y-2">
                                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                                  Légende et détail des choix
                                </p>
                                <div className="space-y-2">
                                  {analysis.chartData.map((item, index) => {
                                    const total = analysis.answeredCount || totalResponses || 1;
                                    const pct = Math.round((item.value / total) * 100);
                                    const color = COLORS[index % COLORS.length];

                                    return (
                                      <div key={item.name} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                                          <span className="font-medium text-neutral-800 break-words leading-tight" title={item.name}>
                                            {item.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 font-medium">
                                          <span className="text-neutral-500 text-xs">{item.value} {item.value > 1 ? 'réponses' : 'réponse'}</span>
                                          <span className="px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-800 text-xs font-semibold shadow-2xs">
                                            {pct}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {analysis.type === 'numeric' && analysis.stats && (
                            <div className="space-y-5">
                              {/* Metrics bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">Moyenne</span>
                                  <span className="text-base font-black text-slate-800">{analysis.stats.mean}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">Médiane</span>
                                  <span className="text-base font-black text-slate-800">{analysis.stats.median}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">Min</span>
                                  <span className="text-base font-black text-slate-800">{analysis.stats.min}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">Max</span>
                                  <span className="text-base font-black text-slate-800">{analysis.stats.max}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center col-span-2 sm:col-span-1">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">Écart-type</span>
                                  <span className="text-base font-black text-slate-800">{analysis.stats.stdDev}</span>
                                </div>
                              </div>

                              {/* Histogram */}
                              <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Histogramme de distribution</p>
                                <div className="h-48 w-full bg-slate-50/50 p-2 rounded-2xl border border-slate-200/80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.stats.histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                      <Tooltip 
                                        cursor={{ fill: '#f1f5f9' }} 
                                        formatter={(value: number) => [value, 'Fréquence']}
                                        labelFormatter={(label) => `Tranche / Valeur : ${label}`}
                                        contentStyle={{ borderRadius: '12px', borderColor: '#cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                      />
                                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          )}

                          {analysis.type === 'text_short' && analysis.answers && (
                            <div className="space-y-3">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Liste des réponses ({analysis.answers.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                {analysis.answers.map((ans: string, idxAns: number) => (
                                  <div
                                    key={idxAns}
                                    className="bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/90 text-slate-800 p-3 rounded-2xl rounded-tl-xs shadow-2xs transition-all flex items-start gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                    <p className="text-xs sm:text-sm font-medium leading-relaxed line-clamp-3 break-words">
                                      {ans}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
