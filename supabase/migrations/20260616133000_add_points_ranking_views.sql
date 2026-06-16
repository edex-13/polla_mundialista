alter table public.predictions
add column if not exists points integer default 0;

create or replace function public.calculate_prediction_points()
returns void
language plpgsql
as $$
begin
  update public.predictions as prediction
  set points =
    case
      when football_match.status != 'finished'
        or football_match.home_score is null
        or football_match.away_score is null
      then 0

      when prediction.predicted_home_score = football_match.home_score
        and prediction.predicted_away_score = football_match.away_score
      then 2

      when prediction.predicted_home_score > prediction.predicted_away_score
        and football_match.home_score > football_match.away_score
      then 1

      when prediction.predicted_home_score < prediction.predicted_away_score
        and football_match.home_score < football_match.away_score
      then 1

      when prediction.predicted_home_score = prediction.predicted_away_score
        and football_match.home_score = football_match.away_score
      then 1

      else 0
    end
  from public.matches as football_match
  where prediction.match_id = football_match.id;
end;
$$;

create or replace view public.ranking_view as
select
  player.id as player_id,
  player.name,
  coalesce(sum(prediction.points), 0) as total_points,
  count(prediction.id) as total_predictions
from public.players as player
left join public.predictions as prediction on prediction.player_id = player.id
group by player.id, player.name
order by total_points desc, player.name asc;

create or replace view public.prediction_details_view as
select
  prediction.id as prediction_id,
  player.id as player_id,
  player.name as player_name,
  football_match.id as match_id,
  football_match.match_date,
  football_match.match_time,
  football_match.home_team,
  football_match.away_team,
  prediction.predicted_home_score,
  prediction.predicted_away_score,
  football_match.home_score,
  football_match.away_score,
  football_match.status,
  prediction.points
from public.predictions as prediction
join public.players as player on player.id = prediction.player_id
join public.matches as football_match on football_match.id = prediction.match_id
order by football_match.match_date desc, football_match.match_time asc;
