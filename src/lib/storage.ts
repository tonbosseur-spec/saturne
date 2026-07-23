import { Questionnaire, QuestionnaireSettings, Section, Question } from '../types';

const STORAGE_KEY_QUESTIONNAIRES = 'app_questionnaires';
const STORAGE_KEY_PREFIX_SETTINGS = 'app_settings_';
const STORAGE_KEY_PREFIX_SECTIONS = 'app_sections_';
const STORAGE_KEY_PREFIX_QUESTIONS = 'app_questions_';

export function getStoredQuestionnaires(): Questionnaire[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONNAIRES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading stored questionnaires from localStorage:', e);
    return [];
  }
}

export function saveStoredQuestionnaire(
  questionnaire: Questionnaire,
  settings?: QuestionnaireSettings,
  sections?: Section[],
  questions?: Question[]
): Questionnaire {
  const current = getStoredQuestionnaires();
  const qId = questionnaire.id || crypto.randomUUID();
  const updatedQ: Questionnaire = {
    ...questionnaire,
    id: qId,
    dashboard_token: questionnaire.dashboard_token || Math.random().toString(36).substring(2, 15),
    created_at: questionnaire.created_at || new Date().toISOString(),
    responses: questionnaire.responses || [{ count: 0 }],
  };

  const existingIndex = current.findIndex(q => q.id === qId);
  let updatedList: Questionnaire[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = updatedQ;
  } else {
    updatedList = [updatedQ, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY_QUESTIONNAIRES, JSON.stringify(updatedList));
    if (settings) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX_SETTINGS}${qId}`, JSON.stringify(settings));
    }
    if (sections) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX_SECTIONS}${qId}`, JSON.stringify(sections));
    }
    if (questions) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX_QUESTIONS}${qId}`, JSON.stringify(questions));
    }
  } catch (e) {
    console.error('Error saving questionnaire to localStorage:', e);
  }

  return updatedQ;
}

export function deleteStoredQuestionnaire(id: string): void {
  try {
    const current = getStoredQuestionnaires();
    const updated = current.filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEY_QUESTIONNAIRES, JSON.stringify(updated));
    localStorage.removeItem(`${STORAGE_KEY_PREFIX_SETTINGS}${id}`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX_SECTIONS}${id}`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX_QUESTIONS}${id}`);
  } catch (e) {
    console.error('Error deleting questionnaire from localStorage:', e);
  }
}

export function getStoredQuestionnaireData(id: string) {
  try {
    const questionnaires = getStoredQuestionnaires();
    const questionnaire = questionnaires.find(q => q.id === id || q.dashboard_token === id);
    if (!questionnaire) return null;

    const realId = questionnaire.id!;
    const settingsRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX_SETTINGS}${realId}`);
    const sectionsRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX_SECTIONS}${realId}`);
    const questionsRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX_QUESTIONS}${realId}`);

    return {
      questionnaire,
      settings: settingsRaw ? JSON.parse(settingsRaw) : null,
      sections: sectionsRaw ? JSON.parse(sectionsRaw) : null,
      questions: questionsRaw ? JSON.parse(questionsRaw) : null,
    };
  } catch (e) {
    console.error('Error fetching stored questionnaire data:', e);
    return null;
  }
}
