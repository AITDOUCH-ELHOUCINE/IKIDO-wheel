// IKIDO "K" mark for generated images (next/og). Same paths as the header logo.
export function KMark({ size, dark = '#16191d', teal = '#14b8b3' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M0 0h30L0 30zM0 44 30 14v52L4 100H0z" fill={dark} />
      <path d="M30 66 96 0H66L30 36zM48 58l42 42H60L33 73z" fill={teal} />
    </svg>
  );
}
