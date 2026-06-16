# Polla de partidos

MVP React + Vite + Supabase para entrar con usuario + PIN, guardar pronosticos, calcular puntos y ver ranking.

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` desde `.env.example`:

```env
VITE_SUPABASE_URL=TU_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

3. Ejecuta la app:

```bash
npm run dev
```

## Deploy automatico a GitHub Pages

El pipeline esta en:

```txt
.github/workflows/deploy-pages.yml
```

Se ejecuta en cada push a `main` y tambien manualmente desde `Actions > Deploy a GitHub Pages > Run workflow`.

Pasos una sola vez en GitHub:

1. Ve a `Settings > Pages`.
2. En `Source`, selecciona `GitHub Actions`.
3. Ve a `Settings > Secrets and variables > Actions > Secrets`.
4. Crea estos `Repository secrets`:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

5. Haz push a `main`.

El build usa:

```txt
VITE_BASE=/polla_mundialista/
```

Si el repo en GitHub tiene otro nombre, cambia `VITE_BASE` en `.github/workflows/deploy-pages.yml`.

## Subir Supabase desde este proyecto

Las migraciones estan en `supabase/migrations`.

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Alternativa manual: ejecutar `supabase/schema.sql` en Supabase SQL Editor.

## Que crea Supabase

- Tablas: `players`, `matches`, `predictions`.
- Funcion RPC: `calculate_prediction_points`.
- Vista: `ranking_view`.
- Vista: `prediction_details_view`.
- Constraint: `players.name + players.pin` unico.

## Flujo actual

- Login por `Usuario` + `PIN`.
- El PIN se puede repetir entre jugadores.
- Partidos futuros: permiten crear/editar pronostico.
- Partidos iniciados: quedan en modo solo lectura.
- Boton `Actualizar puntajes`: ejecuta `calculate_prediction_points`.
- Trigger automatico: recalcula puntos cuando se actualiza `home_score`, `away_score` o `status`.
- `Mis resultados`: muestra pronostico, resultado real y puntos.
- `Ranking general`: ordena por puntos desc y nombre asc.

## Flujo de prueba

1. Ejecuta migraciones con `npx supabase db push`.
2. Entra con:

```txt
Usuario: Carlos
PIN: 1111
```

3. Guarda pronosticos para partidos futuros.
4. En Supabase, edita un partido en `matches`:

```txt
home_score = 2
away_score = 1
status = finished
```

5. Vuelve a la app.
6. Presiona `Actualizar puntajes` si no ves el cambio inmediato.
7. Verifica:

- Puntaje actual del jugador.
- Puntos por partido en `Mis resultados`.
- Ranking general actualizado.

## Trigger opcional

Para recalcular automaticamente al editar resultados:

```sql
create or replace function trigger_calculate_prediction_points()
returns trigger
language plpgsql
as $$
begin
  perform calculate_prediction_points();
  return new;
end;
$$;

drop trigger if exists update_points_after_match_update on matches;

create trigger update_points_after_match_update
after update of home_score, away_score, status
on matches
for each row
execute function trigger_calculate_prediction_points();
```

## PINs de prueba

- Carlos: `1111`
- Andres: `2222`
- Felipe: `3333`
