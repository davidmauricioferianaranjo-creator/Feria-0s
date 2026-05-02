# ═══════════════════════════════════════════════════════════════
# Feria OS — Deploy de todas las Edge Functions a Supabase
# Ejecutar desde la carpeta raíz del proyecto (feria-os/)
# Requiere: supabase CLI instalado y sesión activa (supabase login)
# ═══════════════════════════════════════════════════════════════

$REF = "dldykrsikwbibiegtyyb"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  Feria OS — Deploy Edge Functions" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# ── CON JWT OBLIGATORIO (autenticadas) ────────────────────────
Write-Host "[1/10] create-payment-link  (Stripe)" -ForegroundColor Cyan
supabase functions deploy create-payment-link --project-ref $REF

Write-Host "[2/10] claude-proxy  (IA / Anthropic)" -ForegroundColor Cyan
supabase functions deploy claude-proxy --project-ref $REF

Write-Host "[3/10] send-meta-message  (WhatsApp)" -ForegroundColor Cyan
supabase functions deploy send-meta-message --project-ref $REF

Write-Host "[4/10] provision-client-access  (portal cliente)" -ForegroundColor Cyan
supabase functions deploy provision-client-access --project-ref $REF

# ── PÚBLICAS (sin JWT — por diseño técnico) ───────────────────
Write-Host "[5/10] meta-webhook  (webhook de Meta — sin JWT)" -ForegroundColor Cyan
supabase functions deploy meta-webhook --no-verify-jwt --project-ref $REF

Write-Host "[6/10] media-proxy  (media de Meta — sin JWT)" -ForegroundColor Cyan
supabase functions deploy media-proxy --no-verify-jwt --project-ref $REF

Write-Host "[7/10] verify-payment-session  (Stripe redirect — sin JWT)" -ForegroundColor Cyan
supabase functions deploy verify-payment-session --no-verify-jwt --project-ref $REF

# ── CORS INTERNO (sin JWT, protegidas por origin) ─────────────
Write-Host "[8/10] send-email  (Resend)" -ForegroundColor Cyan
supabase functions deploy send-email --project-ref $REF

Write-Host "[9/10] send-meeting-notification" -ForegroundColor Cyan
supabase functions deploy send-meeting-notification --project-ref $REF

Write-Host "[10/10] process-reminders  (cron)" -ForegroundColor Cyan
supabase functions deploy process-reminders --project-ref $REF

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  Deploy completado." -ForegroundColor Green
Write-Host ""
Write-Host "  Secrets necesarios en Supabase → Edge Functions → Secrets:" -ForegroundColor Yellow
Write-Host "  • STRIPE_SECRET_KEY       sk_live_..." -ForegroundColor Gray
Write-Host "  • STRIPE_WEBHOOK_SECRET   whsec_..." -ForegroundColor Gray
Write-Host "  • ANTHROPIC_API_KEY       sk-ant-..." -ForegroundColor Gray
Write-Host "  • RESEND_API_KEY          re_..." -ForegroundColor Gray
Write-Host "  • RESEND_FROM             Feria Design Studio <hola@feria.design>" -ForegroundColor Gray
Write-Host "  • WHATSAPP_TOKEN          (token de Meta)" -ForegroundColor Gray
Write-Host "  • WHATSAPP_PHONE_ID       (ID del número en Meta)" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
