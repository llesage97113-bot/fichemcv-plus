-- Renseigne la date d'archivage lors du passage effectif au statut archivee.

CREATE OR REPLACE FUNCTION public.archive_fiche(p_fiche_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if v_fiche.status <> 'verrouillee' then
    raise exception 'Seule une fiche verrouillée peut être archivée. Statut actuel : %', v_fiche.status;
  end if;

  update public.fiches
  set
    status = 'archivee',
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
  where id = p_fiche_id;

  return jsonb_build_object(
    'success', true,
    'fiche_id', p_fiche_id,
    'previous_status', v_fiche.status,
    'status', 'archivee'
  );
end;
$function$
