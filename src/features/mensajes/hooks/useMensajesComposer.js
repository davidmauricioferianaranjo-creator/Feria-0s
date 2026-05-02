import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

const BUCKET = 'mensajes-adjuntos';
const MAX_MB = 20;

const MIME_MAP = {
  'image/jpeg': { metaTipo: 'image', ext: 'jpg' },
  'image/png': { metaTipo: 'image', ext: 'png' },
  'image/webp': { metaTipo: 'image', ext: 'webp' },
  'image/gif': { metaTipo: 'image', ext: 'gif' },
  'video/mp4': { metaTipo: 'video', ext: 'mp4' },
  'video/quicktime': { metaTipo: 'video', ext: 'mov' },
  'audio/mpeg': { metaTipo: 'audio', ext: 'mp3' },
  'audio/mp4': { metaTipo: 'audio', ext: 'm4a' },
  'audio/x-m4a': { metaTipo: 'audio', ext: 'm4a' },
  'audio/ogg': { metaTipo: 'audio', ext: 'ogg' },
  'audio/wav': { metaTipo: 'audio', ext: 'wav' },
  'application/pdf': { metaTipo: 'document', ext: 'pdf' },
};

function attachmentLabel(metaTipo) {
  if (metaTipo === 'image') return 'Imagen enviada';
  if (metaTipo === 'video') return 'Video enviado';
  if (metaTipo === 'audio') return 'Audio enviado';
  return 'Adjunto enviado';
}

export function useMensajesComposer({ activeConv, appendMsg, updateMsgStatus, updateConvLastMsg }) {
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [aiSuggestion, setAiSug] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [adjunto, setAdjunto] = useState(null);
  const [adjuntoLoading, setAdjLoading] = useState(false);
  const fileInputRef = useRef(null);

  const abrirSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const prepararArchivo = useCallback((file) => {
    if (!file) return false;

    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`El archivo supera el limite de ${MAX_MB} MB.`);
      return false;
    }

    const info = MIME_MAP[file.type];
    if (!info) {
      alert('Tipo de archivo no permitido. Usa imagenes, PDF, MP4/MOV, MP3/M4A/WAV u OGG.');
      return false;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setAdjunto(prev => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl, metaTipo: info.metaTipo, ext: info.ext };
    });
    return true;
  }, []);

  const onArchivoSeleccionado = useCallback((e) => {
    prepararArchivo(e.target.files?.[0]);
    e.target.value = '';
  }, [prepararArchivo]);

  const onArchivoDrop = useCallback((files) => {
    return prepararArchivo(Array.from(files || [])[0]);
  }, [prepararArchivo]);

  const quitarAdjunto = useCallback(() => {
    if (adjunto?.previewUrl) URL.revokeObjectURL(adjunto.previewUrl);
    setAdjunto(null);
  }, [adjunto]);

  const subirAdjunto = useCallback(async (file, ext) => {
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const ruta = `${activeConv?.conv_id || activeConv?.id}/${nombre}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Storage: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
    return data.publicUrl;
  }, [activeConv]);

  const _doSend = useCallback(async (convId, canal, content, tempId, mediaUrl, metaTipo, mimeType) => {
    try {
      const { error } = await supabase.functions.invoke('send-meta-message', {
        body: {
          canal,
          destinatario: activeConv?.telefono || activeConv?.id,
          texto: content,
          conv_id: convId,
          nombre: activeConv?.nombre,
          ...(mediaUrl ? { media_url: mediaUrl, media_tipo: metaTipo, mime_type: mimeType } : {}),
        },
      });
      if (error) throw new Error(error.message);
      updateMsgStatus(convId, tempId, 'sent');
      updateConvLastMsg(convId, content || attachmentLabel(metaTipo));
      return true;
    } catch (e) {
      console.error('Envio fallido:', e.message);
      updateMsgStatus(convId, tempId, 'error');
      return false;
    }
  }, [activeConv, updateMsgStatus, updateConvLastMsg]);

  const enviar = useCallback(async (canal) => {
    const content = texto.trim();
    const hasMedia = !!adjunto;
    if (!content && !hasMedia) return;
    if (!activeConv || sending) return;

    const convId = activeConv.conv_id || activeConv.id;
    const tempId = `temp_${Date.now()}`;

    setTexto('');
    setSending(true);

    let mediaUrl = null;
    let metaTipo = null;
    let mimeType = null;
    let mediaName = null;

    if (hasMedia) {
      setAdjLoading(true);
      try {
        mediaUrl = await subirAdjunto(adjunto.file, adjunto.ext);
        metaTipo = adjunto.metaTipo;
        mimeType = adjunto.file.type;
        mediaName = adjunto.file.name;
      } catch (e) {
        console.error('Upload error:', e.message);
        setSending(false);
        setAdjLoading(false);
        alert(`No se pudo subir el archivo: ${e.message}\n\nVerifica que el bucket "mensajes-adjuntos" existe en Supabase Storage con acceso publico.`);
        return;
      }
      setAdjLoading(false);
      quitarAdjunto();
    }

    appendMsg(convId, {
      id: tempId,
      conv_id: convId,
      canal,
      texto: content || attachmentLabel(metaTipo).replace(' enviada', ''),
      media_url: mediaUrl,
      media_tipo: metaTipo,
      mime_type: mimeType,
      media_name: mediaName,
      from_cliente: false,
      timestamp: new Date().toISOString(),
      _status: 'sending',
    });

    await _doSend(convId, canal, content, tempId, mediaUrl, metaTipo, mimeType);
    setSending(false);
  }, [texto, adjunto, activeConv, sending, appendMsg, _doSend, subirAdjunto, quitarAdjunto]);

  const reintentar = useCallback(async (msg, canal) => {
    const convId = activeConv?.conv_id || activeConv?.id;
    if (!convId) return;
    updateMsgStatus(convId, msg.id, 'sending');
    await _doSend(convId, canal || msg.canal, msg.texto, msg.id, msg.media_url, msg.media_tipo, msg.mime_type);
  }, [activeConv, updateMsgStatus, _doSend]);

  const pedirSugerencia = useCallback(async (historial) => {
    if (!activeConv || aiLoading) return;
    setAiLoading(true);
    setAiSug('');
    try {
      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          system: 'Eres asistente de Feria Design Studio. Sugiere una respuesta breve y profesional al ultimo mensaje del cliente. Solo el texto, sin explicaciones.',
          messages: [{
            role: 'user',
            content: `Historial:\n${historial.slice(-5).map(m => `${m.from_cliente ? 'Cliente' : 'Feria'}: ${m.texto}`).join('\n')}\n\nSugiere respuesta:`,
          }],
        },
      });
      if (error) throw new Error(error.message);
      const sugerencia = data?.content?.[0]?.text?.trim() || '';
      setAiSug(sugerencia);
      if (sugerencia) setTexto(sugerencia);
    } catch (e) {
      console.warn('IA error:', e.message);
    }
    setAiLoading(false);
  }, [activeConv, aiLoading]);

  return {
    texto, setTexto, sending, enviar, reintentar,
    aiSuggestion, aiLoading, pedirSugerencia,
    adjunto, adjuntoLoading, abrirSelector, quitarAdjunto,
    onArchivoSeleccionado, onArchivoDrop, fileInputRef,
  };
}
