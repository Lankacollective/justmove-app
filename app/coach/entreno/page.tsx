'use client'

export default function CoachEntreno() {
  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#FF9F0A', marginBottom: 6 }}>
          Panel Coach
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1916', letterSpacing: -0.8 }}>
          Planes de entrenamiento
        </div>
        <div style={{ fontSize: 13, color: '#6B6762', marginTop: 4 }}>
          Próximamente — usa IA Coach para generar planes de entreno
        </div>
      </div>

      <div style={{
        background: '#FFFFFF', borderRadius: 20, padding: '48px',
        textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1916', marginBottom: 8 }}>
          Editor de entrenos en construcción
        </div>
        <div style={{ fontSize: 13, color: '#9A9690', marginBottom: 20 }}>
          Por ahora puedes generar planes con IA y copiarlos manualmente
        </div>
        <a href="/coach/ia" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12, textDecoration: 'none',
          background: '#1A1916', fontSize: 13, fontWeight: 700, color: '#FFFFFF',
        }}>
          ✨ Ir a IA Coach
        </a>
      </div>
    </div>
  )
}
