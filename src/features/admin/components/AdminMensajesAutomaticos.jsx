import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  RotateCcw,
  Save,
  UploadCloud,
} from 'lucide-react';
import { Badge, Button, Card, SectionLabel } from '../../../components/UI';
import { isConfigured, supabase } from '../../../lib/supabase';

const TEMPLATE_STORAGE_KEY = 'feria_message_templates_v1';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const SAMPLE = {
  '{{nombre_cliente}}': 'Maria Cliente',
  '{{nombre_proyecto}}': 'Nodus Wellness Club',
  '{{nombre_estudio}}': 'Feria Design Studio',
  '{{servicio}}': 'Branding estrategico',
  '{{paquete}}': 'Brand Identity',
  '{{valor_cotizacion}}': '$2,800 USD + IVA',
  '{{cotizacion_url}}': 'https://feria.design/cotizacion/demo',
  '{{fecha_limite_brief}}': '12 de mayo de 2026',
  '{{enlace_portal}}': 'https://feria.design/portal/maria',
  '{{portal_url}}': 'https://feria.design/portal/maria',
  '{{enlace_descarga}}': 'https://drive.google.com/demo-brand-kit',
  '{{email_cliente}}': 'maria@cliente.com',
  '{{password_temporal}}': 'Feria-8K29-Luma!',
  '{{fecha_reunion}}': '24 de mayo, 10:00',
  '{{duracion_reunion}}': '60 min',
  '{{tipo_reunion}}': 'Virtual',
  '{{link_reunion}}': 'https://zoom.us/j/1234567890',
  '{{monto_pendiente}}': '$1,120',
};

const IMAGE_SIZES = {
  square: { label: 'WhatsApp 800 x 800', width: 800, height: 800 },
  wide: { label: 'Mailing 1200 x 628', width: 1200, height: 628 },
};

const DEFAULT_IMAGE_TEMPLATE = {
  enabled: true,
  size: 'square',
  base_image: '',
  base_name: '',
  public_url: '',
  save_history: true,
  overlay: {
    enabled: true,
    text: '{{nombre_cliente}}',
    x: 50,
    y: 72,
    size: 46,
    color: '#f8fafc',
    font: 'DM Serif Display',
    weight: 700,
    align: 'center',
  },
};

const DEFAULT_EMAIL_DESIGN = {
  layout: 'corporate',
  locked: true,
  provider: 'Resend',
  cta_label: 'Abrir portal',
  cta_url: '{{enlace_portal}}',
};

function emailTemplate(data) {
  return {
    channel: 'email',
    active: true,
    email_design: DEFAULT_EMAIL_DESIGN,
    ...data,
  };
}

function whatsappTemplate(data) {
  return {
    channel: 'whatsapp',
    subject: '',
    active: true,
    image_enabled: true,
    image_template: DEFAULT_IMAGE_TEMPLATE,
    ...data,
  };
}

const DEFAULTS = {
  quotes_email: emailTemplate({
    section: 'Cotizaciones',
    label: 'Cotizacion enviada - correo',
    subject: 'Tu cotizacion de Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nTe compartimos la cotizacion preparada para tu proyecto.\n\nServicio: {{servicio}}\nPaquete: {{paquete}}\nValor: {{valor_cotizacion}}\n\nPuedes revisarla aqui:\n{{cotizacion_url}}\n\nSi quieres avanzar, responde a este correo o agenda una llamada con el estudio.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{servicio}}', '{{paquete}}', '{{valor_cotizacion}}', '{{cotizacion_url}}'],
    email_design: { ...DEFAULT_EMAIL_DESIGN, cta_label: 'Ver cotizacion', cta_url: '{{cotizacion_url}}' },
  }),
  quotes_whatsapp: whatsappTemplate({
    section: 'Cotizaciones',
    label: 'Cotizacion enviada - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Ya esta lista tu cotizacion de {{nombre_estudio}}.\n\nServicio: {{servicio}}\nPaquete: {{paquete}}\nValor: {{valor_cotizacion}}\n\nPuedes revisarla aqui:\n{{cotizacion_url}}`,
    required_variables: ['{{nombre_cliente}}', '{{servicio}}', '{{paquete}}', '{{cotizacion_url}}'],
    image_template: {
      ...DEFAULT_IMAGE_TEMPLATE,
      overlay: { ...DEFAULT_IMAGE_TEMPLATE.overlay, y: 70, color: '#fff7ed' },
    },
  }),
  contract_sent_email: emailTemplate({
    section: 'Contratos',
    label: 'Contrato enviado - correo',
    subject: 'Contrato listo para revisar y aprobar',
    body: `Hola, {{nombre_cliente}}.\n\nTe enviamos el contrato de {{nombre_proyecto}} para revision y aprobacion digital.\n\nLos datos personales registrados en esta etapa alimentan el contrato, facturas y notificaciones del proceso, por eso quedaran como fuente oficial del proyecto.\n\nPuedes revisarlo desde tu correo o ingresar al portal:\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
    email_design: { ...DEFAULT_EMAIL_DESIGN, cta_label: 'Revisar contrato', cta_url: '{{enlace_portal}}' },
  }),
  contract_sent_whatsapp: whatsappTemplate({
    section: 'Contratos',
    label: 'Contrato enviado - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Te enviamos el contrato de {{nombre_proyecto}} a tu correo. Revisa tu bandeja de entrada para aprobarlo digitalmente.`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  contracts_signed_email: emailTemplate({
    section: 'Contratos',
    label: 'Contrato firmado - correo',
    subject: 'Tu contrato firmado con Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nAdjuntamos el contrato firmado de tu proyecto con {{nombre_estudio}}.\n\nEste documento confirma el inicio formal del proceso y queda disponible tambien en tu portal.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_estudio}}'],
  }),
  invoice_initial_email: emailTemplate({
    section: 'Pagos',
    label: 'Factura 60% inicial - correo',
    subject: 'Factura inicial de tu proyecto',
    body: `Hola, {{nombre_cliente}}.\n\nConfirmamos el pago inicial de {{nombre_proyecto}}. Adjuntamos la factura correspondiente y activamos los siguientes pasos del proyecto.\n\nTu acceso al portal esta aqui:\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  invoice_final_email: emailTemplate({
    section: 'Pagos',
    label: 'Factura 40% final - correo',
    subject: 'Factura final y proxima entrega de tu Brand Kit',
    body: `Hola, {{nombre_cliente}}.\n\nRecibimos el pago final de {{nombre_proyecto}}. Adjuntamos la factura y dejamos todo listo para liberar tu Brand Kit.\n\nTe avisaremos cuando la descarga este disponible.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  portal_access_email: emailTemplate({
    section: 'Portal cliente',
    label: 'Credenciales del portal - correo',
    subject: 'Tu acceso al portal de Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nTu proyecto con {{nombre_estudio}} ya esta activo.\n\nHemos creado tu acceso al portal, donde podras completar tu brief antes del {{fecha_limite_brief}}, revisar entregas y comunicarte con el equipo.\n\nAcceso:\n{{enlace_portal}}\n\nUsuario: {{email_cliente}}\nContrasena temporal: {{password_temporal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{fecha_limite_brief}}', '{{enlace_portal}}', '{{email_cliente}}', '{{password_temporal}}'],
    email_design: { ...DEFAULT_EMAIL_DESIGN, cta_label: 'Entrar al portal', cta_url: '{{enlace_portal}}' },
  }),
  portal_access_whatsapp: whatsappTemplate({
    section: 'Portal cliente',
    label: 'Credenciales del portal - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Tu acceso al portal de {{nombre_estudio}} ya esta listo.\n\nIngresa aqui:\n{{enlace_portal}}\n\nUsuario: {{email_cliente}}\nContrasena temporal: {{password_temporal}}\n\nFecha limite del brief: {{fecha_limite_brief}}.`,
    required_variables: ['{{nombre_cliente}}', '{{enlace_portal}}', '{{email_cliente}}', '{{password_temporal}}', '{{fecha_limite_brief}}'],
  }),
  project_brief_completed_email: emailTemplate({
    section: 'Progreso',
    label: 'Progreso 1 - correo',
    subject: 'Hemos recibido tu brief, {{nombre_cliente}}',
    body: `Hola, {{nombre_cliente}}.\n\nHemos recibido el brief de {{nombre_proyecto}}. El desarrollo acaba de iniciar y desde tu portal podras seguir el avance.\n\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  project_brief_completed_whatsapp: whatsappTemplate({
    section: 'Progreso',
    label: 'Progreso 1 - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Hemos recibido el brief de {{nombre_proyecto}}. Estamos preparando los ingredientes de tu proyecto.`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  project_midpoint_email: emailTemplate({
    section: 'Progreso',
    label: 'Progreso 2 - correo',
    subject: 'Tu proyecto avanza con el equipo creativo',
    body: `Hola, {{nombre_cliente}}.\n\nEstamos mezclando ideas y referencias para {{nombre_proyecto}}. Cada decision se esta afinando con intencion.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  project_midpoint_whatsapp: whatsappTemplate({
    section: 'Progreso',
    label: 'Progreso 2 - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Estamos mezclando ideas y referencias para {{nombre_proyecto}}. Tu marca ya esta tomando forma.`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  project_cooking_email: emailTemplate({
    section: 'Progreso',
    label: 'Progreso 3 - correo',
    subject: 'Tu proyecto se esta cocinando',
    body: `Hola, {{nombre_cliente}}.\n\n{{nombre_proyecto}} esta al fuego. La propuesta visual empieza a tomar forma y el equipo esta cuidando los detalles.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  project_cooking_whatsapp: whatsappTemplate({
    section: 'Progreso',
    label: 'Progreso 3 - WhatsApp',
    body: `Hola, {{nombre_cliente}}. {{nombre_proyecto}} esta al fuego: la propuesta visual empieza a tomar forma.`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  project_meeting_enabled_email: emailTemplate({
    section: 'Progreso',
    label: 'Progreso 4 - correo',
    subject: 'Ha llegado el momento de agendar tu reunion',
    body: `Hola, {{nombre_cliente}}.\n\nEstamos cerca de presentar {{nombre_proyecto}}. Ya puedes elegir la fecha y hora de tu reunion desde el portal.\n\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  project_meeting_enabled_whatsapp: whatsappTemplate({
    section: 'Progreso',
    label: 'Progreso 4 - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Estamos cerca de presentar {{nombre_proyecto}}. Ya puedes elegir fecha y hora para la reunion: {{enlace_portal}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  project_approval_ready_email: emailTemplate({
    section: 'Progreso',
    label: 'Progreso 5 - correo',
    subject: 'Tu proyecto esta listo para aprobacion',
    body: `Hola, {{nombre_cliente}}.\n\n{{nombre_proyecto}} esta listo para revisar. Ingresa al portal para aprobarlo o solicitar ajustes.\n\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  project_approval_ready_whatsapp: whatsappTemplate({
    section: 'Progreso',
    label: 'Progreso 5 - WhatsApp',
    body: `Hola, {{nombre_cliente}}. {{nombre_proyecto}} esta listo para revisar. Puedes verlo aqui: {{enlace_portal}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_portal}}'],
  }),
  project_final_payment_email: emailTemplate({
    section: 'Pagos',
    label: 'Pago final activado - correo',
    subject: 'Pago final disponible para liberar tus archivos',
    body: `Hola, {{nombre_cliente}}.\n\nTu proyecto {{nombre_proyecto}} fue aprobado. Ya puedes realizar el pago final de {{monto_pendiente}} para liberar los archivos finales y Brand Kit.\n\n{{enlace_portal}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{monto_pendiente}}', '{{enlace_portal}}'],
  }),
  project_final_payment_whatsapp: whatsappTemplate({
    section: 'Pagos',
    label: 'Pago final activado - WhatsApp',
    body: `Hola, {{nombre_cliente}}. {{nombre_proyecto}} fue aprobado. Ya puedes realizar el pago final de {{monto_pendiente}} para liberar tus archivos: {{enlace_portal}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{monto_pendiente}}', '{{enlace_portal}}'],
  }),
  project_brandkit_released_email: emailTemplate({
    section: 'Entrega',
    label: 'Brand Kit disponible - correo',
    subject: 'Tu Brand Kit ya esta disponible',
    body: `Hola, {{nombre_cliente}}.\n\nTu Brand Kit de {{nombre_proyecto}} ya esta disponible para descargar.\n\nPuedes acceder aqui:\n{{enlace_descarga}}\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_descarga}}'],
    email_design: { ...DEFAULT_EMAIL_DESIGN, cta_label: 'Descargar Brand Kit', cta_url: '{{enlace_descarga}}' },
  }),
  project_brandkit_released_whatsapp: whatsappTemplate({
    section: 'Entrega',
    label: 'Brand Kit disponible - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Tu Brand Kit de {{nombre_proyecto}} ya esta disponible para descargar: {{enlace_descarga}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}', '{{enlace_descarga}}'],
  }),
  postventa_email: emailTemplate({
    section: 'Postventa',
    label: 'Seguimiento postventa - correo',
    subject: 'Seguimiento de tu proyecto con Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nQueremos saber como te has sentido con la entrega de {{nombre_proyecto}} y si existe algo que podamos acompanar en esta nueva etapa.\n\nPuedes responder a este correo o escribirnos por WhatsApp.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  postventa_whatsapp: whatsappTemplate({
    section: 'Postventa',
    label: 'Seguimiento postventa - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Queremos saber como te has sentido con la entrega de {{nombre_proyecto}} y si hay algo en lo que podamos acompanar.`,
    required_variables: ['{{nombre_cliente}}', '{{nombre_proyecto}}'],
  }),
  meeting_invite_email: emailTemplate({
    section: 'Calendario',
    label: 'Invitacion a reunion - correo',
    subject: 'Tu reunion con Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nTe compartimos la informacion de tu reunion con {{nombre_estudio}}.\n\nProyecto: {{nombre_proyecto}}\nFecha: {{fecha_reunion}}\nDuracion: {{duracion_reunion}}\nTipo: {{tipo_reunion}}\n\nLink de reunion:\n{{link_reunion}}\n\nNos vemos pronto.\n\nCon carino,\n{{nombre_estudio}}`,
    required_variables: ['{{nombre_cliente}}', '{{fecha_reunion}}', '{{link_reunion}}'],
    email_design: { ...DEFAULT_EMAIL_DESIGN, cta_label: 'Entrar a la reunion', cta_url: '{{link_reunion}}' },
  }),
  meeting_invite_whatsapp: whatsappTemplate({
    section: 'Calendario',
    label: 'Invitacion a reunion - WhatsApp',
    body: `Hola, {{nombre_cliente}}. Te compartimos tu reunion con {{nombre_estudio}}.\n\nProyecto: {{nombre_proyecto}}\nFecha: {{fecha_reunion}}\nDuracion: {{duracion_reunion}}\n\nLink:\n{{link_reunion}}`,
    required_variables: ['{{nombre_cliente}}', '{{fecha_reunion}}', '{{link_reunion}}'],
  }),
};

const FLOW_MOMENTS = [
  { id: 'quote', stage: 'F1', label: 'Cotizacion enviada', description: 'PDF por correo y aviso visual por WhatsApp.', email: 'quotes_email', whatsapp: 'quotes_whatsapp' },
  { id: 'contract', stage: 'F3', label: 'Contrato enviado', description: 'Contrato por correo y recordatorio por WhatsApp.', email: 'contract_sent_email', whatsapp: 'contract_sent_whatsapp' },
  { id: 'portal', stage: 'F5', label: 'Credenciales del portal', description: 'Usuario, clave temporal y fecha limite de brief.', email: 'portal_access_email', whatsapp: 'portal_access_whatsapp' },
  { id: 'progress_1', stage: 'F7', label: 'Progreso 1', description: 'Inicio de produccion despues del brief.', email: 'project_brief_completed_email', whatsapp: 'project_brief_completed_whatsapp' },
  { id: 'progress_2', stage: 'F7', label: 'Progreso 2', description: 'Mezclando ideas y referencias.', email: 'project_midpoint_email', whatsapp: 'project_midpoint_whatsapp' },
  { id: 'progress_3', stage: 'F7', label: 'Progreso 3', description: 'La propuesta toma forma.', email: 'project_cooking_email', whatsapp: 'project_cooking_whatsapp' },
  { id: 'progress_4', stage: 'F8', label: 'Agendar presentacion', description: 'Invitacion a elegir fecha de reunion.', email: 'project_meeting_enabled_email', whatsapp: 'project_meeting_enabled_whatsapp' },
  { id: 'progress_5', stage: 'F8', label: 'Listo para revisar', description: 'Aprobacion o ajustes desde portal.', email: 'project_approval_ready_email', whatsapp: 'project_approval_ready_whatsapp' },
  { id: 'final_payment', stage: 'F9', label: 'Pago final activado', description: 'Saldo pendiente para liberar archivos.', email: 'project_final_payment_email', whatsapp: 'project_final_payment_whatsapp' },
  { id: 'brandkit', stage: 'F10', label: 'Brand Kit disponible', description: 'Descarga final por portal o Drive.', email: 'project_brandkit_released_email', whatsapp: 'project_brandkit_released_whatsapp' },
  { id: 'postventa', stage: 'F11', label: 'Postventa', description: 'Secuencia editable de seguimiento.', email: 'postventa_email', whatsapp: 'postventa_whatsapp' },
  { id: 'meeting', stage: 'CAL', label: 'Invitacion a reunion', description: 'Zoom automatico + envio por correo y WhatsApp.', email: 'meeting_invite_email', whatsapp: 'meeting_invite_whatsapp' },
];

function renderTemplate(text = '', values = SAMPLE) {
  return Object.entries(values).reduce((out, [key, value]) => out.split(key).join(value), text || '');
}

function storedTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function normalizeTemplate(key, tpl = {}) {
  const base = DEFAULTS[key] || {};
  const merged = { ...base, ...tpl };
  const channel = merged.channel || base.channel || 'email';

  if (channel === 'whatsapp') {
    return {
      ...merged,
      image_enabled: merged.image_enabled !== false,
      image_template: {
        ...DEFAULT_IMAGE_TEMPLATE,
        ...(base.image_template || {}),
        ...(tpl.image_template || {}),
        overlay: {
          ...DEFAULT_IMAGE_TEMPLATE.overlay,
          ...(base.image_template?.overlay || {}),
          ...(tpl.image_template?.overlay || {}),
        },
      },
    };
  }

  return {
    ...merged,
    email_design: {
      ...DEFAULT_EMAIL_DESIGN,
      ...(base.email_design || {}),
      ...(tpl.email_design || {}),
    },
  };
}

function mergeTemplates(base, saved) {
  const keys = Array.from(new Set([...Object.keys(base), ...Object.keys(saved || {})]));
  return keys.reduce((acc, key) => {
    acc[key] = normalizeTemplate(key, { ...(base[key] || {}), ...(saved?.[key] || {}) });
    return acc;
  }, {});
}

function persistTemplates(templates) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

function missingVars(tpl = {}) {
  const body = `${tpl.subject || ''}\n${tpl.body || ''}`;
  return (tpl.required_variables || []).filter(v => !body.includes(v));
}

function parseImageSize(sizeKey = 'square') {
  return IMAGE_SIZES[sizeKey] || IMAGE_SIZES.square;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToDataUrl(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result, bytes: blob?.size || 0, blob });
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

async function resizeImageFile(file, sizeKey) {
  const size = parseImageSize(sizeKey);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size.width;
    canvas.height = size.height;
    const scale = Math.max(size.width / img.width, size.height / img.height);
    const width = img.width * scale;
    const height = img.height * scale;
    ctx.drawImage(img, (size.width - width) / 2, (size.height - height) / 2, width, height);
    return canvasToDataUrl(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function safeAssetName(value = 'template') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'template';
}

function dbImageTemplate(imageTemplate = {}) {
  const { base_image, ...rest } = imageTemplate;
  return rest;
}

async function uploadCommunicationAsset({ templateKey, fileName, blob }) {
  if (!isConfigured || !blob) return { publicUrl: '', error: null };
  const path = `templates/${templateKey}/${Date.now()}-${safeAssetName(fileName).replace(/\.[^.]+$/, '')}.png`;
  const { error } = await supabase.storage
    .from('communication-assets')
    .upload(path, blob, { contentType: 'image/png', upsert: true });
  if (error) return { publicUrl: '', error };
  const { data } = supabase.storage.from('communication-assets').getPublicUrl(path);
  return { publicUrl: data?.publicUrl || '', error: null };
}

async function renderWhatsAppPng(template, previewName = 'Maria Cliente') {
  const imageTemplate = template.image_template || DEFAULT_IMAGE_TEMPLATE;
  const size = parseImageSize(imageTemplate.size);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size.width;
  canvas.height = size.height;

  const source = imageTemplate.base_image || imageTemplate.public_url;
  if (source) {
    try {
      const img = await loadImage(source);
      const scale = Math.max(size.width / img.width, size.height / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.drawImage(img, (size.width - width) / 2, (size.height - height) / 2, width, height);
    } catch (_) {
      drawFallbackImage(ctx, size);
    }
  } else {
    drawFallbackImage(ctx, size);
  }

  const overlay = imageTemplate.overlay || DEFAULT_IMAGE_TEMPLATE.overlay;
  if (overlay.enabled !== false) {
    const x = (Number(overlay.x) / 100) * size.width;
    const y = (Number(overlay.y) / 100) * size.height;
    const text = renderTemplate(overlay.text || '{{nombre_cliente}}', { ...SAMPLE, '{{nombre_cliente}}': previewName });
    ctx.save();
    ctx.fillStyle = overlay.color || '#f8fafc';
    ctx.font = `${overlay.weight || 700} ${Number(overlay.size) || 42}px ${overlay.font || 'Inter'}, sans-serif`;
    ctx.textAlign = overlay.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.34)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, x, y, size.width * 0.84);
    ctx.restore();
  }

  return canvasToDataUrl(canvas);
}

function drawFallbackImage(ctx, size) {
  const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, '#111111');
  gradient.addColorStop(0.45, '#1f1f1f');
  gradient.addColorStop(1, '#312019');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(0, 0, size.width, 16);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(size.width * 0.12, size.height * 0.22, size.width * 0.76, 2);
  ctx.fillRect(size.width * 0.12, size.height * 0.78, size.width * 0.76, 2);
  ctx.fillStyle = '#f4f4f5';
  ctx.font = `700 ${Math.max(32, size.width * 0.065)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Feria Design Studio', size.width / 2, size.height * 0.42);
  ctx.fillStyle = '#d6bd7a';
  ctx.font = `500 ${Math.max(18, size.width * 0.032)}px Inter, sans-serif`;
  ctx.fillText('comunicacion personalizada', size.width / 2, size.height * 0.5);
}

const inputStyle = {
  width: '100%',
  background: 'var(--s3)',
  border: '1px solid var(--border-s)',
  borderRadius: 10,
  color: 'var(--text)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle = {
  fontSize: 10,
  color: 'var(--text-d)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  marginBottom: 6,
};

function MomentButton({ moment, active, emailTpl, whatsappTpl, onClick }) {
  const imageReady = Boolean(whatsappTpl?.image_template?.base_image || whatsappTpl?.image_template?.public_url);
  const missingCount = missingVars(emailTpl).length + missingVars(whatsappTpl).length;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--border-s)'}`,
        background: active ? 'var(--gold-faint)' : 'var(--s3)',
        color: active ? 'var(--text)' : 'var(--text-m)',
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, color: active ? 'var(--gold)' : 'var(--text-d)', letterSpacing: '.08em' }}>{moment.stage}</div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 3 }}>{moment.label}</div>
        </div>
        {missingCount ? <Badge color="warning">{missingCount}</Badge> : <CheckCircle2 size={15} color="var(--green)" />}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 6, lineHeight: 1.35 }}>{moment.description}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <Badge color={emailTpl?.active === false ? 'gray' : 'blue'}><Mail size={11} /> Email</Badge>
        <Badge color={whatsappTpl?.active === false ? 'gray' : 'green'}><MessageCircle size={11} /> WhatsApp</Badge>
        <Badge color={imageReady ? 'gold' : 'gray'}><ImageIcon size={11} /> Imagen</Badge>
      </div>
    </button>
  );
}

function WhatsAppImagePreview({ template, previewName }) {
  const imageTemplate = template.image_template || DEFAULT_IMAGE_TEMPLATE;
  const size = parseImageSize(imageTemplate.size);
  const overlay = imageTemplate.overlay || DEFAULT_IMAGE_TEMPLATE.overlay;
  const source = imageTemplate.base_image || imageTemplate.public_url;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'linear-gradient(135deg, #101010, #221b16)',
        aspectRatio: `${size.width} / ${size.height}`,
        minHeight: 220,
      }}
    >
      {source ? (
        <img src={source} alt="Base WhatsApp" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, padding: 24, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 8 }}>
          <div style={{ width: '72%', height: 2, background: 'rgba(214,189,122,.5)' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Feria Design Studio</div>
          <div style={{ fontSize: 11, color: '#d6bd7a' }}>imagen base pendiente</div>
          <div style={{ width: '64%', height: 2, background: 'rgba(255,255,255,.12)' }} />
        </div>
      )}
      {overlay.enabled !== false && (
        <div
          style={{
            position: 'absolute',
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            transform: 'translate(-50%, -50%)',
            color: overlay.color,
            fontFamily: overlay.font,
            fontSize: `clamp(16px, ${Number(overlay.size) / 14}vw, ${overlay.size}px)`,
            fontWeight: overlay.weight,
            textAlign: overlay.align,
            textShadow: '0 8px 22px rgba(0,0,0,.45)',
            whiteSpace: 'nowrap',
            maxWidth: '84%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {renderTemplate(overlay.text || '{{nombre_cliente}}', { ...SAMPLE, '{{nombre_cliente}}': previewName })}
        </div>
      )}
    </div>
  );
}

function EmailPreview({ template }) {
  const design = template.email_design || DEFAULT_EMAIL_DESIGN;
  const body = renderTemplate(template.body).split('\n').filter(Boolean);
  const cta = renderTemplate(design.cta_url || '');
  const ctaLabel = renderTemplate(design.cta_label || 'Abrir');

  return (
    <div style={{ background: '#f6f3ee', color: '#191717', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
      <div style={{ background: '#090909', color: '#f8fafc', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21 }}>Feria <em style={{ color: '#E11D48' }}>Design</em></div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', color: '#d6bd7a' }}>Studio mail</div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 10, color: '#a27b2a', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>Vista previa</div>
        <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 14 }}>{renderTemplate(template.subject || 'Mensaje de Feria Design Studio')}</div>
        <div style={{ display: 'grid', gap: 10, color: '#4b4540', lineHeight: 1.55 }}>
          {body.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
        </div>
        {cta && (
          <div style={{ marginTop: 22 }}>
            <span style={{ display: 'inline-flex', background: '#E11D48', color: '#fff', borderRadius: 10, padding: '11px 18px', fontWeight: 800 }}>{ctaLabel}</span>
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: '14px 22px', color: '#746f69', fontSize: 11 }}>
        Feria Design Studio · contacto@feria.design · Privacidad y soporte
      </div>
    </div>
  );
}

export default function AdminMensajesAutomaticos({ showToast }) {
  const [templates, setTemplates] = useState(() => mergeTemplates(DEFAULTS, storedTemplates()));
  const [activeMomentId, setActiveMomentId] = useState('quote');
  const [previewName, setPreviewName] = useState('Maria Cliente');
  const fileInputRef = useRef(null);
  const activeMoment = FLOW_MOMENTS.find(m => m.id === activeMomentId) || FLOW_MOMENTS[0];
  const emailKey = activeMoment.email;
  const whatsappKey = activeMoment.whatsapp;
  const emailTpl = templates[emailKey] || DEFAULTS[emailKey];
  const whatsappTpl = templates[whatsappKey] || DEFAULTS[whatsappKey];
  const emailMissing = useMemo(() => missingVars(emailTpl), [emailTpl]);
  const whatsappMissing = useMemo(() => missingVars(whatsappTpl), [whatsappTpl]);

  useEffect(() => {
    async function loadRemoteTemplates() {
      if (!isConfigured) return;
      const { data } = await supabase
        .from('automatic_message_templates')
        .select('*')
        .in('template_key', Object.keys(DEFAULTS));
      if (!data?.length) return;
      setTemplates(prev => {
        const remote = data.reduce((acc, row) => {
          acc[row.template_key] = normalizeTemplate(row.template_key, {
            ...(DEFAULTS[row.template_key] || {}),
            section: row.section || DEFAULTS[row.template_key]?.section,
            label: row.label || DEFAULTS[row.template_key]?.label,
            channel: row.channel || DEFAULTS[row.template_key]?.channel,
            subject: row.subject || '',
            body: row.body || '',
            required_variables: row.required_variables || DEFAULTS[row.template_key]?.required_variables || [],
            active: row.active !== false,
            image_enabled: row.image_enabled !== false,
            image_template: row.image_template || DEFAULTS[row.template_key]?.image_template,
            email_design: row.email_design || DEFAULTS[row.template_key]?.email_design,
          });
          return acc;
        }, {});
        return mergeTemplates(prev, remote);
      });
    }
    loadRemoteTemplates();
  }, []);

  const stats = useMemo(() => {
    const all = Object.values(templates);
    return {
      moments: FLOW_MOMENTS.length,
      email: all.filter(t => t.channel === 'email').length,
      whatsappImages: all.filter(t => t.channel === 'whatsapp' && t.image_enabled !== false).length,
      paused: all.filter(t => t.active === false).length,
    };
  }, [templates]);

  const updateTemplate = (key, changes) => {
    setTemplates(prev => ({
      ...prev,
      [key]: normalizeTemplate(key, { ...prev[key], ...changes }),
    }));
  };

  const updateImageTemplate = changes => {
    const current = whatsappTpl.image_template || DEFAULT_IMAGE_TEMPLATE;
    updateTemplate(whatsappKey, {
      image_template: {
        ...current,
        ...changes,
        overlay: {
          ...(current.overlay || DEFAULT_IMAGE_TEMPLATE.overlay),
          ...(changes.overlay || {}),
        },
      },
    });
  };

  const onUploadImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, bytes, blob } = await resizeImageFile(file, whatsappTpl.image_template?.size || 'square');
      const { publicUrl, error } = await uploadCommunicationAsset({ templateKey: whatsappKey, fileName: file.name, blob });
      updateImageTemplate({ base_image: dataUrl, base_name: file.name, public_url: publicUrl });
      const suffix = bytes > MAX_IMAGE_BYTES ? ' Pesa mas de 2 MB; usa una base mas ligera para envio real.' : '';
      const storageNote = error ? ' Guardada para vista previa local; aplica la migracion del bucket para URL publica.' : '';
      showToast(`Imagen base cargada.${suffix}${storageNote}`, bytes > MAX_IMAGE_BYTES || error ? 'warn' : 'img');
    } catch (_) {
      showToast('No se pudo procesar la imagen', 'warn');
    } finally {
      event.target.value = '';
    }
  };

  const exportPreview = async () => {
    try {
      const { dataUrl } = await renderWhatsAppPng(whatsappTpl, previewName);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeMoment.id}-${previewName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
      showToast('PNG de prueba exportado', 'img');
    } catch (_) {
      showToast('No se pudo exportar la vista previa', 'warn');
    }
  };

  const saveMoment = async () => {
    const missing = [...emailMissing, ...whatsappMissing];
    if (missing.length) {
      showToast(`Faltan variables obligatorias: ${Array.from(new Set(missing)).join(', ')}`, 'warn');
      return;
    }
    persistTemplates(templates);

    if (isConfigured) {
      const basePayload = [emailKey, whatsappKey].map(key => {
        const tpl = templates[key];
        return {
          template_key: key,
          section: tpl.section,
          label: tpl.label,
          channel: tpl.channel,
          subject: tpl.subject || null,
          body: tpl.body,
          required_variables: tpl.required_variables || [],
          active: tpl.active !== false,
          updated_at: new Date().toISOString(),
        };
      });

      const payload = basePayload.map(row => {
        const tpl = templates[row.template_key];
        return {
          ...row,
          image_enabled: tpl.image_enabled !== false,
          image_template: tpl.channel === 'whatsapp' ? dbImageTemplate(tpl.image_template || {}) : {},
          email_design: tpl.channel === 'email' ? (tpl.email_design || {}) : {},
        };
      });

      let { error } = await supabase
        .from('automatic_message_templates')
        .upsert(payload, { onConflict: 'template_key' });
      if (error && /image_template|email_design|image_enabled|schema cache|column/i.test(error.message || '')) {
        const fallback = await supabase
          .from('automatic_message_templates')
          .upsert(basePayload, { onConflict: 'template_key' });
        error = fallback.error;
      }
      if (error) {
        showToast('No se pudo guardar en la base de datos', 'warn');
        return;
      }
    }

    showToast('Momento de comunicacion guardado', 'ok');
  };

  const restoreMoment = () => {
    setTemplates(prev => ({
      ...prev,
      [emailKey]: normalizeTemplate(emailKey, DEFAULTS[emailKey]),
      [whatsappKey]: normalizeTemplate(whatsappKey, DEFAULTS[whatsappKey]),
    }));
    showToast('Plantillas restauradas. Guarda para aplicar.', 'undo');
  };

  const imageTemplate = whatsappTpl.image_template || DEFAULT_IMAGE_TEMPLATE;
  const overlay = imageTemplate.overlay || DEFAULT_IMAGE_TEMPLATE.overlay;

  return (
    <div style={{ minWidth: 0 }}>
      <SectionLabel>Plantillas de comunicacion</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          ['Momentos', stats.moments, 'var(--text)'],
          ['Correos', stats.email, 'var(--blue)'],
          ['Imagenes WA', stats.whatsappImages, 'var(--green)'],
          ['Pausadas', stats.paused, stats.paused ? 'var(--warning)' : 'var(--text-d)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 850, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 340px) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <Card style={{ padding: 12, position: 'sticky', top: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>Momentos del flujo</div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>WhatsApp + correo juntos</div>
            </div>
            <Badge color="gold"><Eye size={11} /> cliente</Badge>
          </div>
          {FLOW_MOMENTS.map(moment => (
            <MomentButton
              key={moment.id}
              moment={moment}
              active={moment.id === activeMomentId}
              emailTpl={templates[moment.email]}
              whatsappTpl={templates[moment.whatsapp]}
              onClick={() => setActiveMomentId(moment.id)}
            />
          ))}
        </Card>

        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{activeMoment.stage}</div>
                <div style={{ fontSize: 22, fontWeight: 850, marginTop: 3 }}>{activeMoment.label}</div>
                <div style={{ color: 'var(--text-d)', fontSize: 11, marginTop: 4 }}>{activeMoment.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Button variant="ghost" onClick={restoreMoment}><RotateCcw size={15} /> Restaurar</Button>
                <Button variant="gold" onClick={saveMoment}><Save size={15} /> Guardar momento</Button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 10 }}>
              <div style={{ ...inputStyle, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MessageCircle size={16} color="var(--green)" /> WhatsApp</strong>
                  <label style={{ display: 'inline-flex', gap: 7, alignItems: 'center', color: 'var(--text-d)', fontSize: 11 }}>
                    <input type="checkbox" checked={whatsappTpl.active !== false} onChange={e => updateTemplate(whatsappKey, { active: e.target.checked })} />
                    Activo
                  </label>
                </div>
                <span style={{ color: 'var(--text-d)', fontSize: 11 }}>Mensaje corto con imagen personalizada por cliente.</span>
              </div>
              <div style={{ ...inputStyle, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Mail size={16} color="var(--blue)" /> Correo corporativo</strong>
                  <label style={{ display: 'inline-flex', gap: 7, alignItems: 'center', color: 'var(--text-d)', fontSize: 11 }}>
                    <input type="checkbox" checked={emailTpl.active !== false} onChange={e => updateTemplate(emailKey, { active: e.target.checked })} />
                    Activo
                  </label>
                </div>
                <span style={{ color: 'var(--text-d)', fontSize: 11 }}>Diseno base protegido; solo se edita asunto y cuerpo.</span>
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14, alignItems: 'start' }}>
            <Card style={{ padding: 16, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 850, display: 'flex', alignItems: 'center', gap: 8 }}><MessageCircle size={18} color="var(--green)" /> WhatsApp con imagen</div>
                  <div style={{ color: 'var(--text-d)', fontSize: 11, marginTop: 4 }}>Imagen PNG + capa dinamica con nombre del cliente.</div>
                </div>
                <Badge color={whatsappMissing.length ? 'warning' : 'green'}>{whatsappMissing.length ? `${whatsappMissing.length} variables` : 'lista'}</Badge>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Mensaje</div>
                <textarea
                  value={whatsappTpl.body || ''}
                  onChange={e => updateTemplate(whatsappKey, { body: e.target.value })}
                  rows={7}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={labelStyle}>Nombre de prueba</div>
                  <input value={previewName} onChange={e => setPreviewName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={labelStyle}>Formato</div>
                  <select value={imageTemplate.size || 'square'} onChange={e => updateImageTemplate({ size: e.target.value })} style={inputStyle}>
                    {Object.entries(IMAGE_SIZES).map(([key, size]) => <option key={key} value={key}>{size.label}</option>)}
                  </select>
                </div>
              </div>

              <WhatsAppImagePreview template={whatsappTpl} previewName={previewName} />

              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onUploadImage} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Button variant="ghost" onClick={() => fileInputRef.current?.click()}><UploadCloud size={15} /> Subir base</Button>
                <Button variant="ghost" onClick={exportPreview}><Download size={15} /> Exportar PNG demo</Button>
                <Button
                  variant="ghost"
                  onClick={() => updateTemplate(whatsappKey, { image_enabled: whatsappTpl.image_enabled === false })}
                  style={{ color: whatsappTpl.image_enabled === false ? 'var(--text-d)' : 'var(--green)' }}
                >
                  <ImageIcon size={15} /> {whatsappTpl.image_enabled === false ? 'Imagen pausada' : 'Imagen activa'}
                </Button>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                <div>
                  <div style={labelStyle}>URL publica para WhatsApp Business API</div>
                  <input
                    value={imageTemplate.public_url || ''}
                    onChange={e => updateImageTemplate({ public_url: e.target.value, base_image: e.target.value ? '' : imageTemplate.base_image })}
                    placeholder="https://cdn.feria.design/plantillas/cotizacion.png"
                    style={inputStyle}
                  />
                </div>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--text-m)', fontSize: 11 }}>
                  <input type="checkbox" checked={imageTemplate.save_history !== false} onChange={e => updateImageTemplate({ save_history: e.target.checked })} />
                  Guardar PNG generado en historial del cliente
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--border-s)', marginTop: 14, paddingTop: 14 }}>
                <div style={labelStyle}>Capa de nombre</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>Texto
                    <input value={overlay.text || ''} onChange={e => updateImageTemplate({ overlay: { text: e.target.value } })} style={inputStyle} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>X %
                    <input type="number" min="0" max="100" value={overlay.x} onChange={e => updateImageTemplate({ overlay: { x: Number(e.target.value) } })} style={inputStyle} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>Y %
                    <input type="number" min="0" max="100" value={overlay.y} onChange={e => updateImageTemplate({ overlay: { y: Number(e.target.value) } })} style={inputStyle} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>Tamano
                    <input type="number" min="14" max="96" value={overlay.size} onChange={e => updateImageTemplate({ overlay: { size: Number(e.target.value) } })} style={inputStyle} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>Color
                    <input type="color" value={overlay.color || '#f8fafc'} onChange={e => updateImageTemplate({ overlay: { color: e.target.value } })} style={{ ...inputStyle, height: 42, padding: 6 }} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: 'var(--text-d)', fontSize: 10 }}>Alinear
                    <select value={overlay.align || 'center'} onChange={e => updateImageTemplate({ overlay: { align: e.target.value } })} style={inputStyle}>
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </label>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 16, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 850, display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={18} color="var(--blue)" /> Correo con mailing</div>
                  <div style={{ color: 'var(--text-d)', fontSize: 11, marginTop: 4 }}>Resend recomendado; SendGrid y Mailgun quedan compatibles.</div>
                </div>
                <Badge color={emailMissing.length ? 'warning' : 'green'}>{emailMissing.length ? `${emailMissing.length} variables` : 'lista'}</Badge>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Asunto</div>
                <input value={emailTpl.subject || ''} onChange={e => updateTemplate(emailKey, { subject: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Cuerpo editable</div>
                <textarea
                  value={emailTpl.body || ''}
                  onChange={e => updateTemplate(emailKey, { body: e.target.value })}
                  rows={10}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={labelStyle}>Texto del boton</div>
                  <input value={emailTpl.email_design?.cta_label || ''} onChange={e => updateTemplate(emailKey, { email_design: { ...emailTpl.email_design, cta_label: e.target.value } })} style={inputStyle} />
                </div>
                <div>
                  <div style={labelStyle}>URL del boton</div>
                  <input value={emailTpl.email_design?.cta_url || ''} onChange={e => updateTemplate(emailKey, { email_design: { ...emailTpl.email_design, cta_url: e.target.value } })} style={inputStyle} />
                </div>
              </div>

              <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <div style={labelStyle}>Diseno base</div>
                  <Badge color="gray">Bloqueado</Badge>
                </div>
                <div style={{ color: 'var(--text-d)', fontSize: 11, lineHeight: 1.45 }}>Header, logo, colores, tipografia y pie legal se protegen desde codigo para mantener coherencia visual.</div>
              </div>

              <EmailPreview template={emailTpl} />

              <div style={{ borderTop: '1px solid var(--border-s)', marginTop: 14, paddingTop: 12 }}>
                <div style={labelStyle}>Variables obligatorias</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from(new Set([...(emailTpl.required_variables || []), ...(whatsappTpl.required_variables || [])])).map(v => {
                    const missing = emailMissing.includes(v) || whatsappMissing.includes(v);
                    return <span key={v} style={{ fontSize: 10, border: '1px solid var(--border-s)', borderRadius: 999, padding: '4px 8px', color: missing ? 'var(--warning)' : 'var(--text-d)', background: missing ? 'rgba(251,191,36,.08)' : 'var(--s3)' }}>{v}</span>;
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
