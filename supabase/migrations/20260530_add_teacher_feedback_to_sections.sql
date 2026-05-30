-- Ajout des remarques professeur par section de fiche.
-- Ces remarques sont séparées du contenu élève et visibles côté élève.

alter table fiche_sections
add column if not exists teacher_feedback text;

create or replace view fiche_sections_dashboard as
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
from fiche_sections fs
join fiches f on f.id = fs.fiche_id
left join section_templates st
  on st.epreuve = f.epreuve
 and st.section_key = fs.section_key;
