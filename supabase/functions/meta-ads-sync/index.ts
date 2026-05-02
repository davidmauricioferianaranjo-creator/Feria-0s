// supabase/functions/meta-ads-sync/index.ts
// Sincroniza métricas reales de Meta Ads (campañas, leads, gasto, CPL)
// y devuelve los datos al frontend de Marketing.
// También captura leads de formularios de Lead Ads → tabla leads de Supabase.
//
// Deploy: supabase functions deploy meta-ads-sync --project-ref dldykrsikwbibiegtyyb
// Secrets requeridos: META_ADS_ACCESS_TOKEN, META_ADS_ACCOUNT_ID,
//                    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];
const META_API = 'https://graph.facebook.com/v19.0';

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
});

// ── Detectar brand desde nombre de campaña ──────────────────────
function detectBrand(nombre: string): 'feria' | 'bl' {
  const n = nombre.toLowerCase();
  if (n.includes('legacy') || n.includes('b&l') || n.includes('fotografo') || n.includes('fotógrafo') || n.includes('brand and legacy')) return 'bl';
  return 'feria';
}

// ── Extraer valor de actions de Meta ───────────────────────────
function getAction(actions: Array<{action_type: string; value: string}> = [], type: string): number {
  const found = actions.find(a => a.action_type === type);
  return found ? parseInt(found.value, 10) : 0;
}

// ── Fetch con timeout ──────────────────────────────────────────
async function fetchMeta(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Meta API ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  const token     = Deno.env.get('META_ADS_ACCESS_TOKEN');
  const accountId = Deno.env.get('META_ADS_ACCOUNT_ID') || 'act_1656208108258869';
  const sbUrl     = Deno.env.get('SUPABASE_URL');
  const sbKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'META_ADS_ACCESS_TOKEN no configurado en Supabase Secrets.' }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const datePreset = (body as Record<string, string>).datePreset || 'last_30d';

    // ── 1. Traer campañas ────────────────────────────────────────
    const campaignsUrl = `${META_API}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&limit=50&access_token=${token}`;
    const campaignsData = await fetchMeta(campaignsUrl) as { data: Array<Record<string, string>> };

    const campaigns = campaignsData?.data || [];

    // ── 2. Traer insights por campaña (en paralelo) ──────────────
    const insightsPromises = campaigns.map(async (campaign) => {
      try {
        const insightUrl = `${META_API}/${campaign.id}/insights?fields=spend,impressions,clicks,cpm,ctr,actions,date_start,date_stop&date_preset=${datePreset}&access_token=${token}`;
        const data = await fetchMeta(insightUrl) as { data: Array<Record<string, unknown>> };
        return { id: campaign.id, insights: data?.data?.[0] || null };
      } catch {
        return { id: campaign.id, insights: null };
      }
    });

    const insightsResults = await Promise.all(insightsPromises);
    const insightsMap = Object.fromEntries(insightsResults.map(r => [r.id, r.insights]));

    // ── 3. Combinar campañas + métricas ──────────────────────────
    const campanas = campaigns.map((c) => {
      const insights    = insightsMap[c.id] as Record<string, unknown> | null;
      const actions     = (insights?.actions as Array<{action_type: string; value: string}>) || [];
      const inversion   = parseFloat((insights?.spend as string) || '0');
      const leads       = getAction(actions, 'lead') || getAction(actions, 'leadgen.other');
      const compras     = getAction(actions, 'purchase');
      const pageViews   = getAction(actions, 'landing_page_view');
      const impressions = parseInt((insights?.impressions as string) || '0', 10);
      const clicks      = parseInt((insights?.clicks as string) || '0', 10);
      const cpm         = parseFloat((insights?.cpm as string) || '0');
      const ctr         = parseFloat((insights?.ctr as string) || '0');
      const cpl         = leads > 0 ? +(inversion / leads).toFixed(2) : 0;
      const brand       = detectBrand(c.name);

      const budget = c.daily_budget
        ? parseFloat(c.daily_budget) / 100
        : c.lifetime_budget
          ? parseFloat(c.lifetime_budget) / 100
          : 0;

      return {
        id:           c.id,
        nombre:       c.name,
        canal:        'Meta Ads',
        brand,
        estado:       c.status === 'ACTIVE' ? 'activa' : c.status === 'PAUSED' ? 'pausada' : 'completada',
        objetivo:     c.objective?.toLowerCase().replace(/_/g, ' ') || '',
        presupuesto:  budget,
        inversion:    Math.round(inversion * 100) / 100,
        leads,
        conversiones: compras,
        pageViews,
        impressions,
        clicks,
        cpm:          Math.round(cpm * 100) / 100,
        ctr:          Math.round(ctr * 100) / 100,
        cpl,
        inicio:       insights?.date_start as string || c.created_time?.slice(0, 10) || '',
        fin:          insights?.date_stop  as string || '',
        metaId:       c.id,
        _fromMeta:    true,
      };
    });

    // ── 4. Traer leads de formularios (Lead Ads) ─────────────────
    let formLeads: Array<Record<string, unknown>> = [];
    try {
      const formsUrl   = `${META_API}/${accountId}/leadgen_forms?fields=id,name,leads_count,created_time&limit=20&access_token=${token}`;
      const formsData  = await fetchMeta(formsUrl) as { data: Array<Record<string, unknown>> };
      const forms      = formsData?.data || [];

      const leadsPromises = forms.map(async (form) => {
        try {
          const leadsUrl = `${META_API}/${form.id}/leads?fields=id,created_time,field_data&limit=50&access_token=${token}`;
          const lData    = await fetchMeta(leadsUrl) as { data: Array<Record<string, unknown>> };
          return (lData?.data || []).map(lead => {
            const fields: Record<string, string> = {};
            ((lead.field_data as Array<{name: string; values: string[]}>) || []).forEach(f => {
              fields[f.name] = f.values?.[0] || '';
            });
            return {
              metaLeadId:  lead.id as string,
              formId:      form.id as string,
              formName:    form.name as string,
              nombre:      fields.full_name || fields.first_name ? `${fields.first_name || ''} ${fields.last_name || ''}`.trim() : '',
              email:       fields.email || '',
              telefono:    fields.phone_number || fields.phone || '',
              mensaje:     fields.message || '',
              servicio:    fields.service || form.name as string,
              createdAt:   lead.created_time as string,
              origen:      'Meta Lead Ads',
              canal:       'instagram',
              status:      'nuevo',
            };
          });
        } catch {
          return [];
        }
      });

      const allLeads = await Promise.all(leadsPromises);
      formLeads = allLeads.flat();

      // ── Guardar nuevos leads en Supabase (si están configurados) ──
      if (sbUrl && sbKey && formLeads.length > 0) {
        const existRes = await fetch(`${sbUrl}/rest/v1/leads?origen=eq.Meta Lead Ads&select=meta_lead_id`, {
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        });
        const existingLeads = await existRes.json().catch(() => []);
        const existingIds   = new Set((existingLeads as Array<{meta_lead_id: string}>).map(l => l.meta_lead_id));

        const nuevosLeads = formLeads
          .filter(l => l.metaLeadId && !existingIds.has(l.metaLeadId as string))
          .map(l => ({
            nombre:        l.nombre || 'Lead Meta',
            email:         l.email,
            telefono:      l.telefono,
            servicio:      l.servicio,
            origen:        'Meta Lead Ads',
            canal:         l.canal,
            status:        'nuevo',
            meta_lead_id:  l.metaLeadId,
            form_name:     l.formName,
            notas:         l.mensaje,
            created_at:    l.createdAt,
          }));

        if (nuevosLeads.length > 0) {
          await fetch(`${sbUrl}/rest/v1/leads`, {
            method:  'POST',
            headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body:    JSON.stringify(nuevosLeads),
          });
          console.log(`✓ meta-ads-sync: ${nuevosLeads.length} nuevos leads guardados en CRM`);
        }
      }
    } catch (leadErr) {
      console.warn('Lead Ads sync parcial:', (leadErr as Error).message);
    }

    // ── 5. Resumen mensual para gráficas ─────────────────────────
    const totalInversion  = campanas.reduce((a, c) => a + c.inversion, 0);
    const totalLeads      = campanas.reduce((a, c) => a + c.leads, 0);
    const totalConversiones = campanas.reduce((a, c) => a + c.conversiones, 0);

    // ── TOP POSTS — acción para traer posts con métricas ──────────
    const action = (body as Record<string, string>).action;
    if (action === 'top_posts') {
      const igToken    = Deno.env.get('META_INSTAGRAM_TOKEN') || token;
      const igId       = Deno.env.get('META_INSTAGRAM_ID')    || '';
      const pageId     = Deno.env.get('META_PAGE_ID_FERIA')   || '';
      const datePreset = (body as Record<string, string>).datePreset || 'last_30d';

      const posts: Array<Record<string, unknown>> = [];

      // ── Instagram posts ─────────────────────────────────────
      if (igId && igToken) {
        try {
          const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
          const igUrl  = `${META_API}/${igId}/media?fields=${fields}&limit=30&access_token=${igToken}`;
          const igData = await fetchMeta(igUrl) as { data: Array<Record<string, unknown>> };
          const igPosts = igData?.data || [];

          // Traer insights por post en paralelo
          const igWithInsights = await Promise.all(igPosts.map(async (p) => {
            try {
              const insightUrl = `${META_API}/${p.id}/insights?metric=reach,impressions,saved,total_interactions&access_token=${igToken}`;
              const ins = await fetchMeta(insightUrl) as { data: Array<{name: string; values: Array<{value: number}>}> };
              const metric = (name: string) => ins?.data?.find((d: {name: string}) => d.name === name)?.values?.[0]?.value || 0;
              return {
                id:             String(p.id),
                plataforma:     'Instagram',
                tipo:           String(p.media_type || 'POST').replace('CAROUSEL_ALBUM','Carrusel').replace('VIDEO','Reel').replace('IMAGE','Post'),
                titulo:         String((p.caption as string || '').slice(0, 80) + ((p.caption as string || '').length > 80 ? '…' : '')),
                alcance:        metric('reach'),
                impresiones:    metric('impressions'),
                interacciones:  metric('total_interactions'),
                guardados:      metric('saved'),
                likes:          Number(p.like_count || 0),
                comentarios:    Number(p.comments_count || 0),
                fecha:          String(p.timestamp || '').slice(0, 10),
                imagen:         String(p.media_type === 'VIDEO' ? (p.thumbnail_url || '') : (p.media_url || '')),
                url:            String(p.permalink || ''),
                marca:          'feria',
              };
            } catch {
              return null;
            }
          }));
          posts.push(...igWithInsights.filter(Boolean) as Array<Record<string, unknown>>);
        } catch (igErr) {
          console.warn('IG posts error:', (igErr as Error).message);
        }
      }

      // ── Facebook page posts ──────────────────────────────────
      if (pageId) {
        const pageToken = Deno.env.get('META_PAGE_TOKEN_FERIA') || igToken;
        try {
          const fbFields = 'id,message,full_picture,created_time,permalink_url';
          const fbUrl    = `${META_API}/${pageId}/posts?fields=${fbFields}&limit=20&access_token=${pageToken}`;
          const fbData   = await fetchMeta(fbUrl) as { data: Array<Record<string, unknown>> };
          const fbPosts  = fbData?.data || [];

          const fbWithInsights = await Promise.all(fbPosts.map(async (p) => {
            try {
              const insUrl = `${META_API}/${p.id}/insights?metric=post_impressions_unique,post_impressions,post_engaged_users,post_clicks&access_token=${pageToken}`;
              const ins    = await fetchMeta(insUrl) as { data: Array<{name: string; values: Array<{value: number}>}> };
              const metric = (name: string) => ins?.data?.find((d: {name: string}) => d.name === name)?.values?.[0]?.value || 0;
              return {
                id:             String(p.id),
                plataforma:     'Facebook',
                tipo:           p.full_picture ? 'Imagen' : 'Post',
                titulo:         String((p.message as string || '').slice(0, 80) + ((p.message as string || '').length > 80 ? '…' : '')),
                alcance:        metric('post_impressions_unique'),
                impresiones:    metric('post_impressions'),
                interacciones:  metric('post_engaged_users'),
                guardados:      metric('post_clicks'),
                fecha:          String(p.created_time || '').slice(0, 10),
                imagen:         String(p.full_picture || ''),
                url:            String(p.permalink_url || ''),
                marca:          'feria',
              };
            } catch {
              return null;
            }
          }));
          posts.push(...fbWithInsights.filter(Boolean) as Array<Record<string, unknown>>);
        } catch (fbErr) {
          console.warn('FB posts error:', (fbErr as Error).message);
        }
      }

      // Ordenar por alcance
      posts.sort((a, b) => Number(b.alcance) - Number(a.alcance));

      return new Response(JSON.stringify({ ok: true, posts, action: 'top_posts' }), {
        headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok:         true,
      campanas,
      formLeads:  formLeads.length,
      summary: {
        totalInversion:    Math.round(totalInversion * 100) / 100,
        totalLeads,
        totalConversiones,
        cplPromedio:       totalLeads > 0 ? +(totalInversion / totalLeads).toFixed(2) : 0,
        campañasActivas:   campanas.filter(c => c.estado === 'activa').length,
        syncedAt:          new Date().toISOString(),
      },
    }), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('meta-ads-sync ERROR:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
