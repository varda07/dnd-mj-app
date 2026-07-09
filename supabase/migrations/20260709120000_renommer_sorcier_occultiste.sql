-- ============================================================================
-- Corrections V1 Vague 2 — 2.2 : renommage classe « Sorcier » → « Occultiste »
-- ----------------------------------------------------------------------------
-- L'app utilise désormais le nom officiel FR (D&D 5e 2024) « Occultiste » pour
-- le Warlock, afin de lever la confusion avec « Ensorceleur » (Sorcerer).
-- Cette migration met à jour les données existantes :
--   • personnages.classe (mono-classe)
--   • personnages.classes_multiples (jsonb : champ "classe" de chaque entrée)
--   • sorts.classes_compatibles (text[])
-- Idempotente : ré-exécutable sans effet de bord.
-- ============================================================================

-- 1) Classe principale des personnages
update personnages
set classe = 'Occultiste'
where classe = 'Sorcier';

-- 2) Entrées de multiclassage (jsonb array d'objets {classe, sous_classe, niveau})
update personnages
set classes_multiples = (
  select jsonb_agg(
    case
      when elem->>'classe' = 'Sorcier'
      then jsonb_set(elem, '{classe}', '"Occultiste"'::jsonb)
      else elem
    end
  )
  from jsonb_array_elements(classes_multiples) as elem
)
where classes_multiples is not null
  and jsonb_typeof(classes_multiples) = 'array'
  and classes_multiples @> '[{"classe": "Sorcier"}]'::jsonb;

-- 3) Sorts : liste des classes compatibles (text[])
update sorts
set classes_compatibles = array_replace(classes_compatibles, 'Sorcier', 'Occultiste')
where 'Sorcier' = any(classes_compatibles);
