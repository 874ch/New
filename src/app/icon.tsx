import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Favicon générée au build — placeholder tant que l'identité de marque
 * n'est pas définie (ARCHITECTURE.md §13 Q8).
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#18181b',
        color: '#fafaf9',
        fontSize: 20,
        fontWeight: 600,
        borderRadius: 6,
      }}
    >
      K
    </div>,
    size,
  );
}
