-- Prediccion de fase de grupos: primero y segundo de cada grupo.
--
-- Puntaje:
--   * 1er puesto exacto: +0.5
--   * 2do puesto exacto: +0.5
--
-- Seguridad de datos:
--   - Solo crea tablas nuevas y reemplaza funciones/vista.
--   - No borra ni modifica filas existentes de jugadores, partidos,
--     predicciones de partidos ni podio.
--   - Idempotente para poder ejecutarse sin duplicar estructura.

alter table public.matches
add column if not exists group_name text;

create table if not exists public.group_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  group_name text not null,
  first_place text not null,
  second_place text not null,
  points numeric(5, 1) not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (player_id, group_name)
);

create table if not exists public.group_results (
  group_name text primary key,
  first_place text not null,
  second_place text not null,
  updated_at timestamp with time zone default now()
);

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

create or replace function public.trigger_calculate_group_points()
returns trigger
language plpgsql
as $$
begin
  perform public.calculate_group_points();
  return new;
end;
$$;

drop trigger if exists update_group_points_after_result on public.group_results;

create trigger update_group_points_after_result
after insert or update of first_place, second_place
on public.group_results
for each row
execute function public.trigger_calculate_group_points();

drop trigger if exists update_group_points_after_prediction on public.group_predictions;

create trigger update_group_points_after_prediction
after insert or update of first_place, second_place
on public.group_predictions
for each row
execute function public.trigger_calculate_group_points();

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
