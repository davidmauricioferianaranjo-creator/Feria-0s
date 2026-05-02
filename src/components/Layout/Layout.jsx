import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BadgeCheck, BrainCircuit, CalendarDays, ChevronLeft, ChevronRight,
  FileText, KanbanSquare, LayoutDashboard, LogOut, Megaphone, Menu,
  MessagesSquare, Moon, PanelRight, ReceiptText, Settings, Sun, Users,
  Wallet, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canAccessModule } from '../../lib/permissions';
import { buildInternalConversations } from '../../lib/internalComms';

// ── NAVEGACIÓN POR ROL ────────────────────────────────────────────
// Orden: flujo real del trabajo de Feria
const NAV_ALL = [
  { path: '/',            module: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/crm',         module: 'crm',          label: 'CRM',          icon: Users },
  { path: '/mensajes',    module: 'mensajes',     label: 'Mensajes',     icon: MessagesSquare },
  { path: '/calendario',  module: 'calendario',   label: 'Calendario',   icon: CalendarDays },
  { path: '/kanban',      module: 'kanban',       label: 'Proyectos',    icon: KanbanSquare },
  { path: '/contratos',   module: 'contratos',    label: 'Contratos',    icon: FileText },
  { path: '/cotizaciones',module: 'cotizaciones', label: 'Cotizaciones', icon: ReceiptText },
  { path: '/finanzas',    module: 'finanzas',     label: 'Finanzas',     icon: Wallet },
  { path: '/marketing',   module: 'marketing',    label: 'Marketing',    icon: Megaphone },
  { path: '/postventa',   module: 'postventa',    label: 'Post-venta',   icon: BadgeCheck },
  { path: '/inteligencia',module: 'inteligencia', label: 'Inteligencia', icon: BrainCircuit },
];

const NAV_BOTTOM = [
  { path: '/admin',  module: 'admin',  label: 'Administración', icon: Settings },
  { path: '/portal', module: 'portal', label: 'Vista cliente', desc: 'Preview interno', icon: PanelRight },
];

function NavIcon({ icon: Icon, size = 16 }) {
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export default function Layout({ children }) {
  const { data, notifsNoLeidas, toast, activeBrand, setActiveBrand, studioLogo, theme, toggleTheme, dbReady, isConfigured } = useApp();
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filtrar nav por permisos reales del usuario, incluyendo rol personalizado.
  const NAV        = NAV_ALL.filter(item => canAccessModule(user, item.module));
  const NAV_BOT    = NAV_BOTTOM.filter(item => canAccessModule(user, item.module));
  const internalUnread = React.useMemo(
    () => buildInternalConversations(data, user).reduce((sum, c) => sum + (c.unread || 0), 0),
    [data, user]
  );

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  const sidebarVisible = isMobile ? mobileOpen : true;
  const navCollapsed   = isMobile ? false : collapsed;
  const sidebarWidth   = isMobile ? 'min(320px, calc(100vw - 32px))' : (navCollapsed ? 68 : 248);
  const isDarkTheme    = theme === 'dark';
  const isDesignerArea = (user?.role === 'creativo' || user?.perms === 'creativo');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', minWidth: 0 }}>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 49 }} />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, background: 'var(--dark)', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, zIndex: 48 }}>
          <button onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-d)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--text)' }}>Feria <em style={{ color: 'var(--gold)' }}>OS</em></div>
          {notifsNoLeidas > 0 && (
            <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifsNoLeidas}</div>
          )}
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--dark)',
        borderRight: '1px solid var(--border-s)',
        display: sidebarVisible ? 'flex' : 'none',
        flexDirection: 'column',
        padding: isMobile ? '18px 0 16px' : '20px 0',
        transition: 'width .3s cubic-bezier(0.4, 0, 0.2, 1), min-width .3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
        overflowY: 'auto',
        zIndex: isMobile ? 50 : 10,
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, bottom: 0,
        boxShadow: isMobile ? '24px 0 80px rgba(0,0,0,.45)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 18px 18px', borderBottom: '1px solid var(--border-s)', marginBottom: 16 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em',
            color: 'var(--text)', whiteSpace: 'nowrap', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            {!navCollapsed && (
              studioLogo
                ? <img src={studioLogo} alt="Logo" style={{ height: 28, objectFit: 'contain', maxWidth: 140 }} />
                : <span>Feria <em style={{ color: 'var(--gold)' }}>OS</em></span>
            )}
            {navCollapsed && 'F'}
            <button
              onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(c => !c)}
              aria-label={isMobile ? 'Cerrar menú' : (navCollapsed ? 'Expandir menú' : 'Contraer menú')}
              style={{
              width: 34, height: 34, minWidth: 34, borderRadius: 999,
              background: 'var(--s1)', border: '1px solid var(--border-s)', color: 'var(--text-d)',
              fontSize: isMobile ? 18 : 14, cursor: 'pointer', padding: 0, transition: 'all .2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-d)'}>
              {isMobile ? <X size={18} strokeWidth={1.8} aria-hidden="true" /> : (navCollapsed ? <ChevronRight size={17} strokeWidth={1.8} aria-hidden="true" /> : <ChevronLeft size={17} strokeWidth={1.8} aria-hidden="true" />)}
            </button>
          </div>
        </div>

        {/* Brand filter */}
        {!navCollapsed && (
          <div style={{ padding: '0 14px', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 6, background: 'var(--s1)', padding: 4, borderRadius: 8, border: '1px solid var(--border-s)' }}>
              {[{ id: 'all', label: 'Todo' }, ...data.studio.brands].map(b => (
                <button key={b.id} type="button" title={b.id === 'all' ? 'Ver todas las marcas' : `Filtrar sistema por ${b.name}`} onClick={() => setActiveBrand(b.id)} style={{
                  flex: 1, fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                  background: activeBrand === b.id ? 'var(--s3)' : 'transparent',
                  color: activeBrand === b.id ? 'var(--text)' : 'var(--text-d)',
                  transition: 'all .2s ease',
                }}>
                  {b.id === 'all' ? 'Todo' : b.id === 'bl' ? 'B&L' : 'Feria'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ padding: '0 12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: navCollapsed ? 0 : 12,
                  padding: navCollapsed ? '12px' : '10px 14px',
                  minHeight: 40,
                  borderRadius: 8, marginBottom: 4,
                  justifyContent: navCollapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--s2)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-m)',
                  transition: 'all .2s ease',
                }}
                onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background = 'var(--s1)'; e.currentTarget.style.color = 'var(--text)'; } }}
                onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-m)'; } }}
                >
                  <span style={{ flexShrink: 0, width: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><NavIcon icon={item.icon} /></span>
                  {!navCollapsed && <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  {!navCollapsed && item.path === '/inteligencia' && notifsNoLeidas > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 12,
                      background: 'var(--gold)', color: '#ffffff',
                    }}>{notifsNoLeidas}</span>
                  )}
                  {!navCollapsed && item.path === '/mensajes' && internalUnread > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      minWidth: 18, height: 18, borderRadius: 12,
                      background: 'var(--red)', color: '#ffffff',
                      display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 6px',
                    }}>{internalUnread}</span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: '16px 12px 0', borderTop: '1px solid var(--border-s)' }}>
          {NAV_BOT.map(item => (
            <div key={item.path} style={{ display: 'flex', alignItems: 'center', gap: navCollapsed ? 0 : 8, marginBottom: 4 }}>
              <NavLink to={item.path} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                {({ isActive }) => (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: navCollapsed ? 0 : 12,
                    padding: navCollapsed ? '12px' : '10px 14px',
                    minHeight: 40,
                    borderRadius: 8,
                    justifyContent: navCollapsed ? 'center' : 'flex-start',
                    color: isActive ? 'var(--text)' : 'var(--text-d)',
                    background: isActive ? 'var(--s2)' : 'transparent',
                    transition: 'all .2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; if(!isActive) e.currentTarget.style.background = 'var(--s1)'; }}
                  onMouseLeave={e => { if(!isActive) { e.currentTarget.style.color = 'var(--text-d)'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <span style={{ width: 20, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><NavIcon icon={item.icon} size={15} /></span>
                    {!navCollapsed && (
                      <span style={{ minWidth:0, overflow:'hidden' }}>
                        <span style={{ display:'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        {item.desc && <span style={{ display:'block', fontSize: 9, color:'var(--text-d)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis' }}>{item.desc}</span>}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>

              {item.path === '/portal' && (
                <button
                  onClick={signOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  style={{
                    width: 36, height: 36, minWidth: 36, borderRadius: '50%',
                    border: '1px solid var(--border-s)',
                    background: 'var(--s1)', color: 'var(--text-d)',
                    cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,.35)'; e.currentTarget.style.background = 'rgba(248,113,113,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-d)'; e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.background = 'var(--s1)'; }}
                ><LogOut size={16} strokeWidth={1.8} aria-hidden="true" /></button>
              )}
            </div>
          ))}


          {/* Theme switch */}
          {!isDesignerArea && (
            <div style={{ padding: navCollapsed ? '8px 0 4px' : '8px 14px 4px', display: 'flex', justifyContent: navCollapsed ? 'center' : 'stretch' }}>
              <button
                onClick={() => toggleTheme()}
                title={isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-label={isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                style={{
                  width: navCollapsed ? 36 : '100%',
                  height: 36,
                  borderRadius: navCollapsed ? '50%' : 999,
                  border: '1px solid var(--border-s)',
                  background: 'var(--s1)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: navCollapsed ? 'center' : 'space-between',
                  gap: 8,
                  padding: navCollapsed ? 0 : '4px 6px 4px 10px',
                  transition: 'all .18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.borderColor = 'var(--border-m)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s1)'; e.currentTarget.style.borderColor = 'var(--border-s)'; }}
              >
                {!navCollapsed && <span style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-d)', fontSize: 9 }}>Tema</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--gold)', display: 'inline-flex' }}>{isDarkTheme ? <Moon size={14} strokeWidth={1.8} aria-hidden="true" /> : <Sun size={14} strokeWidth={1.8} aria-hidden="true" />}</span>
                  {!navCollapsed && <span>{isDarkTheme ? 'Oscuro' : 'Claro'}</span>}
                </span>
              </button>
            </div>
          )}

          {!NAV_BOT.some(item => item.path === '/portal') && (
            <div style={{ display: 'flex', justifyContent: navCollapsed ? 'center' : 'flex-end', padding: navCollapsed ? '8px 0 4px' : '8px 14px 4px' }}>
              <button
                onClick={signOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '1px solid var(--border-s)',
                  background: 'var(--s1)', color: 'var(--text-d)',
                  cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,.35)'; e.currentTarget.style.background = 'rgba(248,113,113,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-d)'; e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.background = 'var(--s1)'; }}
              ><LogOut size={16} strokeWidth={1.8} aria-hidden="true" /></button>
            </div>
          )}

          {/* User */}
          {!navCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginTop: 8, background: 'var(--s1)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all .2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.borderColor = 'var(--border-s)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--s1)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: user ? `${user.color}22` : 'var(--s4)',
                color: user?.color || 'var(--text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>{user?.initials || 'DA'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{user?.name || 'David'}</div>
                <div style={{ fontSize: 9, color: 'var(--text-d)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: isConfigured && dbReady ? 'var(--green)' : isConfigured ? 'var(--gold)' : 'var(--text-d)', flexShrink: 0 }} />
                  {isConfigured && dbReady ? 'DB online' : isConfigured ? 'Conectando…' : 'Modo local'}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column',
        background: 'var(--s1)',
        marginTop: isMobile ? 52 : 0,
        position: 'relative',
      }}>
        {isDesignerArea && (
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 35,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: isMobile ? '10px 14px 0' : '18px 24px 0',
            pointerEvents: 'none',
          }}>
            <div style={{
              display:'flex',
              alignItems:'center',
              gap:8,
              border:'1px solid var(--border-m)',
              borderRadius:999,
              padding:'5px 6px 5px 14px',
              background:'var(--s2)',
              boxShadow:'0 14px 40px rgba(0,0,0,.08)',
              pointerEvents:'auto',
            }}>
              <span style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)' }}>Tema</span>
              <button
                onClick={() => toggleTheme()}
                title={isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-label={isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                style={{
                  background:'var(--s3)',
                  border:'1px solid var(--border-s)',
                  color:'var(--text)',
                  borderRadius:999,
                  padding:'7px 14px',
                  fontSize:13,
                  fontWeight:700,
                  fontFamily:'inherit',
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  cursor:'pointer',
                  transition:'all .18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-s)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ color:'var(--gold)', display:'inline-flex' }}>{isDarkTheme ? <Moon size={15} strokeWidth={1.8} aria-hidden="true" /> : <Sun size={15} strokeWidth={1.8} aria-hidden="true" />}</span>
                {isDarkTheme ? 'Oscuro' : 'Claro'}
              </button>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--s3)', border: '1px solid var(--border-m)',
          borderRadius: 12, padding: '12px 18px',
          fontSize: 13, color: 'var(--text)', zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 320, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          animation: 'slideUp .3s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <span style={{ color: 'var(--text)', fontSize: 16 }}>{toast.icon}</span>
          <span style={{ fontWeight: 500 }}>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}
