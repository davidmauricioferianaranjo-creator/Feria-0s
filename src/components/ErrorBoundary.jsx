import React from 'react';

/**
 * ErrorBoundary — captura errores de renderizado en módulos individuales.
 * Evita que un fallo en Finanzas, por ejemplo, rompa todo el app.
 * Uso: <ErrorBoundary module="Finanzas"><Finanzas /></ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.module || 'App'}]`, error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const module = this.props.module || 'este módulo';
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>⚠</div>
        <div style={{
          fontWeight: 700, fontSize: 16, color: 'var(--text)',
          fontFamily: 'var(--font-serif)',
        }}>
          Error en {module}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-d)', textAlign: 'center', maxWidth: 400 }}>
          {this.state.error?.message || 'Ocurrió un error inesperado.'}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            background: 'var(--gold)', color: 'var(--dark)', border: 'none',
            borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Reintentar
        </button>
        <div style={{ fontSize: 10, color: 'var(--text-d)' }}>
          Si el error persiste, recarga la página o contacta al equipo técnico.
        </div>
      </div>
    );
  }
}
