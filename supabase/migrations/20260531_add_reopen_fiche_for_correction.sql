-- Ajout d'une action de réparation workflow :
-- permet de rouvrir une fiche corrigée pour redonner la main à l'élève.

create or replace function public.reopen_fiche_for_correction(p_fiche_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fiche fiches%rowtype;
begin
  select *
  into v_fiche
  from public.fiches
  where id = p_fiche_id;

  if not found then
    raise exception 'Fiche introuvable.';
  end if;

  if v_fiche.status <> 'corrigee' then
    raise exception 'Seule une fiche corrigée peut être rouverte en correction. Statut actuel : %', v_fiche.status;
  end if;

  update public.fiches
  set
    status = 'a_corriger',
    updated_at = now()
  where id = p_fiche_id;

  return jsonb_build_object(
    'success', true,
    'fiche_id', p_fiche_id,
    'previous_status', v_fiche.status,
    'status', 'a_corriger'
  );
end;
$function$;
