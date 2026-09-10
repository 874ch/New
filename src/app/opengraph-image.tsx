import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Image de partage générée au build — mêmes tokens que `icon.tsx` et
 * `globals.css` (identité « atelier tech chaleureux »), à remplacer quand la
 * marque définitive sera choisie (ARCHITECTURE.md §13 Q8).
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
          background: '#2b2115',
          color: '#faf5ee',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 20,
            background: '#e35d24',
            color: '#fff6ed',
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          K
        </div>
        <div style={{ fontSize: 56, fontWeight: 600 }}>Claviers Custom</div>
        <div style={{ fontSize: 28, color: '#c9b8a0' }}>
          Claviers mécaniques sur mesure, assemblés à la demande.
        </div>
      </div>
    ),
    size,
  );
}
