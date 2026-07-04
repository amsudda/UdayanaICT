/**
 * Alignment + gradient classes for a promo-banner text overlay position
 * ('left top', 'center', 'right bottom', ...). Used by both the landing
 * carousel and the admin preview so they always match.
 */
export function overlayClasses(pos: string) {
  const h = pos.includes('left') ? 'left' : pos.includes('right') ? 'right' : 'center';
  const v = pos.includes('top') ? 'top' : pos.includes('bottom') ? 'bottom' : 'middle';
  const items = h === 'left' ? 'items-start text-left' : h === 'right' ? 'items-end text-right' : 'items-center text-center';
  const justify = v === 'top' ? 'justify-start' : v === 'bottom' ? 'justify-end' : 'justify-center';
  const gradient =
    h === 'left' ? 'bg-gradient-to-r from-black/85 via-black/50 to-black/15'
    : h === 'right' ? 'bg-gradient-to-l from-black/85 via-black/50 to-black/15'
    : v === 'top' ? 'bg-gradient-to-b from-black/80 via-black/45 to-black/15'
    : v === 'bottom' ? 'bg-gradient-to-t from-black/80 via-black/45 to-black/15'
    : 'bg-black/50';
  const blockAlign = h === 'center' ? 'mx-auto' : h === 'right' ? 'ml-auto' : '';
  return { items, justify, gradient, blockAlign };
}
