import { useEffect, useState } from 'react';
import { pingLiveVisitors } from '../services/api';

const PING_MS = 60 * 1000;

const sessionId = () => {
  try {
    let id = sessionStorage.getItem('fn_live_sid');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^a-zA-Z0-9-]/g, '');
      sessionStorage.setItem('fn_live_sid', id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

/**
 * Number of people on the site right now ({ enabled, count }). Pings once a minute while the tab is
 * visible; `enabled` stays false (and nothing is shown) when the server has no store for it.
 */
export function useLiveVisitors(active = true) {
  const [state, setState] = useState({ enabled: false, count: 0 });

  useEffect(() => {
    if (!active) return undefined;
    const sid = sessionId();
    let stopped = false;
    let timer;

    const ping = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      const r = await pingLiveVisitors(sid);
      if (stopped) return;
      if (!r.enabled) { stopped = true; clearInterval(timer); setState({ enabled: false, count: 0 }); return; }
      setState({ enabled: true, count: Math.max(1, r.count) });
    };

    const onVisible = () => { if (document.visibilityState === 'visible') ping(); };
    ping();
    timer = setInterval(ping, PING_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [active]);

  return state;
}
