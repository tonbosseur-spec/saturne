import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, Key, Globe, ShieldCheck, Code, RefreshCw, X, HelpCircle } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, testSupabaseConnection } from '../lib/supabase';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SupabaseSettingsModal({ isOpen, onClose, onSaved }: SupabaseSettingsModalProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, key);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    saveSupabaseCredentials(url, key);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved();
  };

  const handleReset = () => {
    saveSupabaseCredentials('', '');
    setUrl('');
    setKey('');
    setTestResult(null);
    if (onSaved) onSaved();
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
  estimated_duration INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assurer la présence de estimated_duration si la table existait déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='questionnaires' AND column_name='estimated_duration'
    ) THEN
        ALTER TABLE questionnaires ADD COLUMN estimated_duration INT;
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assurer la contrainte d'unicité si la table existait déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questionnaire_settings_questionnaire_id_key'
    ) THEN
        ALTER TABLE questionnaire_settings ADD CONSTRAINT questionnaire_settings_questionnaire_id_key UNIQUE (questionnaire_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Table des sections
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  display_order INT DEFAULT 0,
  conditional_logic JSONB,
  is_completion_section BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assurer la présence des nouvelles colonnes si la table existait déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='sections' AND column_name='conditional_logic'
    ) THEN
        ALTER TABLE sections ADD COLUMN conditional_logic JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='sections' AND column_name='is_completion_section'
    ) THEN
        ALTER TABLE sections ADD COLUMN is_completion_section BOOLEAN DEFAULT FALSE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Table des questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  section_id TEXT,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description_text TEXT,
  question_code TEXT,
  validation_rules JSONB,
  conditional_logic JSONB,
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  options JSONB DEFAULT '[]'::jsonb,
  has_other_option BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des réponses soumises
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE CASCADE,
  respondent_id TEXT,
  payload JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activation RLS & Politiques de sécurité d'accès public (lecture & écriture)
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow public insert questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow public update questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow public delete questionnaires" ON questionnaires;

CREATE POLICY "Allow public read questionnaires" ON questionnaires FOR SELECT USING (true);
CREATE POLICY "Allow public insert questionnaires" ON questionnaires FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update questionnaires" ON questionnaires FOR UPDATE USING (true);
CREATE POLICY "Allow public delete questionnaires" ON questionnaires FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read questionnaire_settings" ON questionnaire_settings;
DROP POLICY IF EXISTS "Allow public insert questionnaire_settings" ON questionnaire_settings;
DROP POLICY IF EXISTS "Allow public update questionnaire_settings" ON questionnaire_settings;
DROP POLICY IF EXISTS "Allow public delete questionnaire_settings" ON questionnaire_settings;

CREATE POLICY "Allow public read questionnaire_settings" ON questionnaire_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert questionnaire_settings" ON questionnaire_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update questionnaire_settings" ON questionnaire_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete questionnaire_settings" ON questionnaire_settings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read sections" ON sections;
DROP POLICY IF EXISTS "Allow public insert sections" ON sections;
DROP POLICY IF EXISTS "Allow public update sections" ON sections;
DROP POLICY IF EXISTS "Allow public delete sections" ON sections;

CREATE POLICY "Allow public read sections" ON sections FOR SELECT USING (true);
CREATE POLICY "Allow public insert sections" ON sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update sections" ON sections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete sections" ON sections FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert questions" ON questions;
DROP POLICY IF EXISTS "Allow public update questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete questions" ON questions;

CREATE POLICY "Allow public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update questions" ON questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete questions" ON questions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read responses" ON responses;
DROP POLICY IF EXISTS "Allow public insert responses" ON responses;
DROP POLICY IF EXISTS "Allow public delete responses" ON responses;

CREATE POLICY "Allow public read responses" ON responses FOR SELECT USING (true);
CREATE POLICY "Allow public insert responses" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete responses" ON responses FOR DELETE USING (true);

-- 7. Octroyer les droits d'accès généraux pour les rôles 'anon' et 'authenticated'
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    });
  };

  const creds = getSupabaseCredentials();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 my-8"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Lier votre Base de Données Supabase</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Connectez votre propre projet Supabase pour enregistrer vos formulaires et réponses en temps réel.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors relative z-10"
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
            <Key className="w-4 h-4" />
            <span>Identifiants API</span>
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
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm sm:text-base">
                      {creds.isConfigured ? 'Supabase est configuré' : 'Supabase non configuré'}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {creds.isConfigured 
                        ? `Source: ${creds.source === 'local' ? 'Configuration locale (navigateur)' : 'Variables d\'environnement'}`
                        : 'Entrez l\'URL et la clé anonyme de votre projet Supabase ci-dessous.'}
                    </p>
                  </div>
                </div>

                {creds.isConfigured && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-red-600 underline font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    Supabase Project URL
                  </span>
                  <span className="text-xs text-slate-400 font-normal">Ex: https://xyz.supabase.co</span>
                </label>
                <input
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white font-mono text-sm transition-all"
                />
              </div>

              {/* Key Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    Supabase Anon / Public Key
                  </span>
                  <span className="text-xs text-slate-400 font-normal">Clé publique 'anon'</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white font-mono text-xs transition-all"
                />
              </div>

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

              {saveSuccess && (
                <div className="p-3 bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Identifiants Supabase enregistrés avec succès !
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleTest}
                  disabled={isTesting || !url || !key}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-sm rounded-2xl transition-all"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Tester la connexion
                </button>

                <button
                  onClick={handleSave}
                  disabled={!url || !key}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  Enregistrer & Appliquer
                </button>
              </div>

              {/* Help tip */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-blue-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  Où trouver vos identifiants Supabase ?
                </div>
                <p className="opacity-90 leading-relaxed">
                  Connectez-vous sur <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold">supabase.com</a> &gt; Sélectionnez votre projet &gt; Allez dans <strong>Project Settings &gt; API</strong>. Vous y trouverez l'<strong>Project URL</strong> et la clé <strong>anon public</strong>.
                </p>
              </div>
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
