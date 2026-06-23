-- Métadonnées nécessaires aux futurs exports Word/PDF des fiches archivées.
-- Migration strictement additive : aucune suppression, aucun backfill,
-- aucune modification de vue et aucune modification de fonction RPC.

alter table public.classes
  add column if not exists mcv_option text,
  add column if not exists school_name text,
  add column if not exists exam_session text;

comment on column public.classes.mcv_option is
  'Option MCV par défaut de la classe : A Commerce ou B Vente. Sert à initialiser les élèves rattachés à la classe.';

comment on column public.classes.school_name is
  'Nom de l''établissement utilisé pour les documents administratifs et les futurs exports.';

comment on column public.classes.exam_session is
  'Session d''examen, distincte de l''année scolaire, généralement exprimée sur quatre chiffres.';

alter table public.students
  add column if not exists mcv_option text;

comment on column public.students.mcv_option is
  'Option MCV métier de l''élève : A Commerce ou B Vente. Ne doit pas être déduite du nom de classe.';

alter table public.fiches
  add column if not exists mcv_option text,
  add column if not exists archived_at timestamptz,
  add column if not exists student_role text not null default '',
  add column if not exists realization_conditions text not null default '';

comment on column public.fiches.mcv_option is
  'Snapshot stable de l''option MCV de la fiche, destiné notamment aux exports Word/PDF archivés.';

comment on column public.fiches.archived_at is
  'Date réelle d''archivage de la fiche, à renseigner par la fonction d''archivage.';

comment on column public.fiches.student_role is
  'Rôle de l''élève dans la situation professionnelle décrite par la fiche.';

comment on column public.fiches.realization_conditions is
  'Conditions de réalisation de la situation professionnelle décrite par la fiche.';

do $$
begin
  alter table public.classes
    add constraint classes_mcv_option_check
    check (mcv_option is null or mcv_option in ('A', 'B'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.students
    add constraint students_mcv_option_check
    check (mcv_option is null or mcv_option in ('A', 'B'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.fiches
    add constraint fiches_mcv_option_check
    check (mcv_option is null or mcv_option in ('A', 'B'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.classes
    add constraint classes_exam_session_check
    check (exam_session is null or exam_session ~ '^[0-9]{4}$');
exception when duplicate_object then null;
end $$;
