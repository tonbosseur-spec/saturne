-- ==============================================================================
-- MISE À JOUR DU SCHÉMA SUPABASE - Nouveaux types de questions
-- ==============================================================================

-- Si vous avez une contrainte CHECK sur le type de question dans la table `questions`, 
-- vous devez la mettre à jour pour autoriser les nouveaux types.
-- Si la colonne est simplement de type TEXT ou VARCHAR, aucune modification 
-- structurelle n'est strictement requise car les valeurs textuelles seront acceptées.

-- Voici un exemple pour mettre à jour ou ajouter une contrainte (décommenter si nécessaire) :
/*
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (
  type IN ('text', 'number', 'multiple_choice', 'checkbox', 'select', 'date', 'phone', 'email')
);
*/

-- IMPORTANT : Le système enregistre désormais automatiquement les réponses "Autre" 
-- directement dans le JSON "payload" de la table "responses" en combinant 
-- le choix "__OTHER__" avec le texte saisi. 
-- Aucune modification de la table "responses" n'est donc requise car 
-- le format JSONB est flexible et absorbe cette nouvelle structure !
