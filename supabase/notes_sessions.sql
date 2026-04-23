-- Ajoute la colonne notes_sessions (jsonb) à la table scenarios.
-- Chaque entrée :
--   { "id": uuid, "titre": text, "date": "YYYY-MM-DD", "contenu": text }
alter table public.scenarios
  add column if not exists notes_sessions jsonb not null default '[]'::jsonb;
