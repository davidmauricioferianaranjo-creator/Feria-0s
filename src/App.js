import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { canAccessRoute, getDefaultRouteForUser } from './lib/permissions';
import './styles/globals.css';

// ── LAZY LOADING ── cada página se carga solo cuando se navega a ella ─────────
const Login          = lazy(() => import('./pages/Login'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const CRM            = lazy(() => import('./pages/CRM'));
const Kanban         = lazy(() => import('./pages/Kanban'));
const Finanzas       = lazy(() => import('./pages/Finanzas'));
const Admin          = lazy(() => import('./pages/Admin'));
const Portal         = lazy(() => import('./pages/Portal'));
const ClientPortal   = lazy(() => import('./pages/ClientPortal'));
const Contratos      = lazy(() => import('./pages/Contratos'));
const PostVenta      = lazy(() => import('./pages/PostVenta'));
const Inteligencia   = lazy(() => import('./pages/Inteligencia'));
const Marketing      = lazy(() => import('./pages/Marketing'));
const Mensajes       = lazy(() => import('./pages/Mensajes'));
const Cotizaciones   = lazy(() => import('./pages/Cotizaciones'));
const Calendario     = lazy(() => import('./pages/Calendario'));
const PagoCompletado = lazy(() => import('./pages/PagoCompletado'));

// ── PANTALLA DE CARGA ─────────────────────────────────────────────────────────
function Loading() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--dark)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:24, color:'var(--gold)', marginBottom:8 }}>Feria <em>OS</em></div>
        <div style={{ fontSize:11, color:'var(--text-d)', letterSpacing:'.14em' }}>Cargando…</div>
      </div>
    </div>
  );
}

// ── RUTA PROTEGIDA ────────────────────────────────────────────────────────────
function Protected({ path, element, module }) {
  const { user } = useAuth();
  if (!user || !canAccessRoute(user, path)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }
  // Cada módulo tiene su propio ErrorBoundary — un fallo no rompe el resto del app
  return <ErrorBoundary module={module}>{element}</ErrorBoundary>;
}

// ── RUTAS INTERNAS (equipo) ───────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user)   return <Navigate to="/login" replace />;

  if (user.isClient) {
    return (
      <Routes>
        <Route path="/*" element={
          <ErrorBoundary module="Portal cliente">
            <ClientPortal />
          </ErrorBoundary>
        } />
      </Routes>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text-d)' }}>Cargando…</div>}>
        <Routes>
          <Route path="/"             element={<Protected path="/"             module="Dashboard"    element={<Dashboard />}    />} />
          <Route path="/crm"          element={<Protected path="/crm"          module="CRM"          element={<CRM />}          />} />
          <Route path="/kanban"       element={<Protected path="/kanban"       module="Proyectos"    element={<Kanban />}       />} />
          <Route path="/finanzas"     element={<Protected path="/finanzas"     module="Finanzas"     element={<Finanzas />}     />} />
          <Route path="/contratos"    element={<Protected path="/contratos"    module="Contratos"    element={<Contratos />}    />} />
          <Route path="/cotizaciones" element={<Protected path="/cotizaciones" module="Cotizaciones" element={<Cotizaciones />} />} />
          <Route path="/admin"        element={<Protected path="/admin"        module="Admin"        element={<Admin />}        />} />
          <Route path="/portal"       element={<Protected path="/portal"       module="Portal"       element={<Portal />}       />} />
          <Route path="/postventa"    element={<Protected path="/postventa"    module="Post-venta"   element={<PostVenta />}    />} />
          <Route path="/inteligencia" element={<Protected path="/inteligencia" module="Inteligencia" element={<Inteligencia />} />} />
          <Route path="/marketing"    element={<Protected path="/marketing"    module="Marketing"    element={<Marketing />}    />} />
          <Route path="/mensajes"     element={<Protected path="/mensajes"     module="Mensajes"     element={<Mensajes />}     />} />
          <Route path="/calendario"   element={<Protected path="/calendario"   module="Calendario"   element={<Calendario />}   />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user)    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  return <Login />;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
function getRouterBasename() {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl || publicUrl === '.') return undefined;
  try {
    const pathname = new URL(publicUrl, window.location.origin).pathname.replace(/\/$/, '');
    return pathname || undefined;
  } catch {
    return publicUrl.replace(/\/$/, '') || undefined;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter basename={getRouterBasename()}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login"           element={<LoginRoute />} />
              <Route path="/pago-completado" element={
                <ErrorBoundary module="Pago completado">
                  <PagoCompletado />
                </ErrorBoundary>
              } />
              <Route path="/*" element={<AppRoutes />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
