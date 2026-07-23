import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Questionnaire, QuestionnaireSettings, Question, Section } from '../types';
import {
  Loader2, ArrowRight, ArrowLeft, Check, Sparkles, Clock,
  CheckCircle2, CornerDownLeft, ShieldCheck, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from './GlassCard';
import { TextInput, RadioCard, CheckboxCard } from './FormInputs';
import { getStoredQuestionnaireData } from '../lib/storage';
import { RichTextRenderer } from './RichTextEditor';

const generateShortId = () => Math.random().toString(36).substring(2, 10);

export default function PublicFormView() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [settings, setSettings] = useState<QuestionnaireSettings | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [respondentId, setRespondentId] = useState('');

  // State for form answers
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (questionnaire?.title) {
      document.title = `Exceller chez Pierre + ${questionnaire.title}`;
    } else {
      document.title = 'Exceller chez Pierre';
    }
  }, [questionnaire?.title]);

  useEffect(() => {
    setRespondentId(generateShortId());

    async function fetchData() {
      if (!id) {
        setError('ID du questionnaire manquant.');
        setLoading(false);
        return;
      }

      try {
        let loaded = false;
        try {
          const { data: qData, error: qError } = await supabase
            .from('questionnaires')
            .select('*')
            .or(`id.eq.${id},dashboard_token.eq.${id}`)
            .maybeSingle();

          if (!qError && qData) {
            setQuestionnaire(qData);
            loaded = true;

            const realId = qData.id;

            const { data: sData } = await supabase
              .from('questionnaire_settings')
              .select('*')
              .eq('questionnaire_id', realId)
              .maybeSingle();
            if (sData) setSettings(sData);

            const { data: secData } = await supabase
              .from('sections')
              .select('*')
              .eq('questionnaire_id', realId)
              .order('display_order', { ascending: true });
            setSections(secData && secData.length > 0 ? secData : [{ id: 'default', title: '', description: '', display_order: 0 }]);

            const { data: qsData } = await supabase
              .from('questions')
              .select('*')
              .eq('questionnaire_id', realId)
              .order('display_order', { ascending: true });
            setQuestions(qsData || []);
          }
        } catch (sbErr) {
          console.warn('Supabase fetch failed in PublicFormView:', sbErr);
        }

        if (!loaded) {
          const localData = getStoredQuestionnaireData(id);
          if (localData && localData.questionnaire) {
            setQuestionnaire(localData.questionnaire);
            if (localData.settings) setSettings(localData.settings);
            setSections(localData.sections && localData.sections.length > 0 ? localData.sections : [{ id: 'default', title: '', description: '', display_order: 0 }]);
            setQuestions(localData.questions || []);
            loaded = true;
          }
        }

        if (!loaded && id !== 'demo-id') {
          setError('Questionnaire introuvable.');
        }
      } catch (err: any) {
        console.error('Erreur lors du chargement:', err);
        setError('Impossible de charger le questionnaire.');
      } finally {
        setLoading(false);
      }
    }

    if (id === 'demo-id' && !isSupabaseConfigured()) {
      setQuestionnaire({
        id: 'demo-id',
        title: 'Questionnaire de Satisfaction Client',
        description: 'Aidez-nous à améliorer nos prestations en partageant votre retour d\'expérience. Vos réponses restent strictement confidentielles.',
        company_name: 'Acme Corporation',
        status: 'published'
      });
      setSettings({
        logo_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop',
        main_color: '#2563eb',
        background_color: '#f8fafc',
        footer_text: '© 2026 Acme Corp - Tous droits réservés.',
        header_bg_image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop',
        header_opacity: 0.85
      });

      const mockSec1 = 'sec1';
      const mockSec2 = 'sec2';

      setSections([
        { id: mockSec1, title: 'Informations de contact', description: 'Présentez-vous brièvement', display_order: 0 },
        { id: mockSec2, title: 'Évaluation du Service', description: 'Vos impressions générales', display_order: 1 }
      ]);

      setQuestions([
        { id: '1', section_id: mockSec1, question_code: 's1q1', type: 'text', label: 'Quel est votre nom complet ?', description_text: 'Nom et prénom professionnels', display_order: 0, is_required: true, validation_rules: { minLength: 2 } },
        { id: '2', section_id: mockSec1, question_code: 's1q2', type: 'multiple_choice', label: 'Quel est votre niveau global de satisfaction ?', display_order: 1, is_required: true, options: [{ id: 'opt1', label: 'Extrêmement satisfait' }, { id: 'opt2', label: 'Moyennement satisfait' }, { id: 'opt3', label: 'Insatisfait' }] },
        { id: '3', section_id: mockSec2, question_code: 's2q1', type: 'checkbox', label: 'Quels aspects avez-vous particulièrement appréciés ?', description_text: 'Plusieurs choix possibles', display_order: 0, is_required: false, options: [{ id: 'optA', label: 'Réactivité de l\'équipe' }, { id: 'optB', label: 'Qualité du produit' }, { id: 'optC', label: 'Rapport qualité/prix' }] },
        { id: '4', section_id: mockSec2, question_code: 's2q2', type: 'text', label: 'Quelles améliorations suggérez-vous ?', display_order: 1, is_required: false }
      ]);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [id]);

  // Colors
  const bgColor = settings?.background_color || '#f8fafc';
  const mainColor = settings?.main_color || '#2563eb';
  const secondaryColor = '#8b5cf6'; // Complementary purple/indigo ambient orb
  const logoUrl = settings?.logo_url;
  const rawFooterText = settings?.footer_text;
  const companyName = questionnaire?.company_name;

  let displayFooter = rawFooterText;
  if (displayFooter) {
    if (companyName && /Votre [Ee]ntreprise/.test(displayFooter)) {
      displayFooter = displayFooter.replace(/Votre [Ee]ntreprise/g, companyName);
    }
  } else if (companyName) {
    displayFooter = `© ${new Date().getFullYear()} ${companyName} - Tous droits réservés.`;
  } else {
    displayFooter = `© ${new Date().getFullYear()} Votre Entreprise - Tous droits réservés.`;
  }

  // Evaluate conditional logic for questions
  const shouldShowQuestion = (q: Question) => {
    if (!q.conditional_logic?.depends_on_code) return true;
    const { depends_on_code, equals_value } = q.conditional_logic;
    if (!depends_on_code || !equals_value) return true;

    const depQuestion = questions.find(question => question.question_code === depends_on_code || question.id === depends_on_code);
    if (!depQuestion) return true;

    const depAnswer = answers[depQuestion.id];

    if (Array.isArray(depAnswer)) {
      return depAnswer.includes(equals_value);
    }

    return String(depAnswer ?? '') === String(equals_value);
  };

  // Evaluate conditional logic for sections
  const shouldShowSection = (sec: Section) => {
    if (!sec.conditional_logic?.depends_on_code) return true;
    const { depends_on_code, equals_value } = sec.conditional_logic;
    if (!depends_on_code || !equals_value) return true;

    const depQuestion = questions.find(q => q.question_code === depends_on_code || q.id === depends_on_code);
    if (!depQuestion) return true;

    const depAnswer = answers[depQuestion.id];

    if (Array.isArray(depAnswer)) {
      return depAnswer.includes(equals_value);
    }

    return String(depAnswer ?? '') === String(equals_value);
  };

  const visibleSections = sections.filter(shouldShowSection);

  // Auto-clamp currentSectionIndex if visible sections list changes
  useEffect(() => {
    if (visibleSections.length > 0 && currentSectionIndex >= visibleSections.length) {
      setCurrentSectionIndex(Math.max(0, visibleSections.length - 1));
    }
  }, [visibleSections.length, currentSectionIndex]);

  const currentSection = visibleSections[currentSectionIndex] || visibleSections[0];
  const currentQuestions = questions
    .filter(q => q.section_id === currentSection?.id)
    .filter(shouldShowQuestion);

  const isLastSection = visibleSections.length > 0 && currentSectionIndex === visibleSections.length - 1;
  const progressPercentage = visibleSections.length > 0 ? ((currentSectionIndex + 1) / visibleSections.length) * 100 : 100;
  const estimatedMinutes = Math.max(1, Math.ceil(questions.length * 0.5));

  const validateCurrentSection = () => {
    if (!currentSection) return true;

    const errors: Record<string, string> = {};
    let isValid = true;

    for (const q of currentQuestions) {
      const val = answers[q.id];
      const isValEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

      if (q.is_required && isValEmpty) {
        errors[q.id] = 'Ce champ est obligatoire.';
        isValid = false;
        continue;
      }

      if (!isValEmpty) {
        const isOtherSelected = (Array.isArray(val) && val.includes('__OTHER__')) || val === '__OTHER__';
        if (isOtherSelected) {
          const otherText = answers[q.id + '_other'];
          if (!otherText || typeof otherText !== 'string' || otherText.trim() === '') {
            errors[q.id] = 'Veuillez préciser votre réponse.';
            isValid = false;
            continue;
          }
        }
      }

      if (!isValEmpty && q.validation_rules) {
        if (q.type === 'text') {
          if (q.validation_rules.minLength && String(val).length < q.validation_rules.minLength) {
            errors[q.id] = `Au moins ${q.validation_rules.minLength} caractères requis.`;
            isValid = false;
          }
          if (q.validation_rules.maxLength && String(val).length > q.validation_rules.maxLength) {
            errors[q.id] = `Maximum ${q.validation_rules.maxLength} caractères autorisés.`;
            isValid = false;
          }
        } else if (q.type === 'number') {
          const numVal = Number(val);
          if (isNaN(numVal)) {
            errors[q.id] = `Veuillez entrer un nombre valide.`;
            isValid = false;
          } else {
            if (q.validation_rules.min !== undefined && q.validation_rules.min !== null && numVal < q.validation_rules.min) {
              errors[q.id] = `La valeur doit être au moins ${q.validation_rules.min}.`;
              isValid = false;
            }
            if (q.validation_rules.max !== undefined && q.validation_rules.max !== null && numVal > q.validation_rules.max) {
              errors[q.id] = `La valeur ne doit pas dépasser ${q.validation_rules.max}.`;
              isValid = false;
            }
          }
        }
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentSection()) {
      setDirection(1);
      setCurrentSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentSectionIndex(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCurrentSection()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (id === 'demo-id') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsSubmitted(true);
      } else {
        const payload = { ...answers };

        const { error } = await supabase
          .from('responses')
          .insert([
            {
              questionnaire_id: questionnaire.id,
              respondent_id: respondentId,
              payload: payload
            }
          ]);

        if (error) throw error;
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error('Erreur lors de la soumission:', err);
      setSubmitError(err.message || 'Une erreur est survenue lors de la soumission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setValidationErrors({});
    setCurrentSectionIndex(0);
    setDirection(0);
    setRespondentId(generateShortId());
    setStarted(false);
    setIsSubmitted(false);
    setSubmitError('');
  };

  // KEYBOARD SHORTCUTS NAVIGATION (Enter = Next/Submit, 1-9 = Choose options)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputTarget = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if (e.key === 'Enter') {
        if (!started) {
          setStarted(true);
          return;
        }
        if (isSubmitted) {
          handleReset();
          return;
        }
        if (isLastSection) {
          handleSubmit();
        } else {
          handleNext();
        }
        return;
      }

      if (!isInputTarget && started && !isSubmitted && currentQuestions.length > 0) {
        const keyNum = parseInt(e.key, 10);
        if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
          const optionIndex = keyNum - 1;
          const optionQuestion = currentQuestions.find(q => q.type === 'multiple_choice' || q.type === 'checkbox');
          if (optionQuestion) {
            const opts = optionQuestion.options && optionQuestion.options.length > 0
              ? optionQuestion.options.map(o => o.label)
              : (optionQuestion.type === 'multiple_choice' ? ['Option 1', 'Option 2'] : ['Choix A', 'Choix B']);

            if (optionIndex < opts.length) {
              const selectedOpt = opts[optionIndex];
              if (optionQuestion.type === 'multiple_choice') {
                handleInputChange(optionQuestion.id, selectedOpt);
                handleInputChange(optionQuestion.id + '_other', '');
              } else if (optionQuestion.type === 'checkbox') {
                const curr = answers[optionQuestion.id] || [];
                const exists = curr.includes(selectedOpt);
                const next = exists ? curr.filter((item: string) => item !== selectedOpt) : [...curr, selectedOpt];
                handleInputChange(optionQuestion.id, next);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, isSubmitted, currentSectionIndex, sections.length, currentQuestions, answers, isLastSection]);

  const renderQuestionInput = (q: Question) => {
    const hasError = !!validationErrors[q.id];

    switch (q.type) {
      case 'text':
        return (
          <TextInput
            type="text"
            hasError={hasError}
            mainColor={mainColor}
            placeholder="Saisissez votre réponse ici..."
            onChange={(e) => handleInputChange(q.id, e.target.value)}
            value={answers[q.id] || ''}
            className="!py-4 !text-base sm:!text-lg font-medium"
          />
        );
      case 'number':
        return (
          <TextInput
            type="number"
            hasError={hasError}
            mainColor={mainColor}
            placeholder="Entrez un nombre..."
            onChange={(e) => handleInputChange(q.id, e.target.value)}
            value={answers[q.id] || ''}
            className="!py-4 !text-base sm:!text-lg font-medium"
          />
        );
      case 'multiple_choice':
        const mcOptions = q.options && q.options.length > 0 ? q.options.map(o => o.label) : ['Option 1', 'Option 2'];
        const isMcOtherSelected = answers[q.id] === '__OTHER__';
        return (
          <div className="space-y-3">
            {mcOptions.map((opt, i) => (
              <RadioCard
                key={i}
                label={opt}
                badgeNumber={i + 1}
                selected={answers[q.id] === opt}
                onClick={() => {
                  handleInputChange(q.id, opt);
                  handleInputChange(q.id + '_other', '');
                }}
                mainColor={mainColor}
                hasError={hasError}
              />
            ))}
            {q.has_other_option && (
              <div className="space-y-2">
                <RadioCard
                  label="Autre (préciser)"
                  selected={isMcOtherSelected}
                  onClick={() => handleInputChange(q.id, '__OTHER__')}
                  mainColor={mainColor}
                  hasError={hasError}
                />
                <AnimatePresence>
                  {isMcOtherSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-2"
                    >
                      <TextInput
                        type="text"
                        mainColor={mainColor}
                        placeholder="Veuillez préciser votre pensée..."
                        value={answers[q.id + '_other'] || ''}
                        onChange={(e) => handleInputChange(q.id + '_other', e.target.value)}
                        className="!py-3.5 !text-base font-medium"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      case 'checkbox':
        const cbOptions = q.options && q.options.length > 0 ? q.options.map(o => o.label) : ['Choix A', 'Choix B'];
        const currentCbAnswers = answers[q.id] || [];
        const isCbOtherSelected = currentCbAnswers.includes('__OTHER__');
        return (
          <div className="space-y-3">
            {cbOptions.map((opt, i) => {
              const checked = currentCbAnswers.includes(opt);
              return (
                <CheckboxCard
                  key={i}
                  label={opt}
                  badgeNumber={i + 1}
                  selected={checked}
                  onClick={() => {
                    const next = checked ? currentCbAnswers.filter((a: string) => a !== opt) : [...currentCbAnswers, opt];
                    handleInputChange(q.id, next);
                  }}
                  mainColor={mainColor}
                  hasError={hasError}
                />
              );
            })}
            {q.has_other_option && (
              <div className="space-y-2">
                <CheckboxCard
                  label="Autre (préciser)"
                  selected={isCbOtherSelected}
                  onClick={() => {
                    const next = isCbOtherSelected ? currentCbAnswers.filter((a: string) => a !== '__OTHER__') : [...currentCbAnswers, '__OTHER__'];
                    handleInputChange(q.id, next);
                    if (isCbOtherSelected) {
                      handleInputChange(q.id + '_other', '');
                    }
                  }}
                  mainColor={mainColor}
                  hasError={hasError}
                />
                <AnimatePresence>
                  {isCbOtherSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-2"
                    >
                      <TextInput
                        type="text"
                        mainColor={mainColor}
                        placeholder="Veuillez préciser votre pensée..."
                        value={answers[q.id + '_other'] || ''}
                        onChange={(e) => handleInputChange(q.id + '_other', e.target.value)}
                        className="!py-3.5 !text-base font-medium"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      case 'select':
        const selectOptions = q.options && q.options.length > 0 ? q.options.map(o => o.label) : ['Option 1', 'Option 2'];
        const isSelectOtherSelected = answers[q.id] === '__OTHER__';
        return (
          <div className="space-y-3">
            <div className={`relative rounded-3xl overflow-hidden min-h-[48px] ${hasError ? 'ring-2 ring-red-500 bg-red-50/50' : 'bg-black/5 hover:bg-black/10 transition-colors duration-300'}`}>
              <select
                value={answers[q.id] || ''}
                onChange={(e) => {
                  handleInputChange(q.id, e.target.value);
                  if (e.target.value !== '__OTHER__') {
                    handleInputChange(q.id + '_other', '');
                  }
                }}
                className={`w-full min-h-[48px] px-6 py-3.5 appearance-none bg-transparent text-slate-800 font-semibold text-base outline-none cursor-pointer touch-manipulation ${!answers[q.id] ? 'text-slate-400' : ''}`}
              >
                <option value="" disabled>Sélectionnez une option dans la liste...</option>
                {selectOptions.map((opt, i) => (
                  <option key={i} value={opt} className="text-slate-800 font-medium">{opt}</option>
                ))}
                {q.has_other_option && (
                  <option value="__OTHER__" className="text-slate-800 font-medium">Autre (préciser)</option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-6 pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <AnimatePresence>
              {isSelectOtherSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-2 pt-1"
                >
                  <TextInput
                    type="text"
                    mainColor={mainColor}
                    placeholder="Veuillez préciser votre pensée..."
                    value={answers[q.id + '_other'] || ''}
                    onChange={(e) => handleInputChange(q.id + '_other', e.target.value)}
                    className="!py-3.5 !text-base font-medium"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Chargement de l'expérience...</p>
        </div>
      </div>
    );
  }

  if (error || !questionnaire) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none transform-gpu" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none transform-gpu" />

        <div className="bg-white/10 backdrop-blur-2xl support-[not-(backdrop-filter)]:bg-slate-800 p-8 sm:p-12 rounded-3xl shadow-2xl text-center max-w-md w-full border border-white/15 relative z-10 space-y-6 transform-gpu">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Questionnaire Introuvable</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {error || 'Ce questionnaire n\'est pas accessible. Assurez-vous d\'avoir enregistré vos modifications.'}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm rounded-full transition-all shadow-lg select-none touch-manipulation"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] font-sans relative overflow-x-hidden selection:bg-blue-500/20 text-slate-800 flex flex-col justify-between"
      style={{ backgroundColor: bgColor }}
    >
      {/* DRAFT MODE BANNER (Positioned top-right to avoid overlapping the centered title) */}
      {questionnaire.status === 'draft' && (
        <div className="fixed top-4 right-4 sm:right-6 z-50 bg-amber-500/90 hover:bg-amber-500 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 border border-amber-300/40 select-none transition-all">
          <span>⚠️ Mode Brouillon</span>
          <span className="opacity-80 hidden md:inline">• Prévisualisation active</span>
        </div>
      )}
      {/* 1. AMBIENT BACKGROUND: MESH GRADIENT WITH ANIMATED GLOWING LIGHT ORBS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -50, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-20 transform-gpu will-change-transform"
          style={{ backgroundColor: mainColor }}
        />
        <motion.div
          animate={{
            x: [0, -70, 50, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.9, 1.25, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-20 transform-gpu will-change-transform"
          style={{ backgroundColor: secondaryColor }}
        />
        <motion.div
          animate={{
            x: [0, 40, -60, 0],
            y: [0, 50, -50, 0],
            scale: [0.9, 1.15, 0.95, 0.9],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 left-10 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-15 transform-gpu will-change-transform"
          style={{ backgroundColor: mainColor }}
        />
      </div>

      {/* 3. FLOATING GLASS HEADER (ONLY WHEN STARTED & NOT SUBMITTED) */}
      <AnimatePresence>
        {started && !isSubmitted && (
          <motion.div
            initial={{ y: -60, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -60, opacity: 0, x: '-50%' }}
            className="fixed top-4 left-1/2 z-50 w-11/12 max-w-2xl pointer-events-auto transform-gpu"
          >
            <div className="bg-white/70 backdrop-blur-xl support-[not-(backdrop-filter)]:bg-white/95 border border-white/60 rounded-full px-5 py-2.5 shadow-2xl shadow-slate-900/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain shrink-0 rounded-md" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: mainColor }}
                  >
                    {questionnaire.title?.[0] || 'Q'}
                  </div>
                )}
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                  {questionnaire.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold text-slate-700 bg-white/80 border border-white/60 shadow-xs">
                  Section {currentSectionIndex + 1} sur {visibleSections.length}
                </span>
              </div>
            </div>

            {/* Fine progress bar under floating header */}
            <div className="w-full h-1 bg-white/40 backdrop-blur-md rounded-full overflow-hidden mt-1.5 px-3">
              <motion.div
                className="h-full rounded-full transition-all duration-300"
                style={{ backgroundColor: mainColor, width: `${progressPercentage}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-8 pt-8 pb-32 sm:pb-36 min-h-[100dvh] flex flex-col justify-between">

        <div className="flex-1 flex flex-col justify-center py-8">

          {/* 2. WELCOME / HERO COVER SCREEN */}
          {!started ? (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-10 sm:py-16 max-w-3xl mx-auto space-y-8"
            >
              {/* Company Logo prominent at top center */}
              {logoUrl ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative mb-8 inline-block"
                >
                  <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-110" style={{ backgroundColor: mainColor }} />
                  <img
                    src={logoUrl}
                    alt={questionnaire.company_name || 'Logo'}
                    className="h-20 sm:h-24 w-auto object-contain relative z-10 mx-auto drop-shadow-2xl rounded-2xl bg-white/60 p-3.5 backdrop-blur-md border border-white/60"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl font-black text-white shadow-2xl relative"
                  style={{ backgroundColor: mainColor, boxShadow: `0 15px 35px -5px ${mainColor}70` }}
                >
                  <Sparkles className="w-10 h-10" />
                </motion.div>
              )}

              {/* Glassmorphism Metadata Badge */}
              <div>
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-extrabold text-slate-700 bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-slate-900/5 mb-6"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    ⏱️ ~{estimatedMinutes} min de réponse
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>📋 {sections.length} {sections.length > 1 ? 'sections' : 'section'} ({questions.length} questions)</span>
                  {questionnaire.company_name && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {questionnaire.company_name}
                      </span>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <motion.h1
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]"
                >
                  {questionnaire.title}
                </motion.h1>

                {questionnaire.description && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-slate-600 text-lg sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto"
                  >
                    <RichTextRenderer content={questionnaire.description} />
                  </motion.div>
                )}
              </div>

              {/* Hero Action Button */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setStarted(true)}
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white rounded-full transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl"
                  style={{
                    backgroundColor: mainColor,
                    boxShadow: `0 15px 40px -10px ${mainColor}80`,
                  }}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Commencer l'expérience
                    <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </motion.div>

              <p className="text-xs font-semibold text-slate-400 pt-2">
                Appuyez sur <kbd className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded font-mono font-bold text-slate-600 shadow-xs">Entrée ↵</kbd> pour démarrer rapidement
              </p>
            </motion.div>
          ) : isSubmitted ? (

            /* 5. SUBMISSION SUCCESS SCREEN */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Merci pour vos réponses !</h2>
                <p className="text-slate-600 text-base sm:text-lg font-medium leading-relaxed max-w-md mx-auto">
                  Vos informations ont été enregistrées en toute sécurité.
                </p>
              </div>

              <div className="inline-block bg-white/80 border border-slate-200/80 px-4 py-2 rounded-2xl text-xs font-mono font-bold text-slate-500 shadow-xs">
                ID Répondant: {respondentId}
              </div>

              <div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base rounded-full shadow-lg transition-all"
                >
                  Soumettre une autre réponse
                </motion.button>
              </div>
            </motion.div>

          ) : (

            /* 4. AIRY QUESTION CARDS VIEW (MAIN FORM CANVAS) */
            <div className="pt-16 pb-8 max-w-2xl mx-auto w-full space-y-6">

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSectionIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Section Title & Description Card */}
                  {currentSection && (currentSection.title || currentSection.description) && (
                    <div className="bg-white/60 backdrop-blur-2xl support-[not-(backdrop-filter)]:bg-white/95 border border-white/60 shadow-xl rounded-3xl p-6 sm:p-8 space-y-2 transform-gpu">
                      {currentSection.title && (
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {currentSection.title}
                        </h3>
                      )}
                      {currentSection.description && (
                        <div className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
                          <RichTextRenderer content={currentSection.description} />
                        </div>
                      )}
                    </div>
                  )}

                  {submitError && (
                    <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm font-semibold">
                      {submitError}
                    </div>
                  )}

                  {/* Question Cards */}
                  {currentQuestions.map((q, idx) => {
                    const error = validationErrors[q.id];
                    return (
                      <div
                        key={q.id}
                        className="bg-white/70 backdrop-blur-2xl support-[not-(backdrop-filter)]:bg-white/95 border border-white/60 shadow-2xl rounded-3xl p-6 sm:p-10 space-y-6 transition-all transform-gpu will-change-transform"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <span
                              className="flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold text-white shrink-0 mt-1 shadow-xs"
                              style={{ backgroundColor: mainColor }}
                            >
                              {idx + 1}
                            </span>
                            <h4 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
                              {q.label}
                              {q.is_required && <span className="ml-1 text-red-500 font-bold">*</span>}
                            </h4>
                          </div>

                          {q.description_text && (
                            <p className="pl-10 text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                              {q.description_text}
                            </p>
                          )}
                        </div>

                        {/* Input Renderer */}
                        <div className="pl-0 sm:pl-10">
                          {renderQuestionInput(q)}
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-3 text-xs sm:text-sm text-red-600 font-bold flex items-center gap-1.5"
                            >
                              ⚠️ {error}
                            </motion.p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Controls with keyboard margin clearance */}
              <div className="pt-6 pb-4 flex items-center justify-between gap-4">
                <div>
                  {currentSectionIndex > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handlePrev}
                      disabled={isSubmitting}
                      className="min-h-[48px] px-6 py-3.5 text-sm font-bold text-slate-700 bg-white/70 hover:bg-white backdrop-blur-md support-[not-(backdrop-filter)]:bg-white/95 border border-white/60 shadow-md rounded-full transition-all flex items-center gap-2 select-none touch-manipulation cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Précédent
                    </motion.button>
                  )}
                </div>

                <div>
                  {isLastSection ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="min-h-[48px] px-8 py-3.5 text-sm sm:text-base font-bold text-white rounded-full shadow-2xl flex items-center gap-2 transition-all select-none touch-manipulation cursor-pointer transform-gpu"
                      style={{
                        backgroundColor: mainColor,
                        boxShadow: `0 12px 30px -8px ${mainColor}80`
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          Terminer
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleNext}
                      className="min-h-[48px] px-8 py-3.5 text-sm sm:text-base font-bold text-white rounded-full shadow-2xl flex items-center gap-2 transition-all select-none touch-manipulation cursor-pointer transform-gpu"
                      style={{
                        backgroundColor: mainColor,
                        boxShadow: `0 12px 30px -8px ${mainColor}80`
                      }}
                    >
                      Suivant
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* DISCRETE KEYBOARD SHORTCUT GUIDE */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-semibold py-2.5 px-4 rounded-full bg-white/40 backdrop-blur-md border border-white/40 shadow-xs max-w-fit mx-auto select-none">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/80 border border-slate-200/80 rounded font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                    Entrée ↵
                  </kbd>
                  Valider
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/80 border border-slate-200/80 rounded font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                    1-9
                  </kbd>
                  Choix rapide
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Footer info */}
        {displayFooter && (
          <footer className="text-center text-xs font-semibold text-slate-400 py-4 relative z-10">
            {displayFooter}
          </footer>
        )}

      </div>
    </div>
  );
}
