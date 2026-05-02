import React from 'react';
import stagesJson from '../animations/projectStages.json';

function configForStage(stage) {
  return stagesJson.stages.find(item => stage >= item.min && stage <= item.max) || stagesJson.stages[0];
}

function ArtisanCookingIllustration({ accent = '#C9A96E', motion = 'stir', compact = false }) {
  const ready = motion === 'ready' || motion === 'plate';

  return (
    <div
      className={`artisan-scene artisan-${motion}${compact ? ' artisan-compact' : ''}`}
      style={{
        '--artisan-accent': accent,
        '--artisan-ink': '#2C2924',
        '--artisan-paper': '#FFFFFF',
        '--artisan-soft': '#F9E1E4',
      }}
    >
      <svg viewBox="0 0 360 230" role="img" aria-label="Oso cocinando el proyecto" className="artisan-svg">
        <defs>
          <filter id="artisanShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#111111" floodOpacity=".12" />
          </filter>
          <filter id="artisanInk" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.65" />
          </filter>
        </defs>

        <rect className="artisan-paper" x="14" y="14" width="332" height="202" rx="28" />
        <path className="artisan-orbit" d="M37 157 C56 126, 54 86, 91 56 C120 32, 158 37, 173 71" />
        <path className="artisan-orbit artisan-orbit-b" d="M309 58 C335 88, 329 135, 300 158" />
        <path className="artisan-heart" d="M292 51 C292 42 304 38 310 46 C317 38 329 43 329 53 C329 67 310 78 310 78 C310 78 292 66 292 51Z" />
        <path className="artisan-heart artisan-heart-b" d="M52 65 C52 57 62 53 68 60 C74 53 85 57 85 66 C85 77 68 85 68 85 C68 85 52 77 52 65Z" />

        <g className="artisan-ink" filter="url(#artisanShadow)">
          <path className="artisan-counter" d="M70 166 L271 166 L238 204 L105 204 Z" />
          <path className="artisan-counter-line" d="M91 177 L245 177" />
          <path className="artisan-counter-line" d="M116 192 L221 192" />
          <path className="artisan-counter-line artisan-counter-short" d="M74 166 C106 158 233 158 270 166" />
        </g>

        <g className="artisan-bear artisan-ink">
          <path className="artisan-fill" d="M97 101 C88 88 95 65 118 56 C141 46 166 57 173 77 C181 101 164 126 134 126 C118 126 106 116 97 101Z" />
          <circle className="artisan-fill" cx="104" cy="75" r="17" />
          <circle className="artisan-fill" cx="166" cy="78" r="17" />
          <path className="artisan-hat" d="M106 58 C103 38 120 25 140 25 C160 26 176 39 171 62 C151 68 126 67 106 58Z" />
          <path className="artisan-hat-brim" d="M108 61 C127 68 150 68 169 61" />
          <path className="artisan-ear-shade" d="M96 74 C102 65 112 65 119 73" />
          <path className="artisan-ear-shade" d="M154 75 C161 67 172 69 178 78" />
          <circle className="artisan-eye" cx="124" cy="88" r="4.4" />
          <circle className="artisan-eye" cx="151" cy="89" r="4.4" />
          <ellipse className="artisan-cheek" cx="112" cy="103" rx="9" ry="5" />
          <ellipse className="artisan-cheek" cx="162" cy="104" rx="9" ry="5" />
          <ellipse className="artisan-muzzle" cx="137" cy="108" rx="21" ry="15" />
          <circle className="artisan-eye" cx="137" cy="103" r="4.2" />
          <path className="artisan-mouth" d="M137 109 C134 115 128 115 126 111 M137 109 C140 116 147 115 149 111" />
          <path className="artisan-apron" d="M116 122 C125 130 151 131 160 123 L168 159 C151 166 126 165 109 158 Z" />
          <path className="artisan-apron-line" d="M121 136 C133 142 149 142 161 136" />
          <path className="artisan-arm" d="M161 122 C180 121 194 132 197 150" />
          <path className="artisan-arm artisan-arm-left" d="M104 119 C91 130 90 146 101 154" />
        </g>

        <g className="artisan-pot artisan-ink">
          <path className="artisan-pot-body" d="M126 141 C125 128 136 120 154 121 L212 121 C227 121 237 130 236 143 C235 168 219 179 181 179 C143 179 129 167 126 141Z" />
          <path className="artisan-pot-lip" d="M129 130 L234 130" />
          <path className="artisan-pot-highlight" d="M145 144 C158 151 199 152 218 144" />
          <path className="artisan-handle" d="M125 140 C111 138 106 153 121 155" />
          <path className="artisan-handle" d="M237 140 C254 138 257 154 241 156" />
          {ready && <ellipse className="artisan-dish" cx="181" cy="135" rx="34" ry="10" style={{ fill: accent }} />}
        </g>

        {!ready && (
          <g className="artisan-spoon artisan-ink">
            <path className="artisan-spoon-line" d="M185 56 L174 143" />
            <path className="artisan-spoon-head" d="M186 50 C197 52 195 66 182 67 C174 64 177 52 186 50Z" />
          </g>
        )}

        <g className="artisan-steam">
          <path d="M162 105 C151 89 178 86 167 69" />
          <path d="M190 104 C178 88 205 84 194 68" />
          <path d="M216 105 C206 90 226 87 220 72" />
        </g>

        <g className="artisan-brand-card artisan-ink">
          <path d="M231 65 L289 48 L296 101 L237 119 Z" />
          <circle className="artisan-pin" cx="240" cy="70" r="3" />
          <path d="M243 80 L281 69" />
          <path d="M246 94 L284 83" />
          <path className="artisan-small-logo" d="M250 108 C258 101 266 101 274 108" />
          <text x="248" y="106" className="artisan-text">BRAND</text>
        </g>

        <g className="artisan-spices artisan-ink">
          <path className="artisan-spice" d="M51 165 C57 159 66 159 72 165 C66 171 57 171 51 165Z" />
          <path className="artisan-spice" d="M287 172 C293 166 302 166 308 172 C302 178 293 178 287 172Z" />
          <path className="artisan-note" d="M277 122 L316 114 L321 139 L282 147 Z" />
          <path className="artisan-note-line" d="M287 128 L311 123" />
          <path className="artisan-note-line" d="M290 137 L313 132" />
        </g>
      </svg>
    </div>
  );
}

function useDotLottiePlayer() {
  const [ready, setReady] = React.useState(() => (
    typeof window !== 'undefined' && Boolean(window.customElements?.get('dotlottie-player'))
  ));

  React.useEffect(() => {
    if (ready || typeof document === 'undefined') return undefined;
    const existing = document.querySelector('script[data-feria-dotlottie-player="true"]');
    const markReady = () => setReady(Boolean(window.customElements?.get('dotlottie-player')));

    if (existing) {
      existing.addEventListener('load', markReady, { once: true });
      window.customElements?.whenDefined?.('dotlottie-player').then(markReady).catch(() => {});
      return () => existing.removeEventListener('load', markReady);
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
    script.dataset.feriaDotlottiePlayer = 'true';
    script.addEventListener('load', markReady, { once: true });
    script.addEventListener('error', () => setReady(false), { once: true });
    document.head.appendChild(script);
    window.customElements?.whenDefined?.('dotlottie-player').then(markReady).catch(() => {});
    return () => script.removeEventListener('load', markReady);
  }, [ready]);

  return ready;
}

function RetroCoffeeAnimation({ accent, motion, forceIllustration = false, compact = false }) {
  const ready = useDotLottiePlayer();
  if (forceIllustration || !ready) return <ArtisanCookingIllustration accent={accent} motion={motion} compact={compact} />;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: compact ? 168 : 196, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <dotlottie-player
        src="/assets/retro-coffee-character.lottie"
        autoplay
        loop
        background="transparent"
        style={{
          width: compact ? 'min(100%, 300px)' : 'min(100%, 360px)',
          height: compact ? 168 : 196,
          maxHeight: compact ? 168 : 196,
        }}
        aria-label="Animacion de Feria preparando el proyecto"
      />
    </div>
  );
}

export default function StageAnimation({ stage = 0, daysLeft = 0, isDark = true, accentColor = '#C9A96E', forceIllustration = false, compact = false }) {
  const cfg = configForStage(stage);
  const accent = cfg.accent || accentColor;
  const colors = isDark
    ? {
        card: '#11100F',
        scene: '#FFFFFF',
        border: 'rgba(255,255,255,.10)',
        sceneBorder: 'rgba(31,29,26,.10)',
        text: '#F4EFE7',
        muted: 'rgba(244,239,231,.70)',
        subtle: 'rgba(244,239,231,.46)',
        statBg: 'rgba(255,255,255,.045)',
        shadow: '0 18px 44px rgba(0,0,0,.24)',
      }
    : {
        card: '#FFFFFF',
        scene: '#FFFFFF',
        border: 'rgba(31,29,26,.10)',
        sceneBorder: 'rgba(31,29,26,.10)',
        text: '#14110F',
        muted: '#716B64',
        subtle: '#9D968E',
        statBg: '#FAF8F4',
        shadow: '0 14px 34px rgba(31,29,26,.055)',
      };

  return (
    <div className="stage-animation-card" style={{
      background: colors.card,
      border: 'none',
      borderRadius: 14,
      padding: compact ? 12 : 14,
      marginBottom: 16,
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))' : 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
      gap: compact ? 14 : 18,
      alignItems: 'center',
      boxShadow: colors.shadow,
      overflow: 'hidden',
    }}>
      <div className="stage-animation-scene" style={{ background: colors.scene, border: 'none', borderRadius: 0, minHeight: compact ? 168 : 188, maxHeight: compact ? 210 : 238, overflow: 'hidden' }}>
        <RetroCoffeeAnimation accent={accent} motion={cfg.motion} forceIllustration={forceIllustration} compact={compact} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${accent}3d`, background: `${accent}12`, color: accent, borderRadius: 999, padding: '5px 10px', fontSize: 10, fontWeight: 850, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'artisanPulse 1.8s ease-in-out infinite' }} />
          {cfg.dish}
        </div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: compact ? 'clamp(22px, 2.4vw, 30px)' : 'clamp(24px, 3vw, 34px)', lineHeight: 1.06, color: colors.text, marginBottom: 10 }}>{cfg.title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: colors.muted, maxWidth: 420 }}>{cfg.copy}</div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 16 }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 9, padding: '8px 10px', background: colors.statBg }}>
            <div style={{ fontSize: 10, color: colors.subtle, textTransform: 'uppercase', letterSpacing: '.1em' }}>Etapa</div>
            <div style={{ fontSize: 18, color: colors.text, fontWeight: 400 }}>{stage + 1}</div>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 9, padding: '8px 10px', background: colors.statBg }}>
            <div style={{ fontSize: 10, color: colors.subtle, textTransform: 'uppercase', letterSpacing: '.1em' }}>Entrega</div>
            <div style={{ fontSize: 18, color: colors.text, fontWeight: 400 }}>{daysLeft <= 0 ? 'Hoy' : `${daysLeft} dias`}</div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width:520px){
          .stage-animation-card{padding:10px!important;gap:10px!important;border-radius:14px!important}
          .stage-animation-scene{min-height:136px!important;max-height:166px!important}
          .artisan-scene{min-height:136px!important}
          .artisan-svg{width:min(100%,250px)!important;min-height:136px!important}
        }
        .artisan-scene{position:relative;width:100%;height:100%;min-height:188px;display:grid;place-items:center;background:#FFFFFF}
        .artisan-scene.artisan-compact{min-height:168px}
        .artisan-svg{width:min(100%,360px);height:100%;min-height:190px;overflow:visible}
        .artisan-compact .artisan-svg{width:min(100%,306px);min-height:168px}
        .artisan-paper{fill:#FFFFFF;stroke:none;stroke-width:0}
        .artisan-ink{filter:none}
        .artisan-fill,.artisan-hat,.artisan-muzzle,.artisan-counter,.artisan-pot-body,.artisan-brand-card path,.artisan-note{fill:#FFFDF8;stroke:var(--artisan-ink);stroke-width:4.7;stroke-linejoin:round;stroke-linecap:round}
        .artisan-hat{fill:#FFFFFF}.artisan-hat-brim,.artisan-mouth,.artisan-arm,.artisan-spoon-line,.artisan-steam path,.artisan-orbit,.artisan-counter-line,.artisan-pot-lip,.artisan-handle,.artisan-apron-line,.artisan-pot-highlight,.artisan-small-logo,.artisan-note-line{fill:none;stroke:var(--artisan-ink);stroke-width:4.7;stroke-linecap:round;stroke-linejoin:round}
        .artisan-counter{fill:#FFFFFF}.artisan-counter-line{stroke-width:2.8;opacity:.52}.artisan-counter-short{opacity:.18}.artisan-pot-body{fill:#211F22}.artisan-pot-lip,.artisan-handle{stroke:var(--artisan-ink)}.artisan-pot-highlight{stroke:#FFFFFF;stroke-width:2.5;opacity:.18}.artisan-dish{opacity:.28;stroke:var(--artisan-ink);stroke-width:3}
        .artisan-eye{fill:var(--artisan-ink)}.artisan-cheek,.artisan-heart{fill:var(--artisan-soft);stroke:none;opacity:.86}.artisan-muzzle{fill:#FFF8EC;stroke-width:3.8}.artisan-text{font:900 13px sans-serif;fill:var(--artisan-ink);letter-spacing:.02em}.artisan-pin{fill:var(--artisan-accent);stroke:var(--artisan-ink);stroke-width:2.2}.artisan-small-logo{stroke:var(--artisan-accent);stroke-width:2.8}
        .artisan-apron{fill:#FFFFFF;stroke:var(--artisan-ink);stroke-width:4.3;stroke-linecap:round;stroke-linejoin:round}.artisan-ear-shade{fill:none;stroke:var(--artisan-ink);stroke-width:2.4;opacity:.24;stroke-linecap:round}.artisan-note{fill:#fffdf7;stroke-width:3}.artisan-note-line{stroke-width:2.5;opacity:.55}.artisan-spice{fill:var(--artisan-accent);stroke:var(--artisan-ink);stroke-width:3;opacity:.55}
        .artisan-orbit{fill:none;stroke:var(--artisan-ink);stroke-width:4.7;opacity:.72}.artisan-orbit-b{stroke-width:3.8;opacity:.5}
        .artisan-spoon{transform-origin:178px 142px;animation:artisanStir 1.65s ease-in-out infinite}.artisan-spoon-line,.artisan-spoon-head{stroke:var(--artisan-ink);stroke-width:5.7;stroke-linecap:round;fill:none}.artisan-spoon-head{fill:#FFFFFF}
        .artisan-steam path{stroke:var(--artisan-accent);stroke-width:4.8;opacity:.62;animation:artisanSteam 2.6s ease-in-out infinite}.artisan-steam path:nth-child(2){animation-delay:.35s}.artisan-steam path:nth-child(3){animation-delay:.7s}
        .artisan-bear{animation:artisanBob 3s ease-in-out infinite;transform-origin:138px 118px}.artisan-heart{animation:artisanHeart 3.2s ease-in-out infinite}.artisan-heart-b{animation-delay:1.1s}.artisan-brand-card{animation:artisanFloat 4.6s ease-in-out infinite}.artisan-spices{animation:artisanFloat 5.2s ease-in-out infinite reverse}
        .artisan-ready .artisan-steam path,.artisan-plate .artisan-steam path{opacity:.22}.artisan-ready .artisan-heart,.artisan-plate .artisan-heart{opacity:1}
        @keyframes artisanBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes artisanStir{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(12deg)}}
        @keyframes artisanSteam{0%{transform:translateY(10px);opacity:0}42%{opacity:.65}100%{transform:translateY(-20px);opacity:0}}
        @keyframes artisanHeart{0%,100%{transform:translateY(0) scale(1);opacity:.65}50%{transform:translateY(-8px) scale(1.06);opacity:.95}}
        @keyframes artisanFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-5px) rotate(-1deg)}}
        @keyframes artisanPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.48;transform:scale(.72)}}
      `}</style>
    </div>
  );
}
