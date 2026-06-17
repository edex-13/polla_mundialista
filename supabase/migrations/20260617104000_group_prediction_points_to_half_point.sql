-- Cambia grupos a 0.5 puntos por acierto exacto.
-- Seguro para produccion: conserva filas existentes y recalcula.

drop view if exists public.ranking_view;

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

create or replace view public.ranking_view as
select
  player.id as player_id,
  player.name,
  coalesce(match_points.total, 0)
    + coalesce(group_points.total, 0)
    + coalesce(tournament_prediction.points, 0) as total_points,
  coalesce(match_points.predictions_count, 0)
    + coalesce(group_points.predictions_count, 0)
    + case when tournament_prediction.id is null then 0 else 1 end as total_predictions
from public.players as player
left join (
  select
    prediction.player_id,
    sum(prediction.points) as total,
    count(prediction.id) as predictions_count
  from public.predictions as prediction
  group by prediction.player_id
) as match_points on match_points.player_id = player.id
left join (
  select
    group_prediction.player_id,
    sum(group_prediction.points) as total,
    count(group_prediction.id) as predictions_count
  from public.group_predictions as group_prediction
  group by group_prediction.player_id
) as group_points on group_points.player_id = player.id
left join public.tournament_predictions as tournament_prediction
  on tournament_prediction.player_id = player.id
order by total_points desc, player.name asc;
