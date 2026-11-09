import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildSeed, SEED_VERSION } from '../data/seed';
import * as actions from '../data/actions';

const DB_KEY = `agrilogix_db_v${SEED_VERSION}`;
const DataContext = createContext(null);

const loadDb = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable: fall back to seed data */ }
  return buildSeed();
};

const saveDb = (db) => {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
};

export function DataProvider({ children }) {
  const [db, setDb] = useState(loadDb);
  const ref = useRef(db);

  // Runs one mock-API action synchronously, persists the new db and returns { ok, error?, id? }.
  const run = useCallback((name, args) => {
    const { db: next, result } = actions[name](ref.current, args);
    if (next !== ref.current) {
      ref.current = next;
      setDb(next);
      saveDb(next);
    }
    return result;
  }, []);

  // Order payments are released automatically a few days after delivery if the buyer never confirmed.
  useEffect(() => { run('autoRelease', {}); }, [run]);

  const resetData = useCallback(() => {
    const fresh = buildSeed();
    ref.current = fresh;
    setDb(fresh);
    saveDb(fresh);
  }, []);

  const value = useMemo(() => ({ db, run, resetData }), [db, run, resetData]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
