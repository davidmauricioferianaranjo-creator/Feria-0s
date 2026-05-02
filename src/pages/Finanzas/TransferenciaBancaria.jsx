import React, { useState } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';

/**
 * TransferenciaBancaria
 * Muestra los datos bancarios del estudio y permite al cliente
 * adjuntar el comprobante de pago para que el equipo lo confirme.
 *
 * Uso: como alternativa al pago con Stripe en CobrosList y en el portal cliente.
 */
export default function TransferenciaBancaria({ cobro, clienteNombre, onComprobante, showToast }) {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [enviado,    setEnviado]    = useState(false);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { showToast('El archivo no debe superar los 10 MB', '⚠'); return; }
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleEnviar = async () => {
    if (!file) { showToast('Adjunta el comprobante primero', '⚠'); return; }
    setUploading(true);
    try {
      let comprobanteUrl = '';
      if (isConfigured) {
        const ext      = file.name.split('.').pop();
        const ruta     = `comprobantes/${cobro?.id || Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('comprobantes-pago').upload(ruta, file, { cacheControl:'3600', upsert:false });
        if (upErr) throw new Error('Error al subir: ' + upErr.message);
        const { data: urlData } = supabase.storage.from('comprobantes-pago').getPublicUrl(ruta);
        comprobanteUrl = urlData.publicUrl;

        // Actualizar cobro con comprobante
        if (cobro?.id) {
          await supabase.from('cobros').update({
            comprobante_url:  comprobanteUrl,
            status:           'comprobante_enviado',
            comprobante_at:   new Date().toISOString(),
          }).eq('id', cobro.id);
        }
      }
      if (typeof onComprobante === 'function') onComprobante(comprobanteUrl);
      setEnviado(true);
      showToast('Comprobante enviado — el estudio confirmará el pago', '✓');
    } catch (err) {
      showToast('Error: ' + err.message, '⚠');
    } finally {
      setUploading(false);
    }
  };

  if (enviado) {
    return (
      <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:10, padding:'14px 16px', marginTop:10 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--green)', marginBottom:4 }}>✓ Comprobante recibido</div>
        <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>
          El equipo de Feria Design Studio confirmará el depósito y activará tu proyecto. Esto puede tomar hasta 24 horas hábiles dependiendo de tu entidad bancaria.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, overflow:'hidden', marginTop:10 }}>

      {/* Header */}
      <div style={{ background:'var(--s3)', padding:'12px 16px', borderBottom:'1px solid var(--border-s)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:16 }}>🏦</span>
        <div>
          <div style={{ fontSize:12, fontWeight:600 }}>Pago por transferencia bancaria</div>
          <div style={{ fontSize:10, color:'var(--text-d)' }}>Solo para pagos nacionales en Ecuador</div>
        </div>
      </div>

      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Datos bancarios */}
        <div style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:8, padding:'12px 14px' }}>
          {[
            { label:'Banco',          value:'Banco Pichincha' },
            { label:'Tipo de cuenta', value:'Cuenta de ahorros' },
            { label:'Número',         value:'2201062504' },
            { label:'Titular',        value:'David Mauricio Feria Naranjo' },
            { label:'Concepto',       value:cobro?.tipo || `Pago Feria Design · ${clienteNombre || ''}` },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border-s)' }}>
              <span style={{ fontSize:11, color:'var(--text-d)' }}>{row.label}</span>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.7, background:'rgba(201,169,110,.06)', border:'1px solid rgba(201,169,110,.15)', borderRadius:8, padding:'10px 12px' }}>
          <strong style={{ color:'var(--gold)' }}>Importante:</strong> Algunas entidades financieras pueden demorar hasta 24-48 horas en procesar la transferencia, especialmente si es el primer pago entre cuentas. El estudio confirmará el depósito y te notificará cuando esté acreditado.
        </div>

        {/* Upload comprobante */}
        <div>
          <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Adjunta tu comprobante</div>

          {preview && (
            <img src={preview} alt="comprobante" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:8, marginBottom:8 }} />
          )}

          {file && !preview && (
            <div style={{ background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 12px', fontSize:11, color:'var(--text-m)', marginBottom:8 }}>
              📎 {file.name} ({(file.size/1024/1024).toFixed(2)} MB)
            </div>
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFileChange}
            id="comprobante-upload"
            style={{ display:'none' }}
          />
          <label htmlFor="comprobante-upload"
            style={{ display:'block', textAlign:'center', padding:'10px', background:'var(--s3)', border:'1px dashed var(--border-m)', borderRadius:8, fontSize:11, color:'var(--text-d)', cursor:'pointer' }}>
            {file ? '📁 Cambiar archivo' : '📁 Seleccionar comprobante (JPG, PNG, PDF)'}
          </label>
        </div>

        {/* Botón enviar */}
        <button onClick={handleEnviar} disabled={!file || uploading}
          style={{ background: (!file||uploading) ? 'var(--s3)' : 'var(--gold)', color: (!file||uploading) ? 'var(--text-d)' : 'var(--dark)', border:'none', borderRadius:8, padding:'11px', fontSize:12, fontWeight:600, cursor:(!file||uploading)?'default':'pointer', fontFamily:'inherit', transition:'all .15s' }}>
          {uploading ? '⬆ Subiendo comprobante…' : '✓ Enviar comprobante'}
        </button>
      </div>
    </div>
  );
}
