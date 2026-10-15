-- Tipos de documento nuevos para enlaces públicos (7b). Van en su propia migración:
-- un valor de enum recién agregado no se puede usar en la misma transacción.
alter type public.tipo_documento add value if not exists 'brief';
alter type public.tipo_documento add value if not exists 'acta';
