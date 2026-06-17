-- Cambia grupos a 0.5 puntos por acierto exacto.
-- Seguro para produccion: conserva filas existentes y recalcula.

alter table public.group_predictions
alter column points type numeric(5, 1)
using points::numeric(5, 1);

alter table public.group_predictions
alter column points set default 0;

create or replace function public.calculate_group_points()
returns void
language plpgsql
as $$
begin
  update public.group_predictions as group_prediction
  set
    points =
      case
        when group_prediction.first_place is not distinct from group_result.first_place then 0.5
        else 0
      end
      + case
        when group_prediction.second_place is not distinct from group_result.second_place then 0.5
        else 0
      end,
    updated_at = now()
  from public.group_results as group_result
  where group_prediction.group_name = group_result.group_name;

  update public.group_predictions as group_prediction
  set points = 0,
      updated_at = now()
  where not exists (
    select 1
    from public.group_results as group_result
    where group_result.group_name = group_prediction.group_name
  );
end;
$$;

select public.calculate_group_points();
