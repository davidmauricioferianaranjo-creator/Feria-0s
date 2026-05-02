# Feria OS

Sistema operativo interno de **Feria Design Studio** — plataforma de gestión para estudio de branding.

## Stack
- **Frontend:** React 18 + React Router v7 + Recharts + DnD Kit
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Email:** Resend (`hola@feria.design`)
- **Pagos:** Stripe (payment links)
- **Mensajes:** Meta API (WhatsApp Business + Instagram + Messenger)
- **Reuniones:** Zoom API

## Correr localmente

```bash
npm install
cp .env.example .env   # completar variables
npm start              # → http://localhost:3000
```

## Variables de entorno (.env)

```
REACT_APP_SUPABASE_URL=https://dldykrsikwbibiegtyyb.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
# REACT_APP_USE_SEED=true   # solo en dev para datos de ejemplo
```

## Módulos

| Módulo | Estado | Fuente de datos |
|--------|--------|-----------------|
| Dashboard | ✅ Producción | Supabase |
| CRM | ✅ Producción | Supabase |
| Proyectos/Kanban | ✅ Producción | Supabase |
| Contratos | ✅ Producción | Supabase |
| Cotizaciones | ✅ Producción | Supabase + Resend + WhatsApp |
| Finanzas | ✅ Producción | Supabase + Stripe |
| Mensajes | ✅ Producción | Supabase + Meta API |
| Calendario | ✅ Producción | Supabase (vacío hasta primera reunión) |
| Inteligencia | ✅ Producción | Claude API via Edge Function |
| Post-venta | ✅ Producción | Supabase + Resend + WhatsApp |
| Admin | ✅ Producción | Supabase |
| Portal cliente | ✅ Producción | Supabase |
| Marketing | 🔄 Parcial | Local + Meta Ads API (pendiente) |

## Migraciones SQL

Correr en orden en Supabase SQL Editor:
1. `supabase/migrations/001_extensions.sql`
2. `supabase/migrations/002_profiles_auth.sql`
3. `supabase/migrations/003_core_tables.sql`
4. `supabase/migrations/004_business_tables.sql`

## Edge Functions

```bash
# Desplegar todas
supabase functions deploy --project-ref dldykrsikwbibiegtyyb --no-verify-jwt

# O individual
supabase functions deploy send-email --project-ref dldykrsikwbibiegtyyb --no-verify-jwt
```

## Usuarios

| Email | Rol |
|-------|-----|
| david@feriadesign.com | admin |
| selene@feriadesign.com | crm |
| anthea@feriadesign.com | creativo |

## Nota v67 — cierre operativo

Ver `CIERRE_V67.md` para los pasos de roles, demo, portal cliente, Stripe, Supabase y despliegue.
