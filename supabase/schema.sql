create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  created_at timestamp with time zone default now(),
  unique(name, pin)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  match_time time,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  status text default 'scheduled',
  created_at timestamp with time zone default now()
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  points integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(player_id, match_id)
);

create or replace function calculate_prediction_points()
returns void
language plpgsql
as $$
begin
  update predictions p
  set points =
    case
      when m.status != 'finished'
        or m.home_score is null
        or m.away_score is null
      then 0
      when p.predicted_home_score = m.home_score
        and p.predicted_away_score = m.away_score
      then 2
      when p.predicted_home_score > p.predicted_away_score
        and m.home_score > m.away_score
      then 1
      when p.predicted_home_score < p.predicted_away_score
        and m.home_score < m.away_score
      then 1
      when p.predicted_home_score = p.predicted_away_score
        and m.home_score = m.away_score
      then 1
      else 0
    end
  from matches m
  where p.match_id = m.id;
end;
$$;

create or replace view ranking_view as
select
  p.id as player_id,
  p.name,
  coalesce(sum(pr.points), 0) as total_points,
  count(pr.id) as total_predictions
from players p
left join predictions pr on pr.player_id = p.id
group by p.id, p.name
order by total_points desc, p.name asc;

create or replace view prediction_details_view as
select
  pr.id as prediction_id,
  p.id as player_id,
  p.name as player_name,
  m.id as match_id,
  m.match_date,
  m.match_time,
  m.home_team,
  m.away_team,
  pr.predicted_home_score,
  pr.predicted_away_score,
  m.home_score,
  m.away_score,
  m.status,
  pr.points
from predictions pr
join players p on p.id = pr.player_id
join matches m on m.id = pr.match_id
order by m.match_date desc, m.match_time asc;

insert into players (name, pin) values
('Carlos', '1111'),
('Andres', '2222'),
('Felipe', '3333');

insert into matches (match_date, match_time, home_team, away_team) values
(current_date, '15:00', 'Colombia', 'Brasil'),
(current_date, '17:00', 'Argentina', 'Chile'),
(current_date, '19:00', 'Uruguay', 'Peru');
