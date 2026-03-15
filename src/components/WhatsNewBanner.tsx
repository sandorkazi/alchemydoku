import type { ReleaseEntry } from '../data/releaseNotes';

interface WhatsNewBannerProps {
  entry: ReleaseEntry;
  onDismiss: () => void;
  variant: 'base' | 'expanded';
}

export function WhatsNewBanner({ entry, onDismiss, variant }: WhatsNewBannerProps) {
  const isExpanded = variant === 'expanded';

  const wrapperClass = isExpanded
    ? 'bg-white border border-amber-300'
    : 'bg-indigo-50 border border-indigo-200';

  const dismissClass = isExpanded
    ? 'text-amber-700 hover:text-amber-900 focus-visible:ring-amber-400'
    : 'text-indigo-600 hover:text-indigo-800 focus-visible:ring-indigo-400';

  return (
    <div
      role="region"
      aria-label="What's New"
      className={`rounded-2xl px-4 py-3 animate-fadein ${wrapperClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800">
          ✨ {entry.title}
        </span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss release notes"
          className={`text-xs font-semibold shrink-0 focus-visible:outline-none focus-visible:ring-2 rounded ${dismissClass}`}
        >
          Got it
        </button>
      </div>

      {entry.sections.map(section => (
        <div key={section.heading}>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-2 mb-0.5">
            {section.heading}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item, i) => (
              <li key={i} className="text-sm text-gray-700">• {item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
