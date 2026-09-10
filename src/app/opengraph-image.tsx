import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Image de partage générée au build — mêmes tokens neutres que `icon.tsx`,
 * à remplacer quand l'identité de marque sera définie (ARCHITECTURE.md §13 Q8).
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background: '#18181b',
          color: '#fafaf9',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 16,
            background: '#fafaf9',
            color: '#18181b',
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          K
        </div>
        <div style={{ fontSize: 56, fontWeight: 600 }}>Claviers Custom</div>
        <div style={{ fontSize: 28, color: '#a1a1aa' }}>
          Claviers mécaniques sur mesure, assemblés à la demande.
        </div>
      </div>
    ),
    size,
  );
}
