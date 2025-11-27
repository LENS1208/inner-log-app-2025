import React from "react";
import { debounce } from './debounce';
import { parseFiltersFromUrl, syncFiltersToUrl, abortPreviousRequest } from './urlSync';
import { showToast } from './toast';
import { getTradesCount } from './db.service';
import { supabase } from './supabase';

type DS = "A"|"B"|"C"|null;
export type Filters = {
  symbol?:string; session?:string; weekday?:string;
  side?:string; pnl?:string; from?:string; to?:string;
};

type Ctx = {
  dataset: DS;
  filters: Filters;
  uiFilters: Filters;
  useDatabase: boolean;
  loading: boolean;
  isInitialized: boolean;
  dataCount: number;
  setDataset: (d:DS)=>void;
  setUiFilters: (p:Partial<Filters>)=>void;
  resetFilters: ()=>void;
  setUseDatabase: (value: boolean)=>void;
};

const C = React.createContext<Ctx | null>(null);
export const useDataset = () => {
  const v = React.useContext(C);
  if(!v) throw new Error("DatasetProvider missing");
  return v;
};

export function DatasetProvider({children}:{children:React.ReactNode}) {
  const [dataset, setDataset] = React.useState<DS>(null);
  const [filters, setFilters] = React.useState<Filters>({});
  const [uiFilters, setUiFiltersState] = React.useState<Filters>(() => parseFiltersFromUrl());
  const [useDatabase, setUseDatabaseState] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
  const [dataCount, setDataCount] = React.useState<number>(0);
  const previousFiltersRef = React.useRef<Filters>({});

  const setUseDatabase = React.useCallback((value: boolean) => {
    setUseDatabaseState(value);
    localStorage.setItem('useDatabase', value.toString());
  }, []);

  React.useEffect(() => {
    const checkDatabase = async () => {
      try {
        console.log('🔍 Checking database for user-uploaded trades...');
        const count = await getTradesCount();
        setDataCount(count);

        if (count > 0) {
          console.log(`📊 Database has ${count} user-uploaded trades, switching to database mode`);
          setUseDatabaseState(true);
          setDataset(null); // Use uploaded data (dataset=null)
          localStorage.setItem('useDatabase', 'true');
        } else {
          console.log('📭 No user-uploaded trades, using demo data');
          setUseDatabaseState(false);
          setDataset('A'); // Default to demo dataset A
          localStorage.setItem('useDatabase', 'false');
        }
      } catch (error) {
        console.error('Error checking database:', error);
        const stored = localStorage.getItem('useDatabase');
        setUseDatabaseState(stored === 'true');
        if (stored !== 'true') {
          setDataset('A'); // Default to demo dataset A on error
        }
      } finally {
        setIsInitialized(true);
      }
    };

    checkDatabase();

    const handleTradesUpdated = () => {
      console.log('🔄 Trades updated, rechecking database...');
      setIsInitialized(false);
      checkDatabase();
    };

    window.addEventListener('fx:tradesUpdated', handleTradesUpdated);

    return () => {
      window.removeEventListener('fx:tradesUpdated', handleTradesUpdated);
    };
  }, []);

  const debouncedApplyFilters = React.useMemo(
    () => debounce(async (newFilters: Filters) => {
      const controller = abortPreviousRequest();

      setLoading(true);

      try {
        if (controller.signal.aborted) return;

        setFilters(newFilters);
        syncFiltersToUrl(newFilters);
      } catch (error) {
        console.error('Filter application failed:', error);
        showToast('フィルター適用に失敗しました', 'error');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200),
    []
  );

  const setUiFilters = React.useCallback((p: Partial<Filters>) => {
    setUiFiltersState(prev => {
      const newFilters = { ...prev };

      Object.keys(p).forEach(key => {
        const filterKey = key as keyof Filters;
        if (p[filterKey] === undefined) {
          delete newFilters[filterKey];
        } else {
          newFilters[filterKey] = p[filterKey];
        }
      });

      console.log('🔍 Filter update:', { input: p, prev, newFilters });
      debouncedApplyFilters(newFilters);
      return newFilters;
    });
  }, [debouncedApplyFilters]);

  const resetFilters = React.useCallback(() => {
    setUiFiltersState({});
    setFilters({});
    syncFiltersToUrl({});
  }, []);

  React.useEffect(() => {
    const handlePopState = () => {
      const urlFilters = parseFiltersFromUrl();
      setUiFiltersState(urlFilters);
      setFilters(urlFilters);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const v: Ctx = {
    dataset,
    filters,
    uiFilters,
    useDatabase,
    loading,
    isInitialized,
    dataCount,
    setDataset,
    setUiFilters,
    resetFilters,
    setUseDatabase
  };

  return <C.Provider value={v}>{children}</C.Provider>;
}
