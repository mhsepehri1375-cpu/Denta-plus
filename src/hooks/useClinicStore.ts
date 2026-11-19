import { useCallback, useEffect, useState } from 'react';
import { createSeedClinicState } from '../data/seedData';
import type { ClinicState } from '../types/clinic';

const STORAGE_KEY = 'dentaplus_clinic_state_v2';

function hydrateClinicState(raw: Partial<ClinicState>): ClinicState {
  const seed = createSeedClinicState();
  return {
    ...seed,
    ...raw,
    expenses: Array.isArray(raw.expenses) ? raw.expenses : seed.expenses,
    pettyCashTopUps: Array.isArray(raw.pettyCashTopUps)
      ? raw.pettyCashTopUps
      : seed.pettyCashTopUps,
    bookingConfigs:
      raw.bookingConfigs && Object.keys(raw.bookingConfigs).length > 0
        ? raw.bookingConfigs
        : seed.bookingConfigs,
  };
}

export function useClinicStore() {
  const [state, setState] = useState<ClinicState>(() => createSeedClinicState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/clinic')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch clinic state');
        return res.json() as Promise<Partial<ClinicState>>;
      })
      .then((data) => {
        if (active && data && Array.isArray(data.patients)) {
          const hydrated = hydrateClinicState(data);
          setState(hydrated);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
          } catch {
            // ignore storage quota errors
          }
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached && active) {
            setState(hydrateClinicState(JSON.parse(cached) as Partial<ClinicState>));
          }
        } catch {
          // keep seed state
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateState = useCallback((updater: (prev: ClinicState) => ClinicState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      fetch('/api/clinic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {
        // silent fallback to localStorage when offline
      });
      return next;
    });
  }, []);

  return { state, loaded, updateState };
}
