-- Muestra en ranking el total de pronosticos guardados:
-- partidos + grupos + podio.
-- No modifica datos.

drop view if exists public.ranking_view;

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
