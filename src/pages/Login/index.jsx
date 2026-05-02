import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { DEMO_ACCOUNTS, getDemoAccountByEmail } from '../../lib/demoAccounts';

const inputBase = {
  width: '100%', background: 'var(--s2)',
  border: '1px solid var(--border-s)', borderRadius: 9,
  padding: '11px 14px', fontSize: 13, color: 'var(--text)',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
};

export default function Login() {
  const { signIn, error } = useAuth();
  const { setDemoMode, loadDemoFlow } = useApp();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const [setupToken, setSetupToken] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 10000)
      );
      const ok = await Promise.race([signIn(email, password), timeoutPromise]);
      if (ok && getDemoAccountByEmail(email)) {
        await loadDemoFlow();
      }
      if (!ok) setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleDemoAccount = (account) => {
    localStorage.setItem('feria_demo_mode', 'true');
    setDemoMode(true);
    setEmail(account.email);
    setPassword(account.password);
    setSetupMessage('');
  };

  const prepareDemoAccounts = async () => {
    if (!isConfigured) {
      setSetupMessage('Supabase no está configurado. Configura REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY.');
      return;
    }
    setSetupLoading(true);
    setSetupMessage('Preparando cuentas demo…');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('seed-demo-accounts', {
        body: { setup_token: setupToken || undefined },
      });
      if (invokeError) throw invokeError;
      if (!data?.ok) throw new Error(data?.error || 'No se pudieron preparar las cuentas demo.');
      localStorage.setItem('feria_demo_mode', 'true');
      setSetupMessage(`Cuentas demo listas. Usuarios creados/actualizados: ${data.accounts?.length || DEMO_ACCOUNTS.length}.`);
    } catch (err) {
      setSetupMessage(err?.message || 'No se pudieron preparar las cuentas demo. Revisa que la función seed-demo-accounts esté desplegada.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 32, color: 'var(--gold)',
            letterSpacing: '.04em', marginBottom: 6,
          }}>
            Feria <em>OS</em>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-d)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Design Studio · Sistema de gestión
          </div>
        </div>

        <div style={{
          background: 'var(--s1)', border: '1px solid var(--border-s)',
          borderRadius: 16, padding: '30px 28px',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', marginBottom:24 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Bienvenido</div>
              <div style={{ fontSize: 12, color: 'var(--text-d)' }}>
                Inicia sesión con tu cuenta del equipo o del cliente.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              style={{ background:'var(--s2)', border:'1px solid var(--border-s)', color:'var(--text-m)', borderRadius:999, padding:'7px 11px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}
            >
              {showDemo ? 'Ocultar demo' : 'Ver demo'}
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Email
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@feria.design"
                autoComplete="email"
                style={inputBase}
                onFocus={e => e.target.style.borderColor = 'var(--border)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-s)'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                Contraseña
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = 'var(--border)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-s)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--text-d)', padding: 2,
                  }}
                >
                  {showPass ? '○' : '◉'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(224,96,96,0.1)', border: '1px solid rgba(224,96,96,0.2)',
                borderRadius: 8, padding: '10px 13px', fontSize: 12,
                color: 'var(--red)', marginBottom: 16, lineHeight: 1.5,
              }}>
                {error === 'Invalid login credentials'
                  ? 'Email o contraseña incorrectos. Si estás probando el demo, primero prepara las cuentas demo.'
                  : error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '12px',
                background: email && password ? 'var(--gold)' : 'rgba(201,169,110,0.2)',
                color: email && password ? 'var(--dark)' : 'rgba(237,232,223,.3)',
                border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: email && password ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--dark)', animation: 'spin 1s linear infinite' }} />
                  Iniciando sesión…
                </>
              ) : 'Iniciar sesión →'}
            </button>
          </form>
        </div>

        {showDemo && (
          <div style={{ marginTop: 16, background: 'var(--s1)', border: '1px solid var(--border-s)', borderRadius: 16, padding: '16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-d)', marginBottom: 5 }}>
                  Cuentas demo
                </div>
                <div style={{ fontSize: 12, color:'var(--text-m)', lineHeight:1.5 }}>
                  Usa cualquiera de estos accesos para revisar cada rol. El cliente demo entra directo al portal.
                </div>
              </div>
              <div style={{ fontSize: 10, color:'var(--text-d)', textAlign:'right', lineHeight:1.4 }}>
                Contraseña común<br/><strong style={{ color:'var(--gold)' }}>FeriaDemo2026!</strong>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:8 }}>
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDemoAccount(account)}
                  style={{
                    textAlign:'left', display:'flex', gap:10, alignItems:'center', padding:'10px', borderRadius:12,
                    border:`1px solid ${email === account.email ? account.color : 'var(--border-s)'}`,
                    background: email === account.email ? `${account.color}16` : 'var(--s2)',
                    color:'var(--text)', cursor:'pointer', fontFamily:'inherit', minWidth:0,
                  }}
                >
                  <div style={{ width:32, height:32, borderRadius:'50%', background:`${account.color}22`, color:account.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {account.name.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:650, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{account.roleLabel}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{account.email}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border-s)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'center' }}>
                <input
                  type="password"
                  value={setupToken}
                  onChange={e => setSetupToken(e.target.value)}
                  placeholder="Token de preparación demo, si fue configurado"
                  style={{ ...inputBase, fontSize: 11, padding:'9px 12px' }}
                />
                <button
                  type="button"
                  onClick={prepareDemoAccounts}
                  disabled={setupLoading}
                  style={{ background:'transparent', border:'1px solid var(--gold)', color:'var(--gold)', borderRadius:9, padding:'9px 12px', fontSize:11, fontWeight:650, cursor:setupLoading ? 'wait' : 'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}
                >
                  {setupLoading ? 'Preparando…' : 'Preparar demo'}
                </button>
              </div>
              {setupMessage && <div style={{ marginTop:8, fontSize:10, color: setupMessage.includes('listas') ? 'var(--green)' : 'var(--text-d)', lineHeight:1.5 }}>{setupMessage}</div>}
              <div style={{ marginTop:8, fontSize:10, color:'var(--text-d)', lineHeight:1.5 }}>
                Si las credenciales no entran, despliega la función <strong style={{ color:'var(--text-m)' }}>seed-demo-accounts</strong> y presiona “Preparar demo”.
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: 'var(--text-d)' }}>
          Feria Design Studio · Sistema privado
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
