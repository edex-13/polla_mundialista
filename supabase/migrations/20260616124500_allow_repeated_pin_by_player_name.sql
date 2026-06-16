alter table public.players
drop constraint if exists players_pin_key;

alter table public.players
drop constraint if exists players_name_pin_key;

alter table public.players
add constraint players_name_pin_key unique (name, pin);
