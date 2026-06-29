-- =========================================================
-- CARGA DE RESULTADOS REALES + PRONOSTICOS DE JUGADORES
-- Mundial 2026 - Fase de grupos (primera jornada)
-- =========================================================
--
-- Notas de validacion (cruce con el seed de init.db):
--  * Los nombres de equipo del archivo original venian en ingles.
--    Aqui se referencia cada partido por su external_id (no por
--    nombre) para evitar ambiguedad con los partidos de vuelta.
--  * Mapeo ingles -> seed (es):
--      Mexico vs South Africa ............. 66456904  Mexico / Sudafrica
--      Korea Republic vs Czechia .......... 66456906  Corea del Sur / Chequia
--      Canada vs Bosnia and Herzegovina ... 66456916  Canada / Bosnia y Herzegovina
--      Qatar vs Switzerland ............... 66456918  Catar / Suiza
--      Brazil vs Morocco .................. 66456928  Brasil / Marruecos
--      USA vs Paraguay .................... 66456940  Estados Unidos / Paraguay
--      Haiti vs Scotland .................. 66456930  Haiti / Escocia
--      Australia vs Turkiye ............... 66456942  Australia / Turquia
--      Germany vs Curacao ................. 66457070  Alemania / Curazao
--      Netherlands vs Japan ............... 66456968  Paises Bajos / Japon
--      Cote d'Ivoire vs Ecuador ........... 66457072  Costa de Marfil / Ecuador
--      Sweden vs Tunisia .................. 66456970  Suecia / Tunez
--      Belgium vs Egypt ................... 66456982  Belgica / Egipto
--      Iran vs New Zealand ................ 66456984  Iran / Nueva Zelanda
--      Spain vs Cape Verde ................ 66456994  Espana / Cabo Verde
--      Uruguay vs Saudi Arabia ............ 66456996  Arabia Saudita / Uruguay  (*INVERTIDO*)
--
--  * (*INVERTIDO*) En el seed el local es Arabia Saudita y el
--    visitante Uruguay. La tabla original venia como "Uruguay vs
--    Saudi Arabia", por lo que para ese partido se voltea el
--    marcador real y todos los pronosticos (home<->away).
--
--  * Los puntos se recalculan automaticamente por el trigger
--    al actualizar el marcador de cada partido; aun asi se llama
--    calculate_prediction_points() al final por seguridad.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) RESULTADOS REALES (marcador en orientacion del seed)
-- ---------------------------------------------------------
update public.matches as m
set home_score = r.home_score,
    away_score = r.away_score,
    status     = 'finished'
from (
  values
    ('66456904', 2, 0),  -- Mexico 2 - 0 Sudafrica
    ('66456906', 2, 1),  -- Corea del Sur 2 - 1 Chequia
    ('66456916', 1, 1),  -- Canada 1 - 1 Bosnia y Herzegovina
    ('66456918', 1, 1),  -- Catar 1 - 1 Suiza
    ('66456928', 1, 1),  -- Brasil 1 - 1 Marruecos
    ('66456940', 4, 1),  -- Estados Unidos 4 - 1 Paraguay
    ('66456930', 0, 1),  -- Haiti 0 - 1 Escocia
    ('66456942', 2, 0),  -- Australia 2 - 0 Turquia
    ('66457070', 7, 1),  -- Alemania 7 - 1 Curazao
    ('66456968', 2, 2),  -- Paises Bajos 2 - 2 Japon
    ('66457072', 1, 0),  -- Costa de Marfil 1 - 0 Ecuador
    ('66456970', 5, 1),  -- Suecia 5 - 1 Tunez
    ('66456982', 1, 1),  -- Belgica 1 - 1 Egipto
    ('66456984', 2, 2),  -- Iran 2 - 2 Nueva Zelanda
    ('66456994', 0, 0),  -- Espana 0 - 0 Cabo Verde
    ('66456996', 1, 1)   -- Arabia Saudita 1 - 1 Uruguay (invertido: era Uruguay 1-1 Saudi)
) as r(external_id, home_score, away_score)
where m.external_id = r.external_id;

-- ---------------------------------------------------------
-- 2) PRONOSTICOS DE JUGADORES
--    (marcador en orientacion del seed: home<->away ya
--     invertido para el partido 66456996)
-- ---------------------------------------------------------
insert into public.predictions
  (player_id, match_id, predicted_home_score, predicted_away_score)
select pl.id, m.id, v.ph, v.pa
from (
  values
    -- ===== Ricardo =====
    ('Ricardo','66456904',2,1),
    ('Ricardo','66456906',1,1),
    ('Ricardo','66456916',2,0),
    ('Ricardo','66456918',0,2),
    ('Ricardo','66456928',2,0),
    ('Ricardo','66456940',1,1),
    ('Ricardo','66456930',0,2),
    ('Ricardo','66456942',0,2),
    ('Ricardo','66457070',3,0),
    ('Ricardo','66456968',1,1),
    ('Ricardo','66457072',0,2),
    ('Ricardo','66456970',2,0),
    ('Ricardo','66456982',2,0),
    ('Ricardo','66456984',1,2),
    ('Ricardo','66456994',3,0),
    ('Ricardo','66456996',0,2),   -- era Uruguay 2-0 Saudi -> invertido
    -- ===== Andres =====
    ('Andrés','66456904',2,1),
    ('Andrés','66456906',1,0),
    ('Andrés','66456916',1,0),
    ('Andrés','66456918',0,1),
    ('Andrés','66456928',3,0),
    ('Andrés','66456940',0,2),
    ('Andrés','66456930',0,1),
    ('Andrés','66456942',1,2),
    ('Andrés','66456968',1,2),
    ('Andrés','66457072',0,2),
    ('Andrés','66456970',2,1),
    -- ===== Virginia =====
    ('Virginia','66456904',2,2),
    ('Virginia','66456906',2,1),
    ('Virginia','66456916',1,1),
    ('Virginia','66456918',1,1),
    ('Virginia','66456928',3,0),
    ('Virginia','66456940',3,2),
    ('Virginia','66456930',1,1),
    ('Virginia','66456942',2,2),
    ('Virginia','66457070',3,2),
    ('Virginia','66456968',0,2),
    ('Virginia','66457072',1,3),
    ('Virginia','66456982',1,0),
    ('Virginia','66456984',2,2),
    ('Virginia','66456994',3,0),
    ('Virginia','66456996',2,2),   -- era Uruguay 2-2 Saudi -> invertido (igual)
    -- ===== Alexandra =====
    ('Alexandra','66456904',2,0),
    ('Alexandra','66456906',1,0),
    ('Alexandra','66456916',1,1),
    ('Alexandra','66456940',0,1),
    -- ===== Ederson =====
    ('Ederson','66456904',2,0),
    ('Ederson','66456906',1,1),
    ('Ederson','66456916',3,0),
    ('Ederson','66456918',0,2),
    ('Ederson','66456928',2,1),
    ('Ederson','66456940',2,1),
    ('Ederson','66456930',0,2),
    ('Ederson','66456942',0,3),
    ('Ederson','66457070',5,1),
    ('Ederson','66456968',2,1),
    ('Ederson','66457072',1,1),
    ('Ederson','66456970',2,0),
    ('Ederson','66456982',2,0),
    ('Ederson','66456984',1,0),
    ('Ederson','66456996',1,2),   -- era Uruguay 2-1 Saudi -> invertido
    -- ===== Sebastian =====
    ('Sebastian','66456904',2,0),
    ('Sebastian','66456906',2,0),
    ('Sebastian','66456916',1,0),
    ('Sebastian','66456918',0,4),
    ('Sebastian','66456928',1,2),
    ('Sebastian','66456940',2,1),
    ('Sebastian','66456930',0,3),
    ('Sebastian','66456942',1,3),
    ('Sebastian','66457070',4,0),
    ('Sebastian','66456968',1,2),
    -- ===== Jean Pierre =====
    ('Jean Pierre','66456904',2,1),
    ('Jean Pierre','66456906',2,2),
    ('Jean Pierre','66456916',2,1),
    ('Jean Pierre','66456940',0,2),
    -- ===== Cristian =====
    ('Cristian','66456904',2,0),
    ('Cristian','66456906',2,1),
    ('Cristian','66456916',2,1),
    ('Cristian','66456940',1,0),
    -- ===== Simon =====
    ('Simón','66456904',2,1),
    ('Simón','66456906',2,1),
    ('Simón','66456916',1,0),
    ('Simón','66456940',1,3),
    -- ===== Lucerito =====
    ('Lucerito','66456904',2,1),
    ('Lucerito','66456906',1,1),
    ('Lucerito','66456916',2,1),
    ('Lucerito','66456940',2,0),
    ('Lucerito','66457070',2,0),
    ('Lucerito','66456968',2,1),
    ('Lucerito','66457072',0,1),
    ('Lucerito','66456982',2,0),
    ('Lucerito','66456994',2,0),
    ('Lucerito','66456996',1,2),   -- era Uruguay 2-1 Saudi -> invertido
    -- ===== Tatiana =====
    ('Tatiana','66456904',2,0),
    ('Tatiana','66456906',1,1),
    ('Tatiana','66456916',2,1),
    ('Tatiana','66456940',1,0)
) as v(player_name, external_id, ph, pa)
join public.players pl on pl.name = v.player_name
join public.matches m  on m.external_id = v.external_id
on conflict (player_id, match_id) do update
  set predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      updated_at = now();

-- ---------------------------------------------------------
-- 3) Recalcular puntos (por seguridad)
-- ---------------------------------------------------------
select public.calculate_prediction_points();

commit;

-- ---------------------------------------------------------
-- VERIFICACION (opcional, ejecutar aparte):
--   select name, total_points, total_predictions from ranking_view;
-- ---------------------------------------------------------
