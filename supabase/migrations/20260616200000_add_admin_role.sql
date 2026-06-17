-- Rol de administrador para la polla.
--
-- SEGURIDAD DE DATOS:
--   - Solo AGREGA una columna con default y crea un jugador admin si no existe.
--   - No borra, no modifica ni renombra datos existentes.
--   - `add column if not exists` y el insert condicional son idempotentes:
--     correr la migración varias veces no duplica ni rompe nada.

-- 1. Bandera de administrador en players (por defecto false para todos).
alter table public.players
  add column if not exists is_admin boolean not null default false;

-- 2. Usuario administrador. Cambia el PIN luego si quieres (ver nota abajo).
--    Se respeta la restricción unique(name, pin): si ya existe 'admin' con
--    este PIN no se inserta de nuevo, solo se asegura que sea admin.
insert into public.players (name, pin, is_admin)
values ('admin', '9999', true)
on conflict (name, pin) do update set is_admin = true;
