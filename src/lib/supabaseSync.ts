import { supabase, isSupabaseConfigured } from './supabase';
import { Questionnaire, QuestionnaireSettings, Section, Question } from '../types';
import { getStoredQuestionnaires, getStoredQuestionnaireData, saveStoredQuestionnaire } from './storage';

export interface SyncResult {
  success: boolean;
  message: string;
  questionnaireId?: string;
  error?: any;
}

// Helper to check if string is valid UUID
function isValidUuid(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function syncQuestionnaireToSupabase(
  q: Questionnaire,
  settings?: QuestionnaireSettings,
  sections?: Section[],
  questions?: Question[]
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Supabase n'est pas encore configuré dans l'application (URL ou clé API 'anon' manquante).",
    };
  }

  try {
    // Keep existing ID or generate a new UUID/string ID
    let qId = q.id || crypto.randomUUID();

    const dbToken = q.dashboard_token || Math.random().toString(36).substring(2, 15);

    // Get full data if not passed directly
    let fullSettings = settings;
    let fullSections = sections;
    let fullQuestions = questions;

    if (!fullSettings || !fullSections || !fullQuestions) {
      const stored = getStoredQuestionnaireData(qId) || (q.id ? getStoredQuestionnaireData(q.id) : null);
      if (stored) {
        fullSettings = fullSettings || stored.settings;
        fullSections = fullSections || stored.sections;
        fullQuestions = fullQuestions || stored.questions;
      }
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    const qRecord: any = {
      id: qId,
      title: q.title || 'Sans titre',
      description: q.description || '',
      status: q.status || 'published',
      company_name: q.company_name || null,
      dashboard_token: dbToken,
      updated_at: new Date().toISOString(),
    };

    if (user && user.id && isValidUuid(user.id)) {
      qRecord.admin_id = user.id;
    }

    // 1. Primary Upsert Attempt
    let { data: qData, error: qError } = await supabase
      .from('questionnaires')
      .upsert(qRecord)
      .select()
      .maybeSingle();

    // If UUID format mismatch (22P02), generate a valid UUID and retry
    if (qError && qError.code === '22P02' && !isValidUuid(qId)) {
      qId = crypto.randomUUID();
      qRecord.id = qId;
      const uuidRetry = await supabase
        .from('questionnaires')
        .upsert(qRecord)
        .select()
        .maybeSingle();
      qData = uuidRetry.data;
      qError = uuidRetry.error;
    }

    // Retry if dashboard_token collision (23505)
    if (qError && qError.code === '23505' && qError.message?.includes('dashboard_token')) {
      qRecord.dashboard_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 6);
      const retryRes = await supabase
        .from('questionnaires')
        .upsert(qRecord)
        .select()
        .maybeSingle();
      qData = retryRes.data;
      qError = retryRes.error;
    }

    // Fallback attempt with minimal fields if a specific column is missing in user's DB (42703 or PGRST204)
    if (qError && (qError.code === '42703' || qError.message?.includes('column') || qError.code === 'PGRST204')) {
      console.warn('Full upsert failed due to missing column. Attempting simplified record upsert...');
      const minimalRecord = {
        id: qId,
        title: q.title || 'Sans titre',
        description: q.description || '',
        status: q.status || 'published',
        updated_at: new Date().toISOString(),
      };
      const fallbackRes = await supabase
        .from('questionnaires')
        .upsert(minimalRecord)
        .select()
        .maybeSingle();
      qData = fallbackRes.data;
      qError = fallbackRes.error;
    }

    if (qError) {
      console.warn('Supabase sync warning for questionnaire:', qError);
      let errMsg = qError.message || 'Erreur d\'écriture Supabase.';
      if (qError.code === '42P01') {
        errMsg = 'La table "questionnaires" n\'existe pas dans Supabase. Exécutez le script SQL dans "Script SQL des Tables".';
      } else if (qError.code === '42501') {
        errMsg = 'Permission refusée par les politiques RLS de Supabase. Assurez-vous de ré-exécuter le script SQL dans Supabase.';
      } else if (qError.code === '22P02') {
        errMsg = 'Format d\'identifiant UUID incompatible avec la table Supabase.';
      }
      return {
        success: false,
        message: errMsg,
        error: qError,
      };
    }

    const finalId = qData?.id || qId;
    const finalToken = qData?.dashboard_token || dbToken;
    const updatedQ: Questionnaire = { ...q, id: finalId, dashboard_token: finalToken };

    // 2. Upsert Settings
    if (fullSettings) {
      const settingsRecord: any = {
        questionnaire_id: finalId,
        logo_url: fullSettings.logo_url || null,
        main_color: fullSettings.main_color || '#3B82F6',
        background_color: fullSettings.background_color || '#F8FAFC',
        footer_text: fullSettings.footer_text || null,
        header_bg_image: fullSettings.header_bg_image || null,
        header_opacity: fullSettings.header_opacity ?? 1.0,
        updated_at: new Date().toISOString(),
      };
      let { error: sError } = await supabase
        .from('questionnaire_settings')
        .upsert(settingsRecord, { onConflict: 'questionnaire_id' });
      if (sError) {
        const fallbackRes = await supabase.from('questionnaire_settings').upsert(settingsRecord);
        if (fallbackRes.error) console.warn('Supabase settings upsert warning:', fallbackRes.error);
      }
    }

    // 3. Upsert Sections
    if (fullSections && fullSections.length > 0) {
      const sectionsToUpsert = fullSections.map((s, index) => {
        const condLogic = s.conditional_logic || {};
        const conditional_logic = {
          ...condLogic,
          is_completion_section: s.is_completion_section || (condLogic as any).is_completion_section || false
        };
        return {
          id: s.id || `sec_${index}_${crypto.randomUUID().substring(0, 8)}`,
          questionnaire_id: finalId,
          title: s.title || '',
          description: s.description || '',
          conditional_logic,
          display_order: index,
          updated_at: new Date().toISOString(),
        };
      });
      const { error: secError } = await supabase.from('sections').upsert(sectionsToUpsert);
      if (secError) {
        console.warn('Supabase sections upsert error:', secError);
        if (secError.code === '42P01') {
          return {
            success: false,
            message: 'La table "sections" n\'existe pas dans Supabase. Veuillez copier et exécuter le script SQL fourni dans l\'application.',
            error: secError,
          };
        }
      }
    }

    // 4. Upsert Questions
    if (fullQuestions && fullQuestions.length > 0) {
      const questionsToUpsert = fullQuestions.map((qItem, index) => ({
        id: qItem.id || `q_${index}_${crypto.randomUUID().substring(0, 8)}`,
        questionnaire_id: finalId,
        section_id: qItem.section_id || null,
        type: qItem.type || 'text',
        label: qItem.label || 'Question',
        description_text: qItem.description_text || null,
        question_code: qItem.question_code || null,
        validation_rules: qItem.validation_rules || {},
        conditional_logic: qItem.conditional_logic || {},
        display_order: index,
        is_required: Boolean(qItem.is_required),
        options: qItem.options || [],
        has_other_option: Boolean(qItem.has_other_option),
        updated_at: new Date().toISOString(),
      }));
      const { error: qstError } = await supabase.from('questions').upsert(questionsToUpsert);
      if (qstError) {
        console.warn('Supabase questions upsert error:', qstError);
        if (qstError.code === '42P01') {
          return {
            success: false,
            message: 'La table "questions" n\'existe pas dans Supabase. Veuillez copier et exécuter le script SQL fourni dans l\'application.',
            error: qstError,
          };
        }
      }
    }

    // Always keep local storage in sync with finalized IDs
    saveStoredQuestionnaire(updatedQ, fullSettings, fullSections, fullQuestions);

    return {
      success: true,
      message: 'Questionnaire et données synchronisés avec succès sur Supabase !',
      questionnaireId: finalId,
    };
  } catch (err: any) {
    console.error('Unexpected error during Supabase sync:', err);
    return {
      success: false,
      message: err.message || 'Une erreur inattendue est survenue pendant la synchronisation.',
      error: err,
    };
  }
}

export async function syncAllLocalQuestionnairesToSupabase(): Promise<{
  syncedCount: number;
  errorCount: number;
  messages: string[];
}> {
  const localList = getStoredQuestionnaires();
  let syncedCount = 0;
  let errorCount = 0;
  const messages: string[] = [];

  for (const q of localList) {
    if (q.id === 'demo-id') continue;
    const res = await syncQuestionnaireToSupabase(q);
    if (res.success) {
      syncedCount++;
    } else {
      errorCount++;
      messages.push(`"${q.title}": ${res.message}`);
    }
  }

  return { syncedCount, errorCount, messages };
}

