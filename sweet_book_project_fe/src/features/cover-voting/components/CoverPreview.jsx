export function CoverPreview({ photoUrl, title, subtitle, templateKind, className = '' }) {
  const isClassic = templateKind === 'CLASSIC';

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      style={{ aspectRatio: '3/4' }}
    >
      {photoUrl && (
        <img
          src={photoUrl}
          alt="표지 사진"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {isClassic ? (
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center px-4 text-center">
          <h2
            className="font-display text-white text-xl lg:text-2xl font-bold leading-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
          >
            {title || '제목 없음'}
          </h2>
          {subtitle && (
            <p
              className="font-display text-white/80 text-sm mt-2 leading-snug"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-4">
          <h2 className="font-display text-white text-base lg:text-lg font-semibold leading-tight">
            {title || '제목 없음'}
          </h2>
          {subtitle && (
            <p className="font-display text-white/70 text-xs mt-1 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
