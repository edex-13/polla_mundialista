-- Ajuste del sistema de puntaje:
--   * 3 puntos por acertar el marcador EXACTO (ej. 4-1).
--   * 1 punto por acertar solo la tendencia (gana local / gana visitante / empate).
--   * 0 puntos si el partido no ha finalizado o no se acertó nada.
--
-- SEGURIDAD DE DATOS:
--   - Solo se reemplaza la función de cálculo (create or replace), no se borra nada.
--   - `points` es un valor DERIVADO: se recalcula desde las predicciones y los
--     resultados reales, que son los datos primarios y NO se tocan aquí.
--   - La función es idempotente: ejecutarla varias veces produce el mismo
--     resultado. El `select` final solo reaplica el nuevo baremo a lo ya guardado.

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

      -- Marcador exacto: 3 puntos
      when prediction.predicted_home_score = football_match.home_score
        and prediction.predicted_away_score = football_match.away_score
      then 3

      -- Tendencia acertada (gana el local): 1 punto
      when prediction.predicted_home_score > prediction.predicted_away_score
        and football_match.home_score > football_match.away_score
      then 1

      -- Tendencia acertada (gana el visitante): 1 punto
      when prediction.predicted_home_score < prediction.predicted_away_score
        and football_match.home_score < football_match.away_score
      then 1

      -- Tendencia acertada (empate): 1 punto
      when prediction.predicted_home_score = prediction.predicted_away_score
        and football_match.home_score = football_match.away_score
      then 1

      else 0
    end
  from public.matches as football_match
  where prediction.match_id = football_match.id;
end;
$$;

-- Reaplica el nuevo baremo a los puntajes ya calculados de partidos finalizados.
-- Seguro de correr: recalcula desde cero, no acumula.
select public.calculate_prediction_points();
