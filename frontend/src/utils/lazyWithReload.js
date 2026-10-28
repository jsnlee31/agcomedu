import { lazy } from 'react';

// After a new deploy, an already-open tab may ask for page chunks that no
// longer exist. Reload once to pick up the new build instead of crashing.
const lazyWithReload = (factory) => lazy(() => factory().then((module) => {
  try { sessionStorage.removeItem('chunk_reload_at'); } catch {}
  return module;
}).catch((error) => {
  const isChunkError = /Loading (CSS )?chunk|ChunkLoadError|dynamically imported module/i.test(`${error?.name} ${error?.message}`);
  let lastReload = 0;
  try { lastReload = Number(sessionStorage.getItem('chunk_reload_at')) || 0; } catch {}
  if (isChunkError && Date.now() - lastReload > 30000) {
    try { sessionStorage.setItem('chunk_reload_at', String(Date.now())); } catch {}
    window.location.reload();
    return new Promise(() => {});
  }
  throw error;
}));

export default lazyWithReload;
