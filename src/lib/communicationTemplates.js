export function renderCommunicationTemplate(text = '', values = {}) {
  return Object.entries(values).reduce((out, [key, value]) => out.split(key).join(value ?? ''), text || '');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToParagraphs(text = '') {
  return String(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin:0 0 14px;color:#4b4540;font-size:16px;line-height:1.58;">${escapeHtml(line)}</p>`)
    .join('');
}

export function buildCorporateEmailHtml({ subject = '', body = '', values = {}, design = {} }) {
  const renderedSubject = renderCommunicationTemplate(subject, values);
  const renderedBody = renderCommunicationTemplate(body, values);
  const ctaUrl = renderCommunicationTemplate(design.cta_url || '', values);
  const ctaLabel = renderCommunicationTemplate(design.cta_label || 'Abrir', values);
  const cta = ctaUrl
    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:8px;background:#E11D48;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:800;font-size:15px;">${escapeHtml(ctaLabel)}</a>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#090909;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090909;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-radius:22px;overflow:hidden;background:#f6f3ee;">
            <tr>
              <td style="background:#090909;color:#f8fafc;padding:24px 30px;">
                <div style="font-family:Georgia,serif;font-size:28px;line-height:1;">Feria <em style="color:#E11D48;">Design</em></div>
                <div style="margin-top:8px;color:#d6bd7a;font-size:11px;letter-spacing:.18em;text-transform:uppercase;">Studio communication</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 30px;">
                <div style="color:#a27b2a;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px;">Feria Design Studio</div>
                <h1 style="margin:0 0 18px;color:#191717;font-size:28px;line-height:1.16;font-weight:800;">${escapeHtml(renderedSubject)}</h1>
                ${textToParagraphs(renderedBody)}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid rgba(0,0,0,.08);padding:18px 30px;color:#746f69;font-size:12px;line-height:1.5;">
                Feria Design Studio · contacto@feria.design<br/>
                Este correo contiene informacion del proceso de tu proyecto.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getWhatsappImagePayload(template = {}, templateKey = '') {
  const imageTemplate = template.image_template || {};
  const enabled = template.image_enabled !== false && imageTemplate.enabled !== false;
  if (!enabled) return {};

  const publicUrl = imageTemplate.public_url || template.image_public_url || '';
  return {
    media_kind: 'template_image',
    media_url: publicUrl || null,
    image_url: publicUrl || null,
    media_tipo: publicUrl ? 'image' : null,
    image_template_key: templateKey,
    image_template: {
      size: imageTemplate.size || 'square',
      save_history: imageTemplate.save_history !== false,
      overlay: imageTemplate.overlay || null,
    },
  };
}
