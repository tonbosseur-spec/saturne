import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ShieldCheck, Code, RefreshCw, X } from 'lucide-react';
import { getSupabaseCredentials, testSupabaseConnection } from '../lib/supabase';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SupabaseSettingsModal({ isOpen, onClose }: SupabaseSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const creds = getSupabaseCredentials();

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const sqlSchema = `-- SCRIPT SQL POUR INITIALISER LA BASE DE DONNÉES SUPABASE
-- Copiez-collez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)

-- 1. Table des questionnaires
CREATE TABLE IF NOT EXISTS questionnaires (
  id TEXT PRIMARY KEY,
  admin_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  company_name TEXT,
  status TEXT DEFAULT 'published',
  dashboard_token TEXT UNIQUE,
  custom_slug TEXT UNIQUE,
  estimated_duration INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assurer la présence des colonnes indispensables si la table existait déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='questionnaires' AND column_name='estimated_duration'
    ) THEN
        ALTER TABLE questionnaires ADD COLUMN estimated_duration INT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='questionnaires' AND column_name='custom_slug'
    ) THEN
        ALTER TABLE questionnaires ADD COLUMN custom_slug TEXT UNIQUE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Table de configuration visuelle des questionnaires
CREATE TABLE IF NOT EXISTS questionnaire_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id TEXT UNIQUE REFERENCES questionnaires(id) ON DELETE CASCADE,
  logo_url TEXT,
  main_color TEXT DEFAULT '#3B82F6',
  background_color TEXT DEFAULT '#F8FAFC',
  footer_text TEXT,
  header_bg_image TEXT,
  header_opacity NUMERIC DEFAULT 1.0,
  start_button_text TEXT DEFAULT 'Commencer l''expérience',
  show_meta_info BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si la table existait déjà
ALTER TABLE questionnaire_settings ADD COLUMN IF NOT EXISTS start_button_text TEXT DEFAULT 'Commencer l''expérience';
ALTER TABLE questionnaire_settings ADD COLUMN IF NOT EXISTS show_meta_info BOOLEAN DEFAULT true;

-- 3. Table des sections
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  logic_rules JSONB DEFAULT '[]'::jsonb,
  media_url TEXT,
  media_type TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des réponses
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  respondent_info JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer Row Level Security (RLS) et ajouter les politiques publiques
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture et l'écriture publique pour l'accès aux formulaires et réponses
DROP POLICY IF EXISTS "Public questionnaires read" ON questionnaires;
CREATE POLICY "Public questionnaires read" ON questionnaires FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public questionnaires write" ON questionnaires;
CREATE POLICY "Public questionnaires write" ON questionnaires FOR ALL USING (true);

DROP POLICY IF EXISTS "Public settings read" ON questionnaire_settings;
CREATE POLICY "Public settings read" ON questionnaire_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public settings write" ON questionnaire_settings;
CREATE POLICY "Public settings write" ON questionnaire_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public sections read" ON sections;
CREATE POLICY "Public sections read" ON sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public sections write" ON sections;
CREATE POLICY "Public sections write" ON sections FOR ALL USING (true);

DROP POLICY IF EXISTS "Public questions read" ON questions;
CREATE POLICY "Public questions read" ON questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public questions write" ON questions;
CREATE POLICY "Public questions write" ON questions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public responses insert" ON responses;
CREATE POLICY "Public responses insert" ON responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public responses read" ON responses;
CREATE POLICY "Public responses read" ON responses FOR SELECT USING (true);
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Base de données Supabase</h2>
              <p className="text-xs text-slate-500">
                Statut de la connexion & Script SQL d'initialisation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'credentials'
                ? 'border-emerald-500 text-emerald-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Statut de Connexion</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-600 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Script SQL des Tables</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'credentials' ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                creds.isConfigured
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  {creds.isConfigured ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm sm:text-base">
                      {creds.isConfigured ? 'Base de données centralisée active' : 'Supabase non configuré dans .env'}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {creds.isConfigured
                        ? 'L\'application utilise exclusivement la base de données configurée via le fichier d\'environnement (.env). Tous les utilisateurs et navigateurs se connectent automatiquement à cette base.'
                        : 'Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier d\'environnement.'}
                    </p>
                  </div>
                </div>
              </div>

              {creds.isConfigured && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-slate-600 truncate max-w-[350px]">
                      URL : <span className="font-bold text-slate-800">{creds.url}</span>
                    </div>
                    <button
                      onClick={handleTest}
                      disabled={isTesting}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Tester la connexion
                    </button>
                  </div>
                </div>
              )}

              {/* Test Connection Output */}
              {testResult && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Script de création des tables</h3>
                  <p className="text-xs text-slate-500">
                    Copiez et exécutez ce script dans l'Éditeur SQL de votre projet Supabase.
                  </p>
                </div>

                <button
                  onClick={copySql}
                  className="flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedSql ? 'Copié !' : 'Copier le SQL'}
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4">
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-[350px]">
                  {sqlSchema}
                </pre>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
