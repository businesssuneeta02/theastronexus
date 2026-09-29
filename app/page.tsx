export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '32px',
      background: 'linear-gradient(135deg, #faf7ff 0%, #f1e8ff 100%)',
      color: '#2b2038',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <section style={{maxWidth: 680}}>
        <div style={{fontSize: 14, letterSpacing: 4, fontWeight: 700, color: '#76539f'}}>
          THEASTRONEXUS
        </div>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(48px, 8vw, 82px)',
          margin: '18px 0 12px'
        }}>
          Website Under Construction
        </h1>
        <p style={{fontSize: 18, lineHeight: 1.7, color: '#665b70', margin: 0}}>
          We are currently building something special. Please check back soon.
        </p>
      </section>
    </main>
  );
}
