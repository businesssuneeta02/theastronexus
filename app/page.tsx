'use client';

export default function Home(){
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'32px',background:'#0b1020',color:'#f8f5ed',textAlign:'center',fontFamily:'Arial,sans-serif'}}>
    <div style={{maxWidth:'680px'}}>
      <div style={{fontSize:'42px',marginBottom:'18px'}}>✦</div>
      <div style={{letterSpacing:'3px',fontSize:'13px',opacity:.75}}>THEASTRONEXUS</div>
      <h1 style={{fontSize:'clamp(34px,6vw,58px)',margin:'18px 0 12px'}}>Website temporarily unavailable</h1>
      <p style={{fontSize:'18px',lineHeight:1.7,opacity:.82,margin:0}}>TheAstroNexus website is temporarily unavailable. Please check back shortly.</p>
    </div>
  </main>;
}