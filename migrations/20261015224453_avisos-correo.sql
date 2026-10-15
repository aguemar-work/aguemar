-- Fase 11 · Avisos por correo: cada empresa puede dejar de recibirlos (por defecto, sí los recibe).
alter table public.clientes add column if not exists avisos_correo boolean not null default true;
