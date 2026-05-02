# Edge Functions — Clasificación formal de acceso

## PÚBLICAS (sin JWT — por diseño técnico del protocolo)

| Function | Razón | Protección real |
|----------|-------|-----------------|
| `meta-webhook` | Meta invoca desde sus servidores sin JWT | Verificación de `hub.verify_token`; solo escribe, no expone datos |
| `media-proxy` | `<img>/<audio>/<video>` no envían Authorization headers | CORS lista blanca; token de Meta en server-side; no expone DB |
| `verify-payment-session` | Stripe redirige al navegador con `session_id`; confirma pago post-checkout | Solo verifica sesiones reales en Stripe con `STRIPE_SECRET_KEY`; no acepta montos manuales |

## CON JWT OBLIGATORIO (autenticadas a nivel de plataforma)

Deploy sin `--no-verify-jwt`. Además tienen validación manual de rol como segunda capa.

| Function | Roles permitidos | Protección adicional |
|----------|-----------------|----------------------|
| `send-meta-message` | admin, crm | Valida JWT + rol antes de tocar Meta API |
| `claude-proxy` | admin, crm, creativo | Valida JWT + rol + modelo permitido + cap tokens |
| `create-payment-link` | admin, crm | Valida JWT + rol antes de tocar Stripe |
| `provision-client-access` | admin, crm | Valida JWT + rol; crea acceso cliente solo si ya hay contrato firmado + cobro pagado |

## INTERNA POR CORS (sin JWT — protegidas por lista blanca de origins)

Deploy con `--no-verify-jwt`. La protección es CORS explícita + lógica interna.

| Function | CORS permitido | Protección adicional |
|----------|----------------|----------------------|
| `send-email` | feria.design, localhost | Requiere templateId válido |
| `send-meeting-notification` | feria.design, localhost | — |
| `process-reminders` | supabase.co (cron interno) | Solo invocada por scheduler |

## Reglas — no negociables

1. `send-meta-message`, `claude-proxy`, `create-payment-link` y `provision-client-access` siempre con JWT obligatorio.
2. `meta-webhook` y `media-proxy` son públicas por razones técnicas reales — no por descuido.
3. Ninguna function que toque Stripe, Claude API o WhatsApp Token puede tener CORS `*`.
4. Toda nueva function debe clasificarse aquí antes del primer deploy.
