type Props = {
  sprite: string;       // public image path, e.g. '/images/potion_red_plus.svg'
  width?: number;       // desired display width in px; height scales proportionally
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

// Resolve path relative to Vite's base (e.g. '/alchemydoku/' on GitHub Pages).
// Strips the leading slash from the sprite path so we get base + 'images/foo.svg'.
function resolveSpriteSrc(sprite: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const trimmedBase = base.endsWith('/') ? base : base + '/';
  const trimmedSprite = sprite.startsWith('/') ? sprite.slice(1) : sprite;
  return trimmedBase + trimmedSprite;
}

/**
 * Renders a standalone game image.
 * Prepends BASE_URL so paths work both in dev (/) and on GitHub Pages (/alchemydoku/).
 */
export function AtlasSprite({ sprite, width, className = '', style = {}, title }: Props) {
  return (
    <img
      src={resolveSpriteSrc(sprite)}
      alt={title ?? ''}
      title={title}
      className={className}
      style={{
        width: width !== undefined ? width : undefined,
        height: 'auto',
        display: 'inline-block',
        flexShrink: 0,
        ...style,
      }}
      draggable={false}
    />
  );
}
