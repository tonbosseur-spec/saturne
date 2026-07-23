import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncQuestionnaireToSupabase } from '../lib/supabaseSync';
import { Questionnaire, QuestionnaireSettings, Question, QuestionType, Section } from '../types';
import {
  Palette, ListChecks, Save, Plus, Trash2, GripVertical, Image as ImageIcon,
  Loader2, Check, Settings2, FileText, Type, CheckSquare, List, Download,
  ArrowLeft, Hash, Eye, EyeOff, PanelRightClose, PanelRightOpen, Copy,
  ExternalLink, Layers, Building2, HelpCircle, Share2, ArrowUp, ArrowDown,
  Sparkles, Sliders, ChevronDown, ChevronRight, X, Database, AlertCircle, Settings,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DataExport from './DataExport';
import SupabaseSettingsModal from './SupabaseSettingsModal';
import { getStoredQuestionnaireData, saveStoredQuestionnaire } from '../lib/storage';
import { RichTextEditor } from './RichTextEditor';

const GOOGLE_FONTS = [
  { name: 'Plus Jakarta Sans', font: "'Plus Jakarta Sans', sans-serif" },
  { name: 'Inter', font: "'Inter', sans-serif" },
  { name: 'Playfair Display', font: "'Playfair Display', serif" },
  { name: 'Outfit', font: "'Outfit', sans-serif" },
  { name: 'Poppins', font: "'Poppins', sans-serif" },
  { name: 'Roboto', font: "'Roboto', sans-serif" },
];

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Layout & Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'style' | 'settings' | 'navigation' | 'export'>('style');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'editor' | 'settings' | 'preview'>('editor');

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(!id);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Question & Section state expansion
  const [expandedAdvancedId, setExpandedAdvancedId] = useState<string | null>(null);
  const [expandedSectionLogicId, setExpandedSectionLogicId] = useState<string | null>(null);

  const defaultFormId = useRef(id && id !== 'demo-id' ? id : crypto.randomUUID()).current;

  // Core Form State
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    id: defaultFormId,
    title: 'Mon Nouveau Questionnaire',
    description: 'Une brève description pour introduire le questionnaire aux participants.',
    company_name: 'Mon Entreprise',
    status: 'draft',
    dashboard_token: Math.random().toString(36).substring(2, 15),
  });

  const [settings, setSettings] = useState<QuestionnaireSettings>({
    logo_url: '',
    main_color: '#2563eb',
    background_color: '#f8fafc',
    footer_text: '© 2026 Votre Entreprise - Tous droits réservés.',
    header_bg_image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop',
    header_opacity: 0.85,
  });

  const [fontFamily, setFontFamily] = useState<string>("'Plus Jakarta Sans', sans-serif");

  const initialSectionId = crypto.randomUUID();
  const [sections, setSections] = useState<Section[]>([
    {
      id: initialSectionId,
      title: 'Section 1 : Informations Générales',
      description: 'Merci de remplir vos informations ci-dessous.',
      display_order: 0,
    },
    {
      id: 'default-completion-sec',
      title: 'Merci pour vos réponses !',
      description: '<p>Vos informations ont été enregistrées en toute sécurité.</p>',
      display_order: 1,
      is_completion_section: true
    }
  ]);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: crypto.randomUUID(),
      section_id: initialSectionId,
      type: 'text',
      label: 'Quel est votre nom complet ?',
      description_text: 'Nom et prénom professionnels',
      display_order: 0,
      is_required: true,
      question_code: 's1q1'
    },
    {
      id: crypto.randomUUID(),
      section_id: initialSectionId,
      type: 'multiple_choice',
      label: 'Quel est votre niveau global de satisfaction ?',
      description_text: 'Sélectionnez une réponse',
      display_order: 1,
      is_required: true,
      options: [
        { id: 'opt-1', label: 'Extrêmement satisfait' },
        { id: 'opt-2', label: 'Moyennement satisfait' },
        { id: 'opt-3', label: 'Insatisfait' }
      ],
      question_code: 's1q2'
    }
  ]);

  useEffect(() => {
    if (id) {
      fetchQuestionnaireData();
    }
  }, [id]);

  // Always keep local storage updated in real-time if Supabase is not configured
  useEffect(() => {
    if (hasLoadedData && questionnaire && questionnaire.id && !isSupabaseConfigured()) {
      saveStoredQuestionnaire(questionnaire, settings, sections, questions);
    }
  }, [hasLoadedData, questionnaire, settings, sections, questions]);

  const fetchQuestionnaireData = async () => {
    if (!id || id === 'demo-id') return;
    setIsLoadingData(true);
    try {
      let fetchedFromSupabase = false;
      try {
        const { data: qData, error: qError } = await supabase
          .from('questionnaires')
          .select('*')
          .eq('id', id)
          .single();

        if (!qError && qData) {
          setQuestionnaire(qData);
          fetchedFromSupabase = true;

          const { data: sData } = await supabase
            .from('questionnaire_settings')
            .select('*')
            .eq('questionnaire_id', id)
            .single();
          if (sData) setSettings(sData);

          const { data: qsData } = await supabase
            .from('questions')
            .select('*')
            .eq('questionnaire_id', id)
            .order('display_order', { ascending: true });
          const loadedQuestions = qsData || [];
          if (loadedQuestions.length > 0) setQuestions(loadedQuestions);

          const { data: secData } = await supabase
            .from('sections')
            .select('*')
            .eq('questionnaire_id', id)
            .order('display_order', { ascending: true });

          let loadedSections = secData || [];
          if (loadedSections.length === 0 && loadedQuestions.length > 0) {
            const uniqueSectionIds = Array.from(new Set(loadedQuestions.map((q: any) => q.section_id).filter(Boolean)));
            if (uniqueSectionIds.length > 0) {
              loadedSections = uniqueSectionIds.map((secId, idx) => ({
                id: secId as string,
                questionnaire_id: id,
                title: `Section ${idx + 1}`,
                description: '',
                display_order: idx
              }));
            }
          }

          if (loadedSections.length === 0) {
            loadedSections = [{
              id: initialSectionId,
              title: 'Section 1 : Informations Générales',
              description: 'Merci de remplir vos informations ci-dessous.',
              display_order: 0,
            }];
          }

          const mapped = loadedSections.map((s: any) => ({
            ...s,
            is_completion_section: s.is_completion_section || s.conditional_logic?.is_completion_section || false
          }));

          if (!mapped.some((s: any) => s.is_completion_section)) {
            mapped.push({
              id: 'default-completion-sec',
              title: 'Merci pour vos réponses !',
              description: '<p>Vos informations ont été enregistrées en toute sécurité.</p>',
              display_order: mapped.length,
              is_completion_section: true
            });
          }
          setSections(mapped);
        }
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local storage:', err);
      }

      if (!fetchedFromSupabase && !isSupabaseConfigured()) {
        const localData = getStoredQuestionnaireData(id);
        if (localData && localData.questionnaire) {
          setQuestionnaire(localData.questionnaire);
          if (localData.settings) setSettings(localData.settings);
          if (localData.sections && localData.sections.length > 0) {
            const loadedSecs = [...localData.sections];
            if (!loadedSecs.some(s => s.is_completion_section)) {
              loadedSecs.push({
                id: 'default-completion-sec',
                title: 'Merci pour vos réponses !',
                description: '<p>Vos informations ont été enregistrées en toute sécurité.</p>',
                display_order: loadedSecs.length,
                is_completion_section: true
              });
            }
            setSections(loadedSecs);
          } else {
            setSections([
              {
                id: initialSectionId,
                title: 'Section 1 : Informations Générales',
                description: 'Merci de remplir vos informations ci-dessous.',
                display_order: 0,
              },
              {
                id: 'default-completion-sec',
                title: 'Merci pour vos réponses !',
                description: '<p>Vos informations ont été enregistrées en toute sécurité.</p>',
                display_order: 1,
                is_completion_section: true
              }
            ]);
          }
          if (localData.questions && localData.questions.length > 0) setQuestions(localData.questions);
        }
      } else if (!fetchedFromSupabase && isSupabaseConfigured()) {
        setErrorMessage('Impossible de charger le questionnaire depuis Supabase.');
      }
    } catch (error) {
      console.error('Error fetching questionnaire data:', error);
      setErrorMessage('Erreur lors du chargement du questionnaire.');
    } finally {
      setIsLoadingData(false);
      setHasLoadedData(true);
    }
  };

  // Recalculate question codes (s1q1, s1q2...) dynamically
  useEffect(() => {
    let hasChanges = false;
    const newQuestions = questions.map((q) => {
      const sectionIndex = sections.findIndex(s => s.id === q.section_id);
      if (sectionIndex === -1) return q;

      const sectionQuestions = questions
        .filter(sq => sq.section_id === q.section_id)
        .sort((a, b) => a.display_order - b.display_order);
      const questionIndex = sectionQuestions.findIndex(sq => sq.id === q.id);

      const newCode = `s${sectionIndex + 1}q${questionIndex + 1}`;
      if (q.question_code !== newCode) {
        hasChanges = true;
        return { ...q, question_code: newCode };
      }
      return q;
    });

    if (hasChanges) {
      setQuestions(newQuestions);
    }
  }, [questions, sections]);

  // Save Functionality
  const saveToSupabase = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const qId = questionnaire.id || crypto.randomUUID();
      const dbToken = questionnaire.dashboard_token || Math.random().toString(36).substring(2, 15);
      const updatedQuestionnaire: Questionnaire = {
        ...questionnaire,
        id: qId,
        dashboard_token: dbToken,
        updated_at: new Date().toISOString(),
      };

      if (!isSupabaseConfigured()) {
        const savedLocally = saveStoredQuestionnaire(updatedQuestionnaire, settings, sections, questions);
        setQuestionnaire(savedLocally);
        setSaveStatus('success');
        if (!id || id !== savedLocally.id) {
          navigate(`/builder/${savedLocally.id}`, { replace: true });
        }
      } else {
        const syncRes = await syncQuestionnaireToSupabase(updatedQuestionnaire, settings, sections, questions);

        if (syncRes.success) {
          setQuestionnaire(updatedQuestionnaire);
          setSaveStatus('success');
          setErrorMessage('');
          if (!id || id !== updatedQuestionnaire.id) {
            navigate(`/builder/${updatedQuestionnaire.id}`, { replace: true });
          }
        } else {
          console.warn('Supabase sync warning:', syncRes.message);
          setSaveStatus('error');
          setErrorMessage(`Erreur de sauvegarde Supabase : ${syncRes.message}`);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus(prev => (prev === 'success' ? 'idle' : prev));
      }, 4000);
    }
  };

  // Section Management
  const addSection = () => {
    const newSectionId = crypto.randomUUID();
    const newSection: Section = {
      id: newSectionId,
      title: `Section ${sections.length + 1}`,
      description: 'Description de la section',
      display_order: sections.length,
    };
    setSections([...sections, newSection]);

    // Automatically add first question in new section
    setQuestions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        section_id: newSectionId,
        type: 'text',
        label: 'Nouvelle question',
        display_order: 0,
        is_required: false,
      }
    ]);
  };

  const updateSection = (secId: string, updates: Partial<Section>) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, ...updates } : s)));
  };

  const removeSection = (secId: string) => {
    setSections(sections.filter((s) => s.id !== secId));
    setQuestions(questions.filter((q) => q.section_id !== secId));
  };

  // Question Management
  const addQuestion = (sectionId: string, afterQuestionIdOrIndex?: string | number) => {
    const newQuestionId = crypto.randomUUID();
    const newQuestion: Question = {
      id: newQuestionId,
      section_id: sectionId,
      type: 'text',
      label: 'Nouvelle question',
      display_order: 0,
      is_required: false,
    };

    let nextQuestions = [...questions];

    if (typeof afterQuestionIdOrIndex === 'string') {
      const targetIndex = questions.findIndex(q => q.id === afterQuestionIdOrIndex);
      if (targetIndex !== -1) {
        nextQuestions.splice(targetIndex + 1, 0, newQuestion);
      } else {
        nextQuestions.push(newQuestion);
      }
    } else if (typeof afterQuestionIdOrIndex === 'number') {
      const sectionQuestions = questions
        .filter(q => q.section_id === sectionId)
        .sort((a, b) => a.display_order - b.display_order);
      const targetQuestion = sectionQuestions[afterQuestionIdOrIndex];
      if (targetQuestion) {
        const globalIndex = questions.findIndex(q => q.id === targetQuestion.id);
        if (globalIndex !== -1) {
          nextQuestions.splice(globalIndex + 1, 0, newQuestion);
        } else {
          nextQuestions.push(newQuestion);
        }
      } else {
        nextQuestions.push(newQuestion);
      }
    } else {
      // Find last question in this section
      const sectionQuestions = questions
        .filter(q => q.section_id === sectionId)
        .sort((a, b) => a.display_order - b.display_order);
      if (sectionQuestions.length > 0) {
        const lastQuestion = sectionQuestions[sectionQuestions.length - 1];
        const lastGlobalIndex = questions.findIndex(q => q.id === lastQuestion.id);
        if (lastGlobalIndex !== -1) {
          nextQuestions.splice(lastGlobalIndex + 1, 0, newQuestion);
        } else {
          nextQuestions.push(newQuestion);
        }
      } else {
        nextQuestions.push(newQuestion);
      }
    }

    // Reassign display_order based on array order
    const reindexed = nextQuestions.map((q, idx) => ({
      ...q,
      display_order: idx,
    }));

    setQuestions(reindexed);

    setTimeout(() => {
      scrollToElement(`question-${newQuestionId}`);
    }, 150);
  };

  const duplicateQuestion = (q: Question) => {
    const duplicated: Question = {
      ...q,
      id: crypto.randomUUID(),
      label: `${q.label} (Copie)`,
      options: q.options ? q.options.map(o => ({ ...o, id: crypto.randomUUID() })) : undefined,
    };
    const globalIdx = questions.findIndex(item => item.id === q.id);
    const newList = [...questions];
    newList.splice(globalIdx + 1, 0, duplicated);
    const reindexed = newList.map((item, idx) => ({
      ...item,
      display_order: idx,
    }));
    setQuestions(reindexed);

    setTimeout(() => {
      scrollToElement(`question-${duplicated.id}`);
    }, 150);
  };

  const moveQuestion = (qId: string, direction: 'up' | 'down') => {
    const idx = questions.findIndex(q => q.id === qId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questions.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newList = [...questions];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;
    const reindexed = newList.map((item, index) => ({
      ...item,
      display_order: index,
    }));
    setQuestions(reindexed);
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const scrollToElement = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(label);
      setTimeout(() => setCopiedLink(null), 3000);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100/80 font-sans overflow-hidden select-none" style={{ fontFamily }}>
      
      {/* ========================================== */}
      {/* 1. BARRE SUPÉRIEURE (TOP NAVIGATION BAR)   */}
      {/* ========================================== */}
      <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-sm">
        
        {/* Left Section: Back, Title (Click to edit), Status Badge */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Retour au tableau de bord"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="h-5 w-px bg-slate-200/80 hidden sm:block shrink-0" />

          {/* Form Title Direct Editing */}
          <div className="flex items-center gap-1.5 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={questionnaire.title}
                onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                className="px-3 py-1 bg-white border-2 border-blue-500 rounded-xl font-bold text-slate-900 text-xs sm:text-base outline-none shadow-sm max-w-[120px] sm:max-w-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-1 sm:gap-2 font-extrabold text-slate-800 hover:text-blue-600 text-xs sm:text-lg tracking-tight truncate transition-colors text-left max-w-[120px] xs:max-w-[160px] sm:max-w-xs"
                title="Cliquer pour modifier le titre"
              >
                <span className="truncate">{questionnaire.title || 'Mon Questionnaire'}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-blue-500 font-normal shrink-0">✎</span>
              </button>
            )}

            {/* Status Badge Toggle */}
            <button
              onClick={() => setQuestionnaire({
                ...questionnaire,
                status: questionnaire.status === 'published' ? 'draft' : 'published'
              })}
              className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full items-center gap-1 shrink-0 transition-all cursor-pointer hidden sm:flex ${
                questionnaire.status === 'published'
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300/50'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300/50'
              }`}
              title="Cliquer pour changer le statut"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${questionnaire.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{questionnaire.status === 'published' ? 'Publé' : 'Brouillon'}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Preview Toggle, Save Button, Sidebar Collapse Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Supabase Status Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border hidden md:flex ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Statut de la base de données Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{isSupabaseConfigured() ? 'Supabase OK' : 'Supabase non lié'}</span>
            <Settings className="w-3 h-3 opacity-60" />
          </motion.button>

          {/* Quick Preview Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className={`items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border hidden md:flex ${
              isPreviewOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            {isPreviewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-blue-600" />}
            <span className="hidden md:inline">{isPreviewOpen ? 'Masquer aperçu' : 'Aperçu rapide'}</span>
          </motion.button>

          {/* Main Save Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={saveToSupabase}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md focus:outline-none ${
              saveStatus === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="w-3.5 h-3.5 text-emerald-200" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isSaving ? 'Sauvegarde...' : saveStatus === 'success' ? 'Enregistré !' : 'Enregistrer'}
            </span>
          </motion.button>

          <div className="h-5 w-px bg-slate-200/80 hidden md:block shrink-0" />

          {/* Sidebar Collapse Toggle Icon Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl border transition-all hidden md:flex ${
              isSidebarOpen
                ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={isSidebarOpen ? 'Masquer le panneau latéral de réglages' : 'Afficher le panneau latéral de réglages'}
          >
            {isSidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </motion.button>

        </div>
      </header>

      {/* ========================================== */}
      {/* MAIN BODY WORKSPACE (CANVAS + SIDEBAR)     */}
      {/* ========================================== */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ========================================== */}
        {/* 2. ZONE PRINCIPALE (CANVAS CENTRAL)        */}
        {/* ========================================== */}
        <main className={`flex-1 overflow-y-auto px-4 sm:px-8 py-8 pb-24 md:pb-8 transition-all duration-300 ease-in-out ${mobileActiveTab === 'editor' ? 'block' : 'hidden md:block'}`}>
          <div className="max-w-4xl mx-auto space-y-8 pb-32">

            {/* Error / Warning Notification Banner */}
            {saveStatus === 'error' && (
              <div className="p-4 bg-amber-50 text-amber-900 border border-amber-300 rounded-2xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{errorMessage || 'Avertissement lors de la sauvegarde.'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Configurer Supabase
                  </button>
                  <button onClick={() => setSaveStatus('idle')} className="text-amber-600 hover:text-amber-900 font-bold px-2">×</button>
                </div>
              </div>
            )}

            {/* Form Intro Banner Header Card */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-bl-full pointer-events-none" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    Configuration du questionnaire
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {questions.length} {questions.length > 1 ? 'questions' : 'question'} • {sections.length} {sections.length > 1 ? 'sections' : 'section'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Titre du Questionnaire
                  </label>
                  <input
                    type="text"
                    value={questionnaire.title}
                    onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })}
                    className="w-full text-2xl sm:text-3xl font-extrabold text-slate-800 bg-transparent border-b-2 border-slate-200 hover:border-slate-300 focus:border-blue-600 outline-none pb-2 transition-all placeholder-slate-300"
                    placeholder="Saisissez un titre percutant..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description ou consigne aux répondants (Texte enrichi)
                  </label>
                  <RichTextEditor
                    value={questionnaire.description || ''}
                    onChange={(html) => setQuestionnaire({ ...questionnaire, description: html })}
                    placeholder="Saisissez la description du questionnaire (mise en forme gras, titres, couleurs, listes acceptées)..."
                    minHeight="120px"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100/60">
                  <div className="max-w-xs">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Temps de réponse estimé (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder={`Calculé automatiquement (env. ${Math.max(1, Math.ceil(questions.length * 0.5))} min)`}
                      value={questionnaire.estimated_duration || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setQuestionnaire({ ...questionnaire, estimated_duration: val });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Laissez vide pour calculer automatiquement en fonction du nombre de questions (30 sec par question).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTIONS & QUESTIONS LIST */}
            <div className="space-y-10">
              {sections.filter(s => !s.is_completion_section).map((section, sIndex) => {
                const sectionQuestions = questions
                  .filter(q => q.section_id === section.id)
                  .sort((a, b) => a.display_order - b.display_order);

                return (
                  <div 
                    key={section.id} 
                    id={`section-${section.id}`}
                    className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-200/70 relative transition-all"
                  >
                    {/* Section Header */}
                    <div className="space-y-4 pb-4 border-b border-slate-200/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                              Section {sIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => updateSection(section.id, { title: e.target.value })}
                              className="text-xl font-extrabold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none px-1 py-0.5"
                              placeholder="Titre de la section"
                            />
                          </div>

                          <RichTextEditor
                            value={section.description || ''}
                            onChange={(html) => updateSection(section.id, { description: html })}
                            placeholder="Description explicative optionnelle pour cette section..."
                            minHeight="70px"
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        {sections.length > 1 && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeSection(section.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors self-start sm:self-center"
                            title="Supprimer la section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>

                      {/* Section Conditional Logic Toggle & Drawer */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSectionLogicId(expandedSectionLogicId === section.id ? null : section.id)}
                            className={`text-xs font-bold flex items-center gap-2 py-1.5 px-3 rounded-xl transition-all ${
                              section.conditional_logic?.depends_on_code
                                ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs'
                                : 'bg-slate-200/60 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5 text-blue-600" />
                            {section.conditional_logic?.depends_on_code ? (
                              <span>
                                Condition d'affichage : Si <code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-mono text-[11px]">{section.conditional_logic.depends_on_code}</code> = "{section.conditional_logic.equals_value}"
                              </span>
                            ) : (
                              <span>Ajouter un affichage conditionnel à cette section</span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedSectionLogicId === section.id ? 'rotate-180' : ''}`} />
                          </button>

                          {section.conditional_logic?.depends_on_code && (
                            <button
                              type="button"
                              onClick={() => updateSection(section.id, { conditional_logic: undefined })}
                              className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Supprimer la condition
                            </button>
                          )}
                        </div>

                        <AnimatePresence>
                          {expandedSectionLogicId === section.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 overflow-hidden"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                  <Sliders className="w-4 h-4 text-blue-600" />
                                  Afficher la section {sIndex + 1} seulement si :
                                </span>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-600 block mb-1">
                                    Question déclencheuse
                                  </label>
                                  <select
                                    value={section.conditional_logic?.depends_on_code || ''}
                                    onChange={(e) => updateSection(section.id, {
                                      conditional_logic: {
                                        depends_on_code: e.target.value,
                                        equals_value: section.conditional_logic?.equals_value || ''
                                      }
                                    })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                  >
                                    <option value="">-- Choisir une question --</option>
                                    {questions
                                      .filter(q => q.section_id !== section.id)
                                      .map(q => (
                                        <option key={q.id} value={q.question_code || q.id}>
                                          {q.question_code ? `[Code: ${q.question_code}] ` : ''}{q.label.length > 50 ? q.label.substring(0, 50) + '...' : q.label}
                                        </option>
                                      ))}
                                  </select>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400">Code manuel :</span>
                                    <input
                                      type="text"
                                      placeholder="ex: s1q1"
                                      value={section.conditional_logic?.depends_on_code || ''}
                                      onChange={(e) => updateSection(section.id, {
                                        conditional_logic: {
                                          depends_on_code: e.target.value,
                                          equals_value: section.conditional_logic?.equals_value || ''
                                        }
                                      })}
                                      className="px-2 py-0.5 border border-slate-200 rounded text-[11px] font-mono outline-none focus:border-blue-500 w-28 bg-white"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-600 block mb-1">
                                    Est égale à la valeur :
                                  </label>
                                  {(() => {
                                    const selectedCode = section.conditional_logic?.depends_on_code;
                                    const depQ = questions.find(q => q.question_code === selectedCode || q.id === selectedCode);
                                    if (depQ && depQ.options && depQ.options.length > 0) {
                                      return (
                                        <select
                                          value={section.conditional_logic?.equals_value || ''}
                                          onChange={(e) => updateSection(section.id, {
                                            conditional_logic: {
                                              depends_on_code: section.conditional_logic?.depends_on_code || '',
                                              equals_value: e.target.value
                                            }
                                          })}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                        >
                                          <option value="">-- Choisir la valeur option --</option>
                                          {depQ.options.map(opt => (
                                            <option key={opt.id} value={opt.label}>{opt.label}</option>
                                          ))}
                                        </select>
                                      );
                                    }
                                    return (
                                      <input
                                        type="text"
                                        placeholder="ex: Oui"
                                        value={section.conditional_logic?.equals_value || ''}
                                        onChange={(e) => updateSection(section.id, {
                                          conditional_logic: {
                                            depends_on_code: section.conditional_logic?.depends_on_code || '',
                                            equals_value: e.target.value
                                          }
                                        })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                      />
                                    );
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Questions Grid Cards in Section */}
                    <div className="space-y-6">
                      <AnimatePresence initial={false}>
                        {sectionQuestions.map((q, qIndex) => {
                          const isAdvancedOpen = expandedAdvancedId === q.id;

                          return (
                            <motion.div
                              key={q.id}
                              id={`question-${q.id}`}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80 hover:border-blue-300 transition-all space-y-5 relative group"
            >
              {/* Question Card Top Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                
                <div className="flex items-center gap-2">
                  {/* Code Badge (e.g. s1q1) */}
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 shadow-xs">
                    {q.question_code || `s${sIndex + 1}q${qIndex + 1}`}
                  </span>

                  {/* Question Type Badge Selector */}
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-3 py-1 cursor-pointer outline-none transition-all"
                  >
                    <option value="text">Texte Court</option>
                    <option value="number">Numérique</option>
                    <option value="multiple_choice">Choix Unique (Radio)</option>
                    <option value="checkbox">Choix Multiple (Cases)</option>
                    <option value="select">Menu Déroulant</option>
                  </select>
                </div>

                {/* Actions Right: Required, Reorder, Settings, Duplicate, Delete */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  
                                  {/* Required Switch */}
                                  <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={q.is_required}
                                      onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })}
                                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span>Obligatoire</span>
                                  </label>

                                  {/* Move Up / Down */}
                                  <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5">
                                    <button
                                      onClick={() => moveQuestion(q.id, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                                      title="Monter la question"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => moveQuestion(q.id, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                                      title="Descendre la question"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Duplicate Button */}
                                  <button
                                    onClick={() => duplicateQuestion(q)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                    title="Dupliquer la question"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>

                                  {/* Advanced Accordion Toggle Button */}
                                  <button
                                    onClick={() => setExpandedAdvancedId(isAdvancedOpen ? null : q.id)}
                                    className={`p-1.5 rounded-xl transition-colors ${
                                      isAdvancedOpen || q.conditional_logic?.depends_on_code || q.validation_rules
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Réglages avancés & Logique"
                                  >
                                    <Sliders className="w-4 h-4" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => removeQuestion(q.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Supprimer la question"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Question Main Fields: Label & Description */}
                              <div className="space-y-3">
                                <div>
                                  <input
                                    type="text"
                                    value={q.label}
                                    onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                                    className="w-full text-base sm:text-lg font-bold text-slate-800 placeholder-slate-300 border-b border-transparent hover:border-slate-200 focus:border-blue-600 outline-none pb-1 transition-all"
                                    placeholder="Saisissez votre question ici..."
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    value={q.description_text || ''}
                                    onChange={(e) => updateQuestion(q.id, { description_text: e.target.value })}
                                    className="w-full text-xs sm:text-sm text-slate-500 placeholder-slate-300 border-b border-transparent hover:border-slate-200 focus:border-blue-600 outline-none pb-0.5 transition-all"
                                    placeholder="Note d'aide ou sous-titre pour les répondants (optionnel)..."
                                  />
                                </div>
                              </div>

                              {/* OPTIONS LIST FOR MULTIPLE CHOICE / CHECKBOX / SELECT */}
                              {(q.type === 'multiple_choice' || q.type === 'checkbox' || q.type === 'select') && (
                                <div className="space-y-3 pt-2 pl-4 border-l-2 border-blue-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                      Options de réponse
                                    </span>
                                  </div>

                                  <div className="space-y-2">
                                    {(q.options || []).map((opt, i) => (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:bg-white transition-all">
                                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                                          <input
                                            type="text"
                                            value={opt.label}
                                            onChange={(e) => {
                                              const newOptions = [...(q.options || [])];
                                              newOptions[i].label = e.target.value;
                                              updateQuestion(q.id, { options: newOptions });
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                            className="w-full text-sm font-medium text-slate-700 outline-none bg-transparent"
                                          />
                                        </div>

                                        <button
                                          onClick={() => {
                                            const newOptions = (q.options || []).filter(o => o.id !== opt.id);
                                            updateQuestion(q.id, { options: newOptions });
                                          }}
                                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                          title="Supprimer l'option"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <button
                                      onClick={() => {
                                        const newOptions = [
                                          ...(q.options || []),
                                          { id: crypto.randomUUID(), label: `Option ${(q.options?.length || 0) + 1}` }
                                        ];
                                        updateQuestion(q.id, { options: newOptions });
                                      }}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                                    >
                                      <Plus className="w-4 h-4" /> Ajouter une option
                                    </button>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors select-none">
                                      <input
                                        type="checkbox"
                                        checked={q.has_other_option || false}
                                        onChange={(e) => updateQuestion(q.id, { has_other_option: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      Autoriser réponse "Autre (préciser)"
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* ADVANCED SETTINGS EXPANDABLE DRAWER */}
                              <AnimatePresence>
                                {isAdvancedOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-4 border-t border-slate-100 space-y-4 overflow-hidden"
                                  >
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <Sliders className="w-4 h-4 text-blue-600" />
                                        Logique Conditionnelle & Validation
                                      </h4>

                                      <div className="grid sm:grid-cols-2 gap-4">
                                        {/* Validation rules */}
                                        <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                                          <span className="text-xs font-bold text-slate-700 block">Règles de validation</span>
                                          {(q.type === 'text' || q.type === 'number') ? (
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[11px] text-slate-500 block mb-0.5">
                                                  {q.type === 'text' ? 'Min Caractères' : 'Valeur Min'}
                                                </label>
                                                <input
                                                  type="number"
                                                  value={q.validation_rules?.minLength || q.validation_rules?.min || ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                    const field = q.type === 'text' ? 'minLength' : 'min';
                                                    updateQuestion(q.id, { validation_rules: { ...q.validation_rules, [field]: val } });
                                                  }}
                                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[11px] text-slate-500 block mb-0.5">
                                                  {q.type === 'text' ? 'Max Caractères' : 'Valeur Max'}
                                                </label>
                                                <input
                                                  type="number"
                                                  value={q.validation_rules?.maxLength || q.validation_rules?.max || ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                    const field = q.type === 'text' ? 'maxLength' : 'max';
                                                    updateQuestion(q.id, { validation_rules: { ...q.validation_rules, [field]: val } });
                                                  }}
                                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">Validation automatique selon les options.</p>
                                          )}
                                        </div>

                                         {/* Conditional Logic */}
                                         <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                                           <span className="text-xs font-bold text-slate-700 block">Affichage Conditionnel</span>
                                           <div className="space-y-2">
                                             <div>
                                               <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Question déclencheuse</label>
                                               <select
                                                 value={q.conditional_logic?.depends_on_code || ''}
                                                 onChange={(e) => updateQuestion(q.id, {
                                                   conditional_logic: {
                                                     depends_on_code: e.target.value,
                                                     equals_value: q.conditional_logic?.equals_value || ''
                                                   }
                                                 })}
                                                 className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                               >
                                                 <option value="">-- Aucune (Toujours afficher) --</option>
                                                 {questions
                                                   .filter(otherQ => otherQ.id !== q.id)
                                                   .map(otherQ => (
                                                     <option key={otherQ.id} value={otherQ.question_code || otherQ.id}>
                                                       {otherQ.question_code ? `[Code: ${otherQ.question_code}] ` : ''}{otherQ.label.length > 35 ? otherQ.label.substring(0, 35) + '...' : otherQ.label}
                                                     </option>
                                                   ))}
                                               </select>
                                               <div className="mt-1 flex items-center gap-1.5">
                                                 <span className="text-[10px] text-slate-400">Code :</span>
                                                 <input
                                                   type="text"
                                                   placeholder="ex: s1q1"
                                                   value={q.conditional_logic?.depends_on_code || ''}
                                                   onChange={(e) => updateQuestion(q.id, {
                                                     conditional_logic: {
                                                       depends_on_code: e.target.value,
                                                       equals_value: q.conditional_logic?.equals_value || ''
                                                     }
                                                   })}
                                                   className="px-2 py-0.5 border border-slate-200 rounded text-[11px] font-mono outline-none focus:border-blue-500 w-28 bg-white"
                                                 />
                                               </div>
                                             </div>
                                             <div>
                                               <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Est égale à (Valeur)</label>
                                               {(() => {
                                                 const depCode = q.conditional_logic?.depends_on_code;
                                                 const depQ = questions.find(item => item.question_code === depCode || item.id === depCode);
                                                 if (depQ && depQ.options && depQ.options.length > 0) {
                                                   return (
                                                     <select
                                                       value={q.conditional_logic?.equals_value || ''}
                                                       onChange={(e) => updateQuestion(q.id, {
                                                         conditional_logic: {
                                                           depends_on_code: q.conditional_logic?.depends_on_code || '',
                                                           equals_value: e.target.value
                                                         }
                                                       })}
                                                       className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                                     >
                                                       <option value="">-- Choisir la valeur option --</option>
                                                       {depQ.options.map(opt => (
                                                         <option key={opt.id} value={opt.label}>{opt.label}</option>
                                                       ))}
                                                     </select>
                                                   );
                                                 }
                                                 return (
                                                   <input
                                                     type="text"
                                                     placeholder="ex: Oui"
                                                     value={q.conditional_logic?.equals_value || ''}
                                                     onChange={(e) => updateQuestion(q.id, {
                                                       conditional_logic: {
                                                         depends_on_code: q.conditional_logic?.depends_on_code || '',
                                                         equals_value: e.target.value
                                                       }
                                                     })}
                                                     className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                                                   />
                                                 );
                                               })()}
                                             </div>
                                           </div>
                                         </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Direct Button "＋ Ajouter une question" under each card */}
                              <div className="pt-2 flex justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => addQuestion(section.id, q.id)}
                                  className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full border border-blue-200/60 shadow-xs transition-all flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Insérer une question ici
                                </button>
                              </div>

                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Button "＋ Ajouter une question" at Section Bottom */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addQuestion(section.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-600 text-sm font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                      Ajouter une question dans cette section
                    </motion.button>

                  </div>
                );
              })}
            </div>

            {/* FIN DE QUESTIONNAIRE (COMPLETION SECTIONS) */}
            <div className="space-y-6 bg-slate-100/90 p-5 sm:p-7 rounded-3xl border border-slate-200/80 relative transition-all shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-300/60">
                <div className="space-y-1">
                  <span className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                    🏁 Messages de Fin de Questionnaire (Écran de remerciement)
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Définissez les messages affichés après la validation. Le premier message dont les conditions sont remplies sera affiché.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = crypto.randomUUID();
                    setSections([...sections, {
                      id: newId,
                      title: 'Merci pour vos réponses !',
                      description: '<p>Vos informations ont été enregistrées en toute sécurité.</p>',
                      display_order: sections.length,
                      is_completion_section: true,
                      conditional_logic: {
                        depends_on_code: '',
                        equals_value: ''
                      }
                    }]);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un message de fin conditionnel
                </button>
              </div>

              <div className="space-y-6">
                {sections.filter(s => s.is_completion_section).map((section, complIdx) => {
                  const isDefault = complIdx === 0 && !section.conditional_logic?.depends_on_code;
                  return (
                    <div
                      key={section.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${isDefault ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                            {isDefault ? 'Message de Fin par Défaut' : `Message de Fin Conditionnel #${complIdx}`}
                          </span>
                        </div>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              setSections(sections.filter(s => s.id !== section.id));
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            Titre principal du message de fin
                          </label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition-all"
                            placeholder="ex: Merci pour vos réponses !"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            Description ou message personnalisé (Rich Text)
                          </label>
                          <RichTextEditor
                            value={section.description || ''}
                            onChange={(html) => updateSection(section.id, { description: html })}
                            placeholder="Saisissez votre message de remerciement, instructions de fin..."
                            minHeight="100px"
                          />
                        </div>
                      </div>

                      {/* CONDITIONAL DISPLAY LOGIC FOR COMPLETION MESSAGE */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">
                            Condition d'affichage de ce message :
                          </span>
                          {section.conditional_logic?.depends_on_code && (
                            <button
                              type="button"
                              onClick={() => {
                                updateSection(section.id, { conditional_logic: undefined });
                              }}
                              className="text-xs text-red-600 font-bold hover:underline"
                            >
                              Retirer la condition
                            </button>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">
                              Question déclencheuse
                            </label>
                            <select
                              value={section.conditional_logic?.depends_on_code || ''}
                              onChange={(e) => updateSection(section.id, {
                                conditional_logic: {
                                  depends_on_code: e.target.value,
                                  equals_value: section.conditional_logic?.equals_value || ''
                                }
                              })}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                            >
                              <option value="">-- Toujours afficher (aucune condition) --</option>
                              {questions
                                .map(q => (
                                  <option key={q.id} value={q.question_code || q.id}>
                                    {q.question_code ? `[Code: ${q.question_code}] ` : ''}{q.label.length > 50 ? q.label.substring(0, 50) + '...' : q.label}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">
                              Est égale à la valeur :
                            </label>
                            {(() => {
                              const selectedCode = section.conditional_logic?.depends_on_code;
                              const depQ = questions.find(q => q.question_code === selectedCode || q.id === selectedCode);
                              if (depQ && depQ.options && depQ.options.length > 0) {
                                return (
                                  <select
                                    value={section.conditional_logic?.equals_value || ''}
                                    onChange={(e) => updateSection(section.id, {
                                      conditional_logic: {
                                        depends_on_code: section.conditional_logic?.depends_on_code || '',
                                        equals_value: e.target.value
                                      }
                                    })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                  >
                                    <option value="">-- Choisir la valeur option --</option>
                                    {depQ.options.map(opt => (
                                      <option key={opt.id} value={opt.label}>{opt.label}</option>
                                    ))}
                                  </select>
                                );
                              }
                              return (
                                <input
                                  type="text"
                                  placeholder="ex: Oui"
                                  value={section.conditional_logic?.equals_value || ''}
                                  onChange={(e) => updateSection(section.id, {
                                    conditional_logic: {
                                      depends_on_code: section.conditional_logic?.depends_on_code || '',
                                      equals_value: e.target.value
                                    }
                                  })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 text-slate-800"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Button "＋ Nouvelle Section" at Canvas Bottom */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={addSection}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Section
            </motion.button>

          </div>
        </main>

        {/* Inline Mobile Preview */}
        {mobileActiveTab === 'preview' && (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:hidden pb-24" style={{ backgroundColor: settings.background_color, fontFamily }}>
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-200/80">
              {/* Preview Content Header */}
              <div className="relative h-36 overflow-hidden">
                {settings.header_bg_image && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${settings.header_bg_image})`,
                      opacity: settings.header_opacity
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 mix-blend-multiply"
                  style={{ backgroundColor: settings.main_color, opacity: 0.8 }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-8 w-auto mb-1.5 object-contain self-start" />
                  )}
                  <h1 className="text-lg font-black leading-tight truncate">
                    {questionnaire.title || 'Titre du Questionnaire'}
                  </h1>
                  {questionnaire.company_name && (
                    <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block mt-0.5">
                      {questionnaire.company_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Form Questions List */}
              <div className="p-5 space-y-8">
                {sections.filter(s => !s.is_completion_section).map((section, sIdx) => {
                  const secQs = questions
                    .filter(q => q.section_id === section.id)
                    .sort((a, b) => a.display_order - b.display_order);

                  if (secQs.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-5">
                      <div className="pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          Section {sIdx + 1}
                        </span>
                        <h3 className="text-sm font-black text-slate-800 mt-1">{section.title}</h3>
                        {section.description && (
                          <div className="text-[11px] text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: section.description }} />
                        )}
                      </div>

                      <div className="space-y-5">
                        {secQs.map((q) => (
                          <div key={q.id} className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-800">
                              <span className="text-[10px] font-mono font-bold text-blue-600 mr-1.5 bg-blue-50 px-1 py-0.5 rounded">{q.question_code}</span>
                              {q.label}
                              {q.is_required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {q.description_text && (
                              <p className="text-[10px] text-slate-400 font-medium">{q.description_text}</p>
                            )}

                            <div className="mt-1">
                              {q.type === 'text' && (
                                <input
                                  type="text"
                                  disabled
                                  placeholder="Réponse texte..."
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400"
                                />
                              )}

                              {q.type === 'number' && (
                                <input
                                  type="number"
                                  disabled
                                  placeholder="Nombre..."
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400"
                                />
                              )}

                              {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                                <div className="space-y-1.5">
                                  {(q.options || []).map((opt) => (
                                    <div key={opt.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600">
                                      <input type={q.type === 'multiple_choice' ? 'radio' : 'checkbox'} disabled className="text-blue-600 scale-90" />
                                      <span className="truncate">{opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {q.type === 'select' && (
                                <select disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 bg-none">
                                  <option>Sélectionnez...</option>
                                  {(q.options || []).map(opt => (
                                    <option key={opt.id}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    disabled
                    className="px-6 py-2 text-white font-bold text-xs rounded-xl shadow-md opacity-80"
                    style={{ backgroundColor: settings.main_color }}
                  >
                    Soumettre
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 3. BARRE LATÉRALE RÉGLAGES (RIGHT SIDEBAR) */}
        {/* ========================================== */}
        <aside className={`shrink-0 bg-white/80 backdrop-blur-xl border-l border-slate-200/80 flex flex-col h-full shadow-2xl z-20 transition-all duration-300 ease-in-out ${
          mobileActiveTab === 'settings'
            ? 'w-full flex pb-20'
            : isSidebarOpen
            ? 'hidden md:flex md:w-[360px] lg:w-[400px]'
            : 'hidden md:flex md:w-0 md:overflow-hidden md:opacity-0 md:pointer-events-none'
        }`}>
          
          {/* Sidebar Header & Tabs */}
          <div className="p-4 border-b border-slate-200/80 space-y-3 bg-white/60">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span>Paramètres & Style</span>
              </h2>

              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileActiveTab('editor');
                  } else {
                    setIsSidebarOpen(false);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="Fermer la barre latérale"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Main Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
              <button
                onClick={() => setSidebarTab('style')}
                className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all ${
                  sidebarTab === 'style'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Style
              </button>

              <button
                onClick={() => setSidebarTab('settings')}
                className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all ${
                  sidebarTab === 'settings'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Réglages
              </button>

              <button
                onClick={() => setSidebarTab('navigation')}
                className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all ${
                  sidebarTab === 'navigation'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Structure
              </button>

              <button
                onClick={() => setSidebarTab('export')}
                className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition-all ${
                  sidebarTab === 'export'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Données
              </button>
            </div>
          </div>

          {/* Sidebar Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ONGLET 1 — STYLE & BRANDING */}
            {sidebarTab === 'style' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Company Name & Logo */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Identité & Marque
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom de l'Entreprise</label>
                    <input
                      type="text"
                      value={questionnaire.company_name || ''}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const oldName = questionnaire.company_name || '';
                        setQuestionnaire({ ...questionnaire, company_name: newName });

                        setSettings(prev => {
                          const year = new Date().getFullYear();
                          const currentFooter = prev.footer_text || '';
                          if (
                            !currentFooter ||
                            currentFooter.includes('Votre Entreprise') ||
                            currentFooter.includes('Votre entreprise') ||
                            (oldName && currentFooter.includes(oldName))
                          ) {
                            return {
                              ...prev,
                              footer_text: newName
                                ? `© ${year} ${newName} - Tous droits réservés.`
                                : `© ${year} Votre Entreprise - Tous droits réservés.`
                            };
                          }
                          return prev;
                        });
                      }}
                      placeholder="Ex: Acme Corp"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">URL du Logo (Optionnel)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                    />
                    {settings.logo_url && (
                      <div className="mt-2 p-2 bg-slate-100 rounded-xl flex items-center justify-center border">
                        <img src={settings.logo_url} alt="Logo preview" className="max-h-10 object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Colors */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" /> Couleurs du Thème
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Couleur Principale (Boutons, titres)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.main_color}
                        onChange={(e) => setSettings({ ...settings, main_color: e.target.value })}
                        className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={settings.main_color}
                        onChange={(e) => setSettings({ ...settings, main_color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Couleur de Fond de Page</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.background_color}
                        onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                        className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={settings.background_color}
                        onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Google Fonts */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-blue-600" /> Typographie Google Fonts
                  </h3>

                  <div>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      {GOOGLE_FONTS.map(f => (
                        <option key={f.name} value={f.font}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Header Image & Opacity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Image d'En-tête
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Image de fond (URL)</label>
                    <input
                      type="url"
                      value={settings.header_bg_image || ''}
                      onChange={(e) => setSettings({ ...settings, header_bg_image: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700">Opacité de l'image</label>
                      <span className="text-xs font-bold text-blue-600">{Math.round(settings.header_opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.header_opacity}
                      onChange={(e) => setSettings({ ...settings, header_opacity: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ONGLET 2 — PARAMÈTRES GLOBAUX & LIENS */}
            {sidebarTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Form Status */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Statut de Publication</h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800">
                        {questionnaire.status === 'published' ? 'Formulaire en ligne' : 'Formulaire en brouillon'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {questionnaire.status === 'published' ? 'Accessible par lien public' : 'Seul l\'administrateur y a accès'}
                      </p>
                    </div>

                    <button
                      onClick={() => setQuestionnaire({
                        ...questionnaire,
                        status: questionnaire.status === 'published' ? 'draft' : 'published'
                      })}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                        questionnaire.status === 'published'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {questionnaire.status === 'published' ? 'Publié' : 'Brouillon'}
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Temps de réponse estimé */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Temps de réponse
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Durée estimée (en minutes)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder={`Automatique (${Math.max(1, Math.ceil(questions.length * 0.5))} min)`}
                      value={questionnaire.estimated_duration || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setQuestionnaire({ ...questionnaire, estimated_duration: val });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Laissez vide pour calculer automatiquement en fonction du nombre de questions (30 sec par question).
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Messages & Footer */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pied de page</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Texte de bas de page (Copyright / Mentions)</label>
                    <input
                      type="text"
                      value={settings.footer_text || ''}
                      onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Share Links */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" /> Liens d'Accès
                  </h3>

                  {questionnaire.id && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Lien du Questionnaire Public</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/f/${questionnaire.id}`}
                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all"
                          />
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/f/${questionnaire.id}`, 'form')}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors shrink-0"
                            title="Copier le lien public"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {copiedLink === 'form' && (
                          <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Lien copié !</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Lien du Dashboard de Résultats</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/analytics/${questionnaire.id}`}
                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all"
                          />
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/analytics/${questionnaire.id}`, 'dash')}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors shrink-0"
                            title="Copier le lien du dashboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {copiedLink === 'dash' && (
                          <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Lien du Dashboard copié !</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ONGLET 3 — ARBORESCENCE & NAVIGATION */}
            {sidebarTab === 'navigation' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Arborescence Rapide</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {questions.length} Q / {sections.length} S
                  </span>
                </div>

                <div className="space-y-4">
                  {sections.filter(s => !s.is_completion_section).map((sec, sIdx) => {
                    const secQs = questions.filter(q => q.section_id === sec.id);

                    return (
                      <div key={sec.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                        <button
                          onClick={() => scrollToElement(`section-${sec.id}`)}
                          className="w-full text-left font-bold text-xs text-slate-800 hover:text-blue-600 flex items-center justify-between transition-colors"
                        >
                          <span className="truncate">Section {sIdx + 1}: {sec.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>

                        <div className="pl-3 space-y-1.5 border-l-2 border-slate-200">
                          {secQs.map(q => (
                            <button
                              key={q.id}
                              onClick={() => scrollToElement(`question-${q.id}`)}
                              className="w-full text-left py-1 px-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2 truncate"
                            >
                              <span className="font-mono font-bold text-[10px] text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded">
                                {q.question_code}
                              </span>
                              <span className="truncate">{q.label || 'Question sans titre'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ONGLET 4 — EXPORT DE DONNÉES */}
            {sidebarTab === 'export' && (
              <div className="animate-in fade-in duration-200">
                <DataExport 
                  questionnaireId={questionnaire.id} 
                  questions={questions} 
                  dashboardToken={questionnaire.dashboard_token} 
                />
              </div>
            )}

          </div>

        </aside>

      </div>

      {/* ========================================== */}
      {/* 4. MODAL/OVERLAY APERÇU RAPIDE (PREVIEW)  */}
      {/* ========================================== */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-200"
              style={{ backgroundColor: settings.background_color, fontFamily }}
            >
              {/* Preview Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 font-bold text-xs rounded-full border border-blue-500/30">
                    Aperçu en Direct (Respondents View)
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {questionnaire.title}
                  </span>
                </div>

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Form Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-8">
                
                {/* Header Banner */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
                  <div className="relative h-44 sm:h-52 overflow-hidden">
                    {settings.header_bg_image && (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${settings.header_bg_image})`,
                          opacity: settings.header_opacity
                        }}
                      />
                    )}
                    <div
                      className="absolute inset-0 mix-blend-multiply"
                      style={{ backgroundColor: settings.main_color, opacity: 0.8 }}
                    />
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                      {settings.logo_url && (
                        <img src={settings.logo_url} alt="Logo" className="h-10 w-auto mb-3 object-contain" />
                      )}
                      <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow-sm">
                        {questionnaire.title || 'Titre du Questionnaire'}
                      </h1>
                      <p className="text-white/90 text-xs sm:text-sm max-w-2xl mt-1 drop-shadow-sm">
                        {questionnaire.description}
                      </p>
                    </div>
                  </div>

                  {/* Form Questions List */}
                  <div className="p-6 sm:p-10 space-y-10">
                    {sections.filter(s => !s.is_completion_section).map((section) => {
                      const secQs = questions
                        .filter(q => q.section_id === section.id)
                        .sort((a, b) => a.display_order - b.display_order);

                      if (secQs.length === 0) return null;

                      return (
                        <div key={section.id} className="space-y-6">
                          <div className="pb-3 border-b border-slate-100">
                            <h3 className="text-lg font-extrabold text-slate-800">{section.title}</h3>
                            {section.description && <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>}
                          </div>

                          <div className="space-y-6">
                            {secQs.map((q) => (
                              <div key={q.id} className="space-y-2">
                                <label className="block text-sm font-bold text-slate-800">
                                  <span className="text-xs font-mono text-blue-600 mr-2">{q.question_code}</span>
                                  {q.label}
                                  {q.is_required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {q.description_text && (
                                  <p className="text-xs text-slate-500 ml-6">{q.description_text}</p>
                                )}

                                <div className="ml-6">
                                  {q.type === 'text' && (
                                    <input
                                      type="text"
                                      placeholder="Votre réponse..."
                                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                  )}

                                  {q.type === 'number' && (
                                    <input
                                      type="number"
                                      placeholder="Entrez un nombre..."
                                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                  )}

                                  {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                                    <div className="space-y-2">
                                      {(q.options || []).map((opt) => (
                                        <label key={opt.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer">
                                          <input type={q.type === 'multiple_choice' ? 'radio' : 'checkbox'} name={q.id} className="text-blue-600" />
                                          <span>{opt.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}

                                  {q.type === 'select' && (
                                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700">
                                      <option value="">Sélectionnez...</option>
                                      {(q.options || []).map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        className="px-8 py-3 text-white font-bold text-sm rounded-xl shadow-md"
                        style={{ backgroundColor: settings.main_color }}
                      >
                        Soumettre
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile-Only Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 flex items-center justify-around px-4 shadow-lg pb-safe">
        <button
          onClick={() => setMobileActiveTab('editor')}
          className={`flex flex-col items-center justify-center gap-1 h-full px-4 transition-all ${
            mobileActiveTab === 'editor' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 font-medium'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Formulaire</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 h-full px-4 transition-all ${
            mobileActiveTab === 'settings' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 font-medium'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Réglages</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('preview')}
          className={`flex flex-col items-center justify-center gap-1 h-full px-4 transition-all ${
            mobileActiveTab === 'preview' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 font-medium'
          }`}
        >
          <Eye className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Aperçu</span>
        </button>
      </div>

      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={() => saveToSupabase()}
      />

    </div>
  );
}
