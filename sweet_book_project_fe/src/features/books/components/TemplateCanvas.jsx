export function TemplateCanvas({ template, params, photos, onParamChange, isEditable, templateKind }) {
  if (!template) return null;

  const kind = templateKind ?? template.templateKind ?? 'content';

  // Fallback layout generation if `elements` is missing
  let allElements = template.elements;
  if (!allElements || allElements.length === 0) {
    const keys = Object.keys(template.parameters ?? {});
    if (keys.length === 0) {
      return (
        <div className="w-full aspect-[3/4] bg-white rounded-lg border border-warm-border flex items-center justify-center text-ink-muted text-sm shadow-sm">
          편집 가능한 영역이 없습니다.
        </div>
      );
    }
    // For content: portrait layout, for cover: landscape layout
    const isPortrait = kind === 'content';
    const canvasW = isPortrait ? 100 : 200;
    const canvasH = isPortrait ? 133 : 100;
    const slotH = Math.floor(canvasH / (keys.length + 1));
    allElements = keys.map((key, idx) => ({
      id: `fallback-${key}`,
      variable: key,
      x: 5,
      y: 5 + (idx * (slotH + 2)),
      width: canvasW - 10,
      height: slotH,
      type: template.parameters[key].binding === 'file' ? 'photo' : 'text'
    }));
  }

  const maxX = Math.max(...allElements.map((e) => e.x + e.width), 100);
  const maxY = Math.max(...allElements.map((e) => e.y + e.height), 100);

  // Determine aspect ratio based on template kind
  let canvasRatio = maxY / maxX;
  if (kind === 'content' && canvasRatio < 1) {
    canvasRatio = maxX / maxY;
  }

  const variableElements = allElements.filter((el) => el.variable);
  const paramDefs = template.parameters ?? {};

  return (
    <div className="w-full">
      {/* Canvas with numbered badges */}
      <div
        className="relative bg-white rounded-lg overflow-hidden border border-warm-border shadow-sm mx-auto"
        style={{ paddingBottom: `${canvasRatio * 100}%`, width: '100%' }}
      >
        <div className="absolute inset-0 w-full h-full">
          {variableElements.map((el, idx) => {
            const left = (el.x / maxX) * 100;
            const top = (el.y / maxY) * 100;
            const width = (el.width / maxX) * 100;
            const height = (el.height / maxY) * 100;
            const def = paramDefs[el.variable];
            const bindingRaw = (def?.binding ?? '').toLowerCase();
            const isPhoto = el.type === 'photo' || el.type === 'image'
              || bindingRaw.includes('file') || bindingRaw.includes('photo')
              || bindingRaw.includes('image') || bindingRaw.includes('collage')
              || bindingRaw.includes('gallery');
            const value = params?.[el.variable] ?? '';
            const badgeNum = idx + 1;

            if (isPhoto) {
              const assignedPhoto = photos.find((p) => String(p.id) === value);
              return (
                <div
                  key={el.id}
                  className="absolute"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                >
                  {/* Number badge */}
                  {isEditable && (
                    <span className="absolute -top-1 -left-1 z-20 w-5 h-5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                      {badgeNum}
                    </span>
                  )}
                  {assignedPhoto ? (
                    <div className="w-full h-full relative group bg-warm-bg rounded flex justify-center items-center overflow-hidden border-2 border-transparent">
                      <img
                        src={assignedPhoto.mediumUrl || assignedPhoto.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => onParamChange(el.variable, '')}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md z-10"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                          if (isEditable) onParamChange(el.variable, 'PICK');
                      }}
                      className={`w-full h-full flex flex-col items-center justify-center rounded transition-colors ${
                        isEditable 
                          ? 'bg-blue-50/60 border-2 border-dashed border-blue-300 cursor-pointer hover:bg-blue-100'
                          : 'bg-warm-bg'
                      }`}
                    >
                       <svg className={`w-6 h-6 sm:w-8 sm:h-8 mb-1 ${isEditable ? 'text-blue-400' : 'text-ink-muted/10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                      </svg>
                      {isEditable && (
                        <span className="text-[9px] sm:text-[11px] font-semibold px-2 text-center line-clamp-2 text-blue-500">
                           {def?.label ?? def?.description ?? el.variable}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Text slot
            return (
              <div
                key={el.id}
                className="absolute"
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              >
                {/* Number badge */}
                {isEditable && (
                  <span className="absolute -top-1 -left-1 z-20 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                    {badgeNum}
                  </span>
                )}
                {isEditable ? (
                  <textarea
                    value={value}
                    onChange={(e) => onParamChange(el.variable, e.target.value)}
                    placeholder={def?.label ?? def?.description ?? el.variable}
                    className="w-full h-full bg-amber-50/40 border border-dashed border-amber-300 rounded p-2 text-xs sm:text-sm text-ink resize-none focus:outline-none focus:border-amber-500 focus:bg-amber-50 placeholder:text-amber-400/80 transition-colors break-keep"
                  />
                ) : (
                  <div className={`w-full h-full flex items-start p-2 text-xs sm:text-sm text-ink overflow-hidden break-keep leading-relaxed ${value ? 'bg-transparent' : 'bg-white/50 backdrop-blur-sm rounded'}`}>
                    {value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Field editor panel below canvas */}
      {isEditable && variableElements.length > 0 && (
        <div className="mt-4 bg-white rounded-lg border border-warm-border shadow-sm p-4">
          <p className="text-[11px] font-semibold text-ink-muted mb-3 uppercase tracking-wider">필드 편집</p>
          <div className="space-y-3">
            {variableElements.map((el, idx) => {
              const def = paramDefs[el.variable];
              const bindingRaw = (def?.binding ?? '').toLowerCase();
            const isPhoto = el.type === 'photo' || el.type === 'image'
              || bindingRaw.includes('file') || bindingRaw.includes('photo')
              || bindingRaw.includes('image') || bindingRaw.includes('collage')
              || bindingRaw.includes('gallery');
              const value = params?.[el.variable] ?? '';
              const badgeNum = idx + 1;
              const label = def?.label ?? def?.description ?? el.variable;
              const assignedPhoto = isPhoto ? photos.find((p) => String(p.id) === value) : null;

              return (
                <div key={el.id} className="flex items-start gap-3">
                  {/* Badge */}
                  <span className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm ${isPhoto ? 'bg-blue-500' : 'bg-amber-500'}`}>
                    {badgeNum}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-ink-sub mb-1">
                      {label}
                      <span className="ml-1.5 text-[9px] text-ink-muted/60 font-normal">
                        ({isPhoto ? '사진' : '텍스트'})
                      </span>
                    </p>
                    {isPhoto ? (
                      <div className="flex items-center gap-2">
                        {assignedPhoto ? (
                          <>
                            <img
                              src={assignedPhoto.thumbnailUrl}
                              alt=""
                              className="w-10 h-10 rounded object-cover border border-warm-border"
                            />
                            <span className="text-xs text-ink-sub truncate flex-1">{assignedPhoto.originalName ?? '사진 선택됨'}</span>
                            <button type="button" onClick={() => onParamChange(el.variable, '')}
                              className="text-[10px] text-red-500 hover:text-red-700 font-medium flex-shrink-0">제거</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => onParamChange(el.variable, 'PICK')}
                            className="h-8 px-4 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                            📷 사진 선택
                          </button>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={value}
                        onChange={(e) => onParamChange(el.variable, e.target.value)}
                        placeholder={`${label} 입력...`}
                        rows={2}
                        className="w-full bg-warm-bg border border-warm-border rounded-lg p-2.5 text-sm text-ink resize-none focus:outline-none focus:border-brand focus:bg-white placeholder:text-ink-muted/50 transition-colors break-keep"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
