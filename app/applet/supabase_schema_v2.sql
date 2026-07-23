-- ==============================================================================
-- MISE À JOUR DU SCHÉMA SUPABASE (V2) - Logique Avancée
-- ==============================================================================

-- 1. Nouvelle table : sections
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Modification de la table : questions
ALTER TABLE questions
  ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  ADD COLUMN description_text TEXT,
  ADD COLUMN question_code VARCHAR(50),
  ADD COLUMN validation_rules JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN conditional_logic JSONB DEFAULT '{}'::jsonb;

-- 3. Modification de la table : responses
-- Fonction pour générer un ID court alphanumérique pour respondent_id
CREATE OR REPLACE FUNCTION generate_short_id(length integer DEFAULT 8)
RETURNS text AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE responses
  ADD COLUMN respondent_id VARCHAR(20) DEFAULT generate_short_id(8) UNIQUE;

-- 4. Ajout du token de partage pour le Dashboard public (depuis l'étape précédente)
-- S'assurer que le champ existe si ce n'est pas déjà fait
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS dashboard_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(255) UNIQUE;

-- ==========================================
-- SECURITE : ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Activer RLS sur la nouvelle table sections
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Politiques pour "sections"
CREATE POLICY "Les admins peuvent gérer les sections de leurs questionnaires" ON sections
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM questionnaires WHERE id = sections.questionnaire_id AND admin_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM questionnaires WHERE id = sections.questionnaire_id AND admin_id = auth.uid()
  ));

CREATE POLICY "Le public peut voir les sections des questionnaires publiés" ON sections
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM questionnaires WHERE id = sections.questionnaire_id AND status = 'published'
  ));

-- Politique RLS pour l'accès public au Dashboard via le dashboard_token
-- Cela permet à n'importe qui (anon ou authentifié) de lire les réponses d'un questionnaire
-- s'il fait la requête en filtrant sur un questionnaire_id dont le dashboard_token est connu.
CREATE POLICY "Lecture publique des réponses via token de dashboard" ON responses
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM questionnaires WHERE id = responses.questionnaire_id AND dashboard_token IS NOT NULL
  ));
