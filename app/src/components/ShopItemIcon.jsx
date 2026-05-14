import { useMemo, useState } from 'react';

const buildProxyUrl = (uniqueName) => `/api/shop-icon?item=${encodeURIComponent(uniqueName)}`;
const buildDirectUrl = (uniqueName, size = 64) =>
  `https://render.albiononline.com/v1/item/${encodeURIComponent(uniqueName)}.png?quality=0&size=${size}&locale=en`;

export function ShopItemIcon({
  uniqueName,
  label,
  size = 64,
  className = '',
  loading = 'lazy',
}) {
  const proxyUrl = useMemo(() => buildProxyUrl(uniqueName), [uniqueName]);
  const directUrl = useMemo(() => buildDirectUrl(uniqueName, size), [size, uniqueName]);
  const [src, setSrc] = useState(directUrl);
  const [failedAll, setFailedAll] = useState(false);

  if (!uniqueName || failedAll) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-stone-900/70 text-[10px] font-black uppercase text-stone-600 ${className}`}>
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== proxyUrl) {
          setSrc(proxyUrl);
          return;
        }

        setFailedAll(true);
      }}
    />
  );
}
