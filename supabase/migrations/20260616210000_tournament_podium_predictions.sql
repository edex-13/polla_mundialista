-- Pronóstico del podio del Mundial (1º, 2º, 3º) con su propio puntaje.
--
-- Reglas de puntaje (por cada uno de los 3 equipos elegidos):
--   * Acierta la posición EXACTA:  campeón = 10, subcampeón = 8, tercero = 5.
--   * El equipo está en el podio real pero en OTRA posición: +1.
--   * No está en el podio: 0.
--   (La posición exacta NO suma además el +1; son excluyentes.)
--
-- SEGURIDAD DE DATOS:
--   - Solo CREA tablas/funciones nuevas y hace create-or-replace de la vista de
--     ranking (no destructivo). No toca ni borra datos existentes.
--   - Todo es idempotente (if not exists / create or replace).

-- 1. Podio pronosticado por cada jugador (una fila por jugador).
create table if not exists public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references public.players(id) on delete cascade,
  champion text not null,
  runner_up text not null,
  third_place text not null,
  points integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Podio REAL del torneo (una sola fila, la registra el admin).
--    Se usa un id fijo para que siempre haya como máximo una fila.
create table if not exists public.tournament_result (
  id integer primary key default 1,
  champion text,
  runner_up text,
  third_place text,
  updated_at timestamp with time zone default now(),
  constraint tournament_result_single_row check (id = 1)
);

-- Asegura que la fila única exista (sin podio aún).
insert into public.tournament_result (id)
values (1)
on conflict (id) do nothing;

-- 3. Cálculo de puntos del podio para todos los jugadores.
create or replace function public.calculate_tournament_points()
returns void
language plpgsql
as $$
declare
  real_champion   text;
  real_runner_up  text;
  real_third      text;
begin
  select champion, runner_up, third_place
  into real_champion, real_runner_up, real_third
  from public.tournament_result
  where id = 1;

  update public.tournament_predictions as tp
  set
    points =
      -- Campeón pronosticado
      case
        when tp.champion is not distinct from real_champion and real_champion is not null then 10
        when tp.champion in (real_champion, real_runner_up, real_third)
          and tp.champion is not null then 1
        else 0
      end
      -- Subcampeón pronosticado
      + case
        when tp.runner_up is not distinct from real_runner_up and real_runner_up is not null then 8
        when tp.runner_up in (real_champion, real_runner_up, real_third)
          and tp.runner_up is not null then 1
        else 0
      end
      -- Tercero pronosticado
      + case
        when tp.third_place is not distinct from real_third and real_third is not null then 5
        when tp.third_place in (real_champion, real_runner_up, real_third)
          and tp.third_place is not null then 1
        else 0
      end,
    updated_at = now();
end;
$$;

-- 4. Trigger: al cambiar el podio real, recalcula los puntos del podio.
create or replace function public.trigger_calculate_tournament_points()
returns trigger
language plpgsql
as $$
begin
  perform public.calculate_tournament_points();
  return new;
end;
$$;

drop trigger if exists update_tournament_points on public.tournament_result;

create trigger update_tournament_points
after insert or update of champion, runner_up, third_place
on public.tournament_result
for each row
execute function public.trigger_calculate_tournament_points();

-- 5. Ranking que SUMA los puntos de partidos + los puntos del podio.
--    create or replace: la vista mantiene su nombre y columnas; el frontend
--    sigue leyendo total_points/total_predictions igual que antes.
create or replace view public.ranking_view as
select
  player.id as player_id,
  player.name,
  coalesce(match_points.total, 0) + coalesce(tp.points, 0) as total_points,
  coalesce(match_points.predictions_count, 0) as total_predictions
from public.players as player
left join (
  select
    prediction.player_id,
    sum(prediction.points) as total,
    count(prediction.id) as predictions_count
  from public.predictions as prediction
  group by prediction.player_id
) as match_points on match_points.player_id = player.id
left join public.tournament_predictions as tp on tp.player_id = player.id
order by total_points desc, player.name asc;
