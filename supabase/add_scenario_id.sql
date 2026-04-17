-- Ajoute scenario_id aux tables personnages et ennemis
-- pour pouvoir filtrer les participants d'un combat par scénario.

alter table public.personnages
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

alter table public.ennemis
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

create index if not exists personnages_scenario_id_idx on public.personnages(scenario_id);
create index if not exists ennemis_scenario_id_idx on public.ennemis(scenario_id);
