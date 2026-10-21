-- T-30 · PRO-002 · D4 · Estado `anulada` para las cotizaciones aceptadas.
--
-- Va en un archivo aparte: un valor nuevo de un enum no se puede usar en la misma transacción que lo
-- crea, y la migración siguiente (`anulaciones`) ya lo usa en sus funciones.

alter type public.estado_cotizacion add value if not exists 'anulada';
