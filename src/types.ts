export type QuestionnaireStatus = 'draft' | 'published';
export type QuestionType = 'text' | 'multiple_choice' | 'checkbox' | 'number' | 'select';

export interface Questionnaire {
  id?: string;
  title: string;
  description: string;
  status: QuestionnaireStatus;
  dashboard_token?: string;
  custom_slug?: string | null;
  created_at?: string;
  company_name?: string;
  responses?: { count: number }[];
  estimated_duration?: number | null;
}

export interface QuestionnaireSettings {
  logo_url: string;
  main_color: string;
  background_color: string;
  footer_text: string;
  header_bg_image: string;
  header_opacity: number;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  display_order: number;
  conditional_logic?: {
    depends_on_code?: string;
    equals_value?: string;
  };
  is_completion_section?: boolean;
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string; // Used for UI keying and drag-drop tracking
  section_id?: string;
  type: QuestionType;
  label: string;
  description_text?: string;
  question_code?: string;
  validation_rules?: any;
  conditional_logic?: any;
  display_order: number;
  is_required: boolean;
  options?: QuestionOption[];
  has_other_option?: boolean;
}

