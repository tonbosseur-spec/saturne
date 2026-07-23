import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Questionnaire } from '../types';
import { ArrowLeft, Settings2, BarChart3, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { getStoredQuestionnaireData } from '../lib/storage';

export default function QuestionnaireDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const company = questionnaire?.company_name || 'Exceller chez Pierre';
    if (questionnaire?.title) {
      document.title = `${company} - ${questionnaire.title}`;
    } else {
      document.title = company;
    }
  }, [questionnaire?.title, questionnaire?.company_name]);

  useEffect(() => {
    fetchQuestionnaire();
  }, [id]);

  const fetchQuestionnaire = async () => {
    if (!id) return;
    try {
      let loaded = false;
      try {
        const { data, error } = await supabase
          .from('questionnaires')
          .select('*')
          .or(`id.eq.${id},dashboard_token.eq.${id}`)
          .maybeSingle();

        if (!error && data) {
          setQuestionnaire(data);
          loaded = true;
        }
      } catch (sbErr) {
        console.warn('Supabase fetch failed in QuestionnaireDetail:', sbErr);
      }

      if (!loaded) {
        const localData = getStoredQuestionnaireData(id);
        if (localData && localData.questionnaire) {
          setQuestionnaire(localData.questionnaire);
          loaded = true;
        } else if (id === 'demo-id') {
          setQuestionnaire({
            id: 'demo-id',
            title: 'Questionnaire de Démo',
            description: 'Un questionnaire de démonstration',
            status: 'draft',
            dashboard_token: 'demo-token'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center flex-col gap-4">
        <p className="text-neutral-500">Questionnaire introuvable.</p>
        <Link to="/" className="text-blue-600 hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const publicLink = `${window.location.origin}/f/${questionnaire.id}`;
  const analyticsSharedLink = questionnaire.dashboard_token 
    ? `${window.location.origin}/shared-dashboard/${questionnaire.dashboard_token}`
    : '';

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      {/* Top Nav */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-neutral-900">{questionnaire.title}</h1>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${questionnaire.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {questionnaire.status === 'published' ? 'Publié' : 'Brouillon'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-8">
        
        {/* Quick Links / Actions */}
        <div className="grid sm:grid-cols-2 gap-6">
          
          {/* Edit Card */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-start">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Settings2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Éditeur</h2>
            <p className="text-sm text-neutral-500 mb-6 flex-1">Modifiez les questions, le design et les paramètres de votre questionnaire.</p>
            <Link 
              to={`/builder/${questionnaire.id}`}
              className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Ouvrir l'éditeur
            </Link>
          </div>

          {/* Analytics Card */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-start">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Tableau de bord</h2>
            <p className="text-sm text-neutral-500 mb-6 flex-1">Consultez les réponses, exportez les données en Excel/CSV et analysez les résultats.</p>
            <Link 
              to={`/analytics/${questionnaire.id}`}
              className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Voir les résultats
            </Link>
          </div>

        </div>

        {/* Share Section */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-8">
          
          {/* Public Form Link */}
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Partager le questionnaire</h2>
            <p className="text-sm text-neutral-500 mb-4">Envoyez ce lien à vos participants pour qu'ils puissent y répondre.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600 font-mono break-all">
                {publicLink}
              </div>
              <button
                onClick={() => copyToClipboard(publicLink)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Copié !' : 'Copier'}
              </button>
              <a
                href={publicLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir
              </a>
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Public Dashboard Link */}
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Lien de rapport public</h2>
            <p className="text-sm text-neutral-500 mb-4">Partagez ce lien sécurisé pour donner un accès en lecture seule aux analytiques.</p>
            {analyticsSharedLink ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600 font-mono break-all">
                  {analyticsSharedLink}
                </div>
                <button
                  onClick={() => copyToClipboard(analyticsSharedLink)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
                <a
                  href={analyticsSharedLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir
                </a>
              </div>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                Vous devez enregistrer le questionnaire une première fois pour générer le lien de partage du tableau de bord.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
