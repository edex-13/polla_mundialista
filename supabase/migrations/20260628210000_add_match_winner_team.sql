-- Cuadro de eliminatorias: guarda qué equipo avanza de cada partido.
-- Aditivo y reversible; no toca datos existentes.
alter table public.matches
  add column if not exists winner_team text;
