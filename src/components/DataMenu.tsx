import { useEffect, useRef, useState } from 'react';
import { download, parseImport, toCSV, toJSON } from '../model/io';
import { todayISO } from '../model/logic';
import { usePipeline, useUi } from '../model/store';

interface InstallEvent extends Event { prompt: () => Promise<void> }

export default function DataMenu() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const mode = useRef<'replace' | 'merge'>('replace');
  const file = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const store = usePipeline();
  const say = useUi((s) => s.say);

  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  const pick = (m: 'replace' | 'merge') => { mode.current = m; setError(''); file.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { items, skipped } = parseImport(await f.text());
      if (mode.current === 'replace') store.replaceAll(items); else store.merge(items);
      setOpen(false);
      say(`Imported ${items.length} ${items.length === 1 ? 'item' : 'items'}${skipped ? `, skipped ${skipped}` : ''}.`, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
    }
  };

  const stamp = todayISO();
  const act = (fn: () => void, msg: string, undo = false) => () => { fn(); setOpen(false); say(msg, undo); };

  return (
    <div className="menu" ref={wrap}>
      <button type="button" className="chip" aria-haspopup="true" aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}>Data</button>
      <input ref={file} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={onFile} aria-label="Import file" />
      {open && (
        <div className="menu__panel">
          <p className="menu__lead">Saved in this browser on this device. Export to back up or move to another device.</p>
          {error && <p className="menu__error" role="alert">{error}</p>}
          <h3>Import JSON or CSV</h3>
          <button type="button" onClick={() => pick('replace')}>Import and replace everything</button>
          <button type="button" onClick={() => pick('merge')}>Import and merge by id</button>
          <h3>Export {store.items.length} items</h3>
          <button type="button" onClick={act(() => download(`linkedin-pipeline-${stamp}.json`, toJSON(store.items), 'application/json'), 'Exported JSON.')}>Export JSON (full backup)</button>
          <button type="button" onClick={act(() => download(`linkedin-pipeline-${stamp}.csv`, toCSV(store.items), 'text/csv'), 'Exported CSV.')}>Export CSV (for a spreadsheet)</button>
          <h3>Reset</h3>
          <button type="button" onClick={act(store.clear, 'Board cleared.', true)}>Start empty</button>
          <button type="button" onClick={act(store.loadDemo, 'Example data loaded.', true)}>Load example data</button>
          {install && (
            <>
              <h3>App</h3>
              <button type="button" onClick={() => { void install.prompt(); setInstall(null); setOpen(false); }}>Install on this device</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
