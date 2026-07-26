-- ==============================================================================
-- MISE À JOUR DU SCHÉMA SUPABASE - Option d'affichage des statistiques
-- ==============================================================================

ALTER TABLE questionnaire_settings 
  ADD COLUMN IF NOT EXISTS show_meta_info BOOLEAN DEFAULT true;
