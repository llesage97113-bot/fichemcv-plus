-- Autorise la validation directe des fiches soumises ou corrigées.

create or replace function public.validate_fiche(p_fiche_id uuid)
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

  if v_fiche.status not in ('soumise', 'corrigee') then
    raise exception 'Seule une fiche soumise ou corrigée peut être validée. Statut actuel : %', v_fiche.status;
  end if;

  update public.fiches
  set
    status = 'validee',
    updated_at = now()
  where id = p_fiche_id;

  return jsonb_build_object(
    'success', true,
    'fiche_id', p_fiche_id,
    'previous_status', v_fiche.status,
    'status', 'validee'
  );
end;
$function$;
