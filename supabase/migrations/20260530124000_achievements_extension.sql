-- ============================================================================
-- Roadmap Affinement 2.10 — Extension du catalogue d'achievements
-- ----------------------------------------------------------------------------
-- Ajoute les achievements manquants par rapport au catalogue de base.
-- ============================================================================

insert into public.achievements (code, titre, description, emoji, ordre) values
  ('premier_de',         'Premier dé lancé',     'Lance ton tout premier dé sur Master Screen.',  '🎲', 10),
  ('mille_des',          '1000 dés lancés',      'Atteindre 1 000 lancers de dés au total.',      '🎯', 11),
  ('premier_combat',     'Premier combat gagné', 'Remporter ton premier combat en tant que MJ.',  '⚔️', 12),
  ('premier_scenario',   'Premier scénario',     'Créer ton tout premier scénario.',              '📖', 13),
  ('dix_ennemis',        '10 ennemis créés',     'Créer 10 ennemis personnalisés.',                '👹', 14),
  ('dix_pnj',            '10 PNJ créés',         'Créer 10 PNJ personnalisés.',                    '🤝', 15),
  ('dix_sorts',          '10 sorts créés',       'Créer 10 sorts personnalisés.',                  '📚', 16),
  ('premier_fumble',     'Échec critique',       'Obtenir un 1 naturel à un jet d''attaque.',     '💫', 17),
  ('niveau_20',          'Niveau 20',            'Un personnage atteint le niveau maximum.',       '🌟', 18),
  ('premier_template',   'Premier template',     'Sauvegarder un PNJ ou ennemi comme template.',  '💾', 19),
  ('premiere_carte',     'Premier mapper',       'Créer ta première carte interactive.',          '🗺',  20),
  ('premier_calendrier', 'Maître du temps',      'Configurer le calendrier d''une campagne.',     '🗓', 21)
on conflict (code) do nothing;
