create or replace function public.trigger_calculate_prediction_points()
returns trigger
language plpgsql
as $$
begin
  perform public.calculate_prediction_points();
  return new;
end;
$$;

drop trigger if exists update_points_after_match_update on public.matches;

create trigger update_points_after_match_update
after update of home_score, away_score, status
on public.matches
for each row
execute function public.trigger_calculate_prediction_points();
