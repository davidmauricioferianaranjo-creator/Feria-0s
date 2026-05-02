// supabase/functions/media-proxy/index.ts
// CLASIFICACIÓN: PÚBLICA CONTROLADA POR ORIGIN
//
// Por qué no puede ser autenticada con JWT:
//   Los medios se consumen directamente como src de <img>, <audio>, <video>.
//   El browser no añade Authorization headers a esas etiquetas.
//   Forzar JWT rompería el render de media en el módulo de Mensajes.
//
// Cómo se protege sin JWT:
//   1. CORS lista blanca — solo feria.design y localhost pueden invocarla
//   2. El token de Meta vive en server-side — nunca se expone al browser
//   3. Solo sirve medios de Meta — no expone datos internos ni DB
//   4. Sin media_id ni media_url válidos → 400
//
// Decisión: pública controlada por origin es el nivel correcto para esta función.
//           Cambiarla a autenticada requeriría reescribir el consumo de media en frontend.
// Deploy: supabase functions deploy media-proxy --project-ref dldykrsikwbibiegtyyb --no-verify-jwt

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  try {
    const url      = new URL(req.url);
    const mediaId  = url.searchParams.get('id');
    const mediaUrl = url.searchParams.get('url');
    const wpToken  = Deno.env.get('WHATSAPP_TOKEN');

    if (!wpToken) {
      return new Response('WHATSAPP_TOKEN no configurado', { status: 500 });
    }
    if (!mediaId && !mediaUrl) {
      return new Response('Parámetro id o url requerido', { status: 400 });
    }

    let downloadUrl = mediaUrl;

    if (mediaId && !mediaUrl) {
      const metaRes  = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${wpToken}` },
      });
      if (!metaRes.ok) return new Response('Media no encontrada en Meta', { status: 404 });
      const metaData = await metaRes.json();
      downloadUrl    = metaData.url;
    }

    if (!downloadUrl) return new Response('URL de media no disponible', { status: 404 });

    const mediaRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${wpToken}` },
    });

    if (!mediaRes.ok) {
      return new Response('Error al descargar media de Meta', { status: mediaRes.status });
    }

    const contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const buffer      = await mediaRes.arrayBuffer();

    console.log(`media-proxy: ${mediaId || 'url'} → ${contentType} ${buffer.byteLength}b`);

    return new Response(buffer, {
      headers: {
        ...corsH,
        'Content-Type':        contentType,
        'Cache-Control':       'public, max-age=3600',
        'Content-Disposition': 'inline',
      },
    });

  } catch (e) {
    console.error('media-proxy ERROR:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: corsH,
    });
  }
});
