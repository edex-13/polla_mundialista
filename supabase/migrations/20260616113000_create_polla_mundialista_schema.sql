create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  created_at timestamp with time zone default now()
);

alter table public.players
drop constraint if exists players_pin_key;

alter table public.players
add constraint players_name_pin_key unique (name, pin);

create table if not exists public.matches (
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

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  points integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(player_id, match_id)
);

insert into public.players (name, pin)
values
  ('Carlos', '1111'),
  ('Andres', '2222'),
  ('Felipe', '3333')
on conflict (name, pin) do nothing;

insert into public.matches (match_date, match_time, home_team, away_team)
select current_date, match_time, home_team, away_team
from (
  values
    ('15:00'::time, 'Colombia', 'Brasil'),
    ('17:00'::time, 'Argentina', 'Chile'),
    ('19:00'::time, 'Uruguay', 'Peru')
) as seed_matches(match_time, home_team, away_team)
where not exists (
  select 1
  from public.matches
  where matches.match_date = current_date
    and matches.match_time = seed_matches.match_time
    and matches.home_team = seed_matches.home_team
    and matches.away_team = seed_matches.away_team
);
