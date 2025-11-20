import { debounce } from './debounce';

export type FilterState = {
  dataset?: string;
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  direction?: string;
  minPnl?: string;
  maxPnl?: string;
};

let currentAbortController: AbortController | null = null;

export function parseFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  const filters: FilterState = {};

  const dataset = params.get('dataset');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const symbol = params.get('symbol');
  const direction = params.get('direction');
  const minPnl = params.get('minPnl');
  const maxPnl = params.get('maxPnl');

  if (dataset) filters.dataset = dataset;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (symbol) filters.symbol = symbol;
  if (direction) filters.direction = direction;
  if (minPnl) filters.minPnl = minPnl;
  if (maxPnl) filters.maxPnl = maxPnl;

  return filters;
}

export function buildUrlFromFilters(filters: FilterState): string {
  const params = new URLSearchParams();

  if (filters.dataset) params.set('dataset', filters.dataset);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.symbol) params.set('symbol', filters.symbol);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.minPnl) params.set('minPnl', filters.minPnl);
  if (filters.maxPnl) params.set('maxPnl', filters.maxPnl);

  const query = params.toString();
  return query ? `?${query}` : '';
}

const debouncedPushState = debounce((url: string) => {
  window.history.pushState({}, '', url);
}, 300);

export function syncFiltersToUrl(filters: FilterState) {
  const newUrl = `${window.location.pathname}${window.location.hash}${buildUrlFromFilters(filters)}`;
  debouncedPushState(newUrl);
}

export function abortPreviousRequest() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  return currentAbortController;
}

export function getCurrentAbortSignal(): AbortSignal | undefined {
  return currentAbortController?.signal;
}
