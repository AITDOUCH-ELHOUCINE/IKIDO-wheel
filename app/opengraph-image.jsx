import { ImageResponse } from 'next/og';
import { KMark } from '@/lib/kmark';
import { site } from '@/lib/site';

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLORS = ['#14b8b3', '#16191d', '#7fdcd7', '#0b7f7b'];

// Wheel drawn as SVG wedges (ImageResponse has no canvas).
function Wheel({ r }) {
  const n = 8;
  const p = a => `${r + r * Math.cos(a)} ${r + r * Math.sin(a)}`;
  const wedges = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    return <path key={i} d={`M${r} ${r} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`} fill={COLORS[i % COLORS.length]} />;
  });
  return (
    <svg width={r * 2} height={r * 2} viewBox={`0 0 ${r * 2} ${r * 2}`}>
      {wedges}
      <circle cx={r} cy={r} r={r - 6} fill="none" stroke="#16191d" strokeWidth="12" />
      <circle cx={r} cy={r} r={r * 0.13} fill="#16191d" stroke="#ffffff" strokeWidth="6" />
      <circle cx={r} cy={r} r={r * 0.045} fill="#14b8b3" />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: '#0e1013', padding: '0 80px', gap: 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, color: '#eef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <KMark size={72} dark="#eef2f2" />
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 2 }}>IKIDO</div>
            <div style={{ fontSize: 40, color: '#14b8b3', marginTop: 14 }}>wheel</div>
          </div>
          <div style={{ fontSize: 50, fontWeight: 800, marginTop: 40, lineHeight: 1.15 }}>Free random name picker wheel</div>
          <div style={{ fontSize: 28, color: '#8c979a', marginTop: 20 }}>Add names, spin, get a fair winner.</div>
          <div style={{ width: 120, height: 8, background: '#14b8b3', borderRadius: 4, marginTop: 36 }} />
        </div>
        <Wheel r={220} />
      </div>
    ),
    size,
  );
}
