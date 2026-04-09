# Aceptacion de Facturas con Nylas v3

## Variables de entorno

Agregar en `.env.local`:

- `NYLAS_API_KEY`
- `NYLAS_CLIENT_ID`
- `NYLAS_CALLBACK_URI`
- `APP_URL`
- `NYLAS_API_URI` (opcional, default `https://api.us.nylas.com`)

## Ruta UI

- `http://localhost:3000/dashboard/acceptance-invoices`

## Endpoints creados

- `GET /api/nylas/health`
- `POST /api/nylas/provider`
- `GET/POST /api/nylas/config`
- `GET/POST /api/nylas/oauth/start`
- `GET /api/nylas/oauth/callback`
- `GET /api/nylas/messages/unprocessed`
- `POST /api/nylas/messages/process`
- `GET/POST /api/nylas/messages/processed`
- `GET /api/nylas/messages/attachment`
- `GET /api/nylas/messages/summary`
- `GET/POST /api/nylas/webhook`

## Flujo rapido

1. Guardar correo de recepcion en el bloque de configuracion.
2. Conectar OAuth con popup.
3. Revisar `No procesados`, correr `Validar correos` si se requiere bandeja principal.
4. Abrir modal de procesamiento y confirmar.
5. Revisar `Procesados` y exportar Excel.
