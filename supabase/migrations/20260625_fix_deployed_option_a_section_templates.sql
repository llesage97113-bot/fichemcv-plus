-- Correction idempotente du schéma déployé pour les aides Option A.
--
-- La base observée le 2026-06-25 avait encore :
-- - section_templates sans colonne mcv_option ;
-- - l'unicité historique epreuve + section_key ;
-- - fiche_sections_dashboard jointe uniquement par epreuve + section_key.

alter table public.section_templates
  add column if not exists mcv_option text;

do $$
begin
  alter table public.section_templates
    add constraint section_templates_mcv_option_check
    check (mcv_option is null or mcv_option in ('A', 'B'));
exception when duplicate_object then null;
end $$;

update public.section_templates
set mcv_option = 'B'
where epreuve in ('E31', 'E32')
  and mcv_option is null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'section_templates'
      and c.contype = 'u'
      and array(
        select a.attname::text
        from unnest(c.conkey) with ordinality as key(attnum, ordinality)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key.attnum
        order by key.ordinality
      ) = array['epreuve', 'section_key']
  loop
    execute format(
      'alter table public.section_templates drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

do $$
declare
  index_name text;
begin
  for index_name in
    select i.relname
    from pg_index ix
    join pg_class i on i.oid = ix.indexrelid
    join pg_class t on t.oid = ix.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'section_templates'
      and ix.indisunique
      and not ix.indisprimary
      and not exists (
        select 1
        from pg_constraint c
        where c.conindid = ix.indexrelid
      )
      and array(
        select a.attname::text
        from unnest(ix.indkey) with ordinality as key(attnum, ordinality)
        join pg_attribute a
          on a.attrelid = ix.indrelid
         and a.attnum = key.attnum
        where key.attnum > 0
        order by key.ordinality
      ) = array['epreuve', 'section_key']
  loop
    execute format('drop index public.%I', index_name);
  end loop;
end $$;

do $$
begin
  alter table public.section_templates
    add constraint section_templates_epreuve_mcv_option_section_key_key
    unique nulls not distinct (epreuve, mcv_option, section_key);
exception when duplicate_object then null;
end $$;

insert into public.section_templates (
  epreuve,
  mcv_option,
  section_key,
  section_title,
  student_question,
  help_text,
  linked_competencies,
  is_core,
  sort_order
)
values
  (
    'E31',
    'A',
    'contexte',
    'Le contexte',
    'Dans quel contexte professionnel cette activité a-t-elle été réalisée ?',
    'Présente l’entreprise, le service ou le rayon concerné, la période et les circonstances dans lesquelles l’activité a été réalisée.',
    '[]'::jsonb,
    false,
    1
  ),
  (
    'E31',
    'A',
    'lieu',
    'Le lieu',
    'Où l’activité s’est-elle déroulée ?',
    'Indique précisément le lieu et décris brièvement l’espace professionnel concerné : rayon, réserve, accueil, caisse, surface de vente ou autre zone de travail.',
    '[]'::jsonb,
    false,
    2
  ),
  (
    'E31',
    'A',
    'objectif_activite',
    'L’objectif de l’activité',
    'Quel était l’objectif de cette activité ?',
    'Explique ce que l’activité devait permettre de réaliser, d’organiser, d’améliorer ou de mettre en valeur dans l’espace commercial.',
    '[]'::jsonb,
    false,
    3
  ),
  (
    'E31',
    'A',
    'acteurs',
    'Les acteurs',
    'Quelles personnes ont participé à cette activité ?',
    'Présente les personnes impliquées : toi-même, tuteur, responsable, collègues, clients ou prestataires, puis précise leur rôle.',
    '[]'::jsonb,
    false,
    4
  ),
  (
    'E31',
    'A',
    'description_activite',
    'Description de l’activité',
    'Comment l’activité s’est-elle déroulée ?',
    'Décris les différentes étapes dans l’ordre chronologique, les tâches réalisées, les outils utilisés et les consignes respectées.',
    '[]'::jsonb,
    false,
    5
  ),
  (
    'E31',
    'A',
    'resultats_obtenus',
    'Le(s) résultat(s) obtenu(s)',
    'Quels résultats ont été obtenus ?',
    'Présente les résultats concrets de l’activité. Appuie-toi, lorsque c’est possible, sur des observations, des chiffres, des réactions de clients ou des indicateurs.',
    '[]'::jsonb,
    false,
    6
  ),
  (
    'E31',
    'A',
    'propositions_amelioration',
    'Proposition(s) d’amélioration',
    'Quelles améliorations pourrais-tu proposer ?',
    'Propose une ou plusieurs solutions réalistes pour améliorer l’organisation, l’efficacité, la présentation de l’espace ou les résultats de l’activité.',
    '[]'::jsonb,
    false,
    7
  ),
  (
    'E31',
    'A',
    'bilan_personnel',
    'Bilan personnel',
    'Quel bilan personnel tires-tu de cette activité ?',
    'Explique ce que tu as appris, les difficultés rencontrées, les compétences mobilisées et ce que tu ferais différemment une prochaine fois.',
    '[]'::jsonb,
    false,
    8
  ),
  (
    'E32',
    'A',
    'contexte',
    'Le contexte',
    'Dans quel contexte professionnel cette activité a-t-elle été réalisée ?',
    'Présente l’entreprise, le service concerné, la période et la situation de suivi, de service ou de relation client dans laquelle l’activité a été menée.',
    '[]'::jsonb,
    false,
    1
  ),
  (
    'E32',
    'A',
    'lieu',
    'Le lieu',
    'Où l’activité s’est-elle déroulée ?',
    'Indique le lieu précis : surface de vente, accueil, caisse, service après-vente, bureau, réserve ou espace de contact avec le client.',
    '[]'::jsonb,
    false,
    2
  ),
  (
    'E32',
    'A',
    'objectif_activite',
    'L’objectif de l’activité',
    'Quel était l’objectif de cette activité ?',
    'Explique ce que l’activité devait permettre : suivre une vente, informer le client, traiter une demande, présenter un service ou améliorer la satisfaction.',
    '[]'::jsonb,
    false,
    3
  ),
  (
    'E32',
    'A',
    'acteurs',
    'Les acteurs',
    'Quelles personnes ont participé à cette activité ?',
    'Présente les personnes impliquées : toi-même, client, tuteur, responsable, collègues, service logistique ou service après-vente, puis précise leur rôle.',
    '[]'::jsonb,
    false,
    4
  ),
  (
    'E32',
    'A',
    'description_activite',
    'Description de l’activité',
    'Comment l’activité s’est-elle déroulée ?',
    'Décris les étapes suivies, les échanges avec le client, les outils utilisés, les informations recherchées et les actions réalisées.',
    '[]'::jsonb,
    false,
    5
  ),
  (
    'E32',
    'A',
    'resultats_obtenus',
    'Le(s) résultat(s) obtenu(s)',
    'Quels résultats ont été obtenus ?',
    'Présente la réponse apportée au client, le résultat du suivi ou du traitement, ainsi que les effets observés sur la satisfaction ou la relation commerciale.',
    '[]'::jsonb,
    false,
    6
  ),
  (
    'E32',
    'A',
    'propositions_amelioration',
    'Proposition(s) d’amélioration',
    'Quelles améliorations pourrais-tu proposer ?',
    'Propose des solutions réalistes pour améliorer le suivi, la qualité du service, l’information du client, les délais ou la satisfaction.',
    '[]'::jsonb,
    false,
    7
  ),
  (
    'E32',
    'A',
    'bilan_personnel',
    'Bilan personnel',
    'Quel bilan personnel tires-tu de cette activité ?',
    'Explique ce que tu as appris, les compétences développées, les difficultés rencontrées et les progrès qu’il te reste à accomplir.',
    '[]'::jsonb,
    false,
    8
  )
on conflict on constraint section_templates_epreuve_mcv_option_section_key_key
do update set
  section_title = excluded.section_title,
  student_question = excluded.student_question,
  help_text = excluded.help_text,
  linked_competencies = excluded.linked_competencies,
  is_core = excluded.is_core,
  sort_order = excluded.sort_order;

create or replace view public.fiche_sections_dashboard as
select
  fs.id,
  fs.fiche_id,
  fs.section_key,
  fs.section_title,
  fs.content,
  fs.completion_status,
  fs.character_count,
  fs.linked_competencies,
  fs.sort_order,
  fs.created_at,
  fs.updated_at,
  f.epreuve,
  st.student_question,
  st.help_text,
  st.is_core,
  fs.teacher_feedback
from public.fiche_sections fs
join public.fiches f on f.id = fs.fiche_id
left join public.section_templates st
  on st.epreuve = f.epreuve
 and st.mcv_option = case
   when f.mcv_option in ('A', 'B') then f.mcv_option
   else 'B'
 end
 and st.section_key = fs.section_key;
