-- Fase 9 · Los informes también se comparten por enlace público.
-- (Valor de enum en su propia migración: se usa recién en la siguiente.)
alter type public.tipo_documento add value if not exists 'informe';
