import { getModule } from '@/modules';
import { useAppStore, type Route, type ViewName } from './useAppStore';

const VIEWS: ViewName[] = ['dashboard', 'table', 'card', 'kanban'];

function parseHash(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === 'settings') return { kind: 'settings' };
  if (parts[0] === 'tools') return { kind: 'tools' };
  const module = getModule(parts[0]);
  if (!module) return null;
  const view = VIEWS.includes(parts[1] as ViewName) ? (parts[1] as ViewName) : 'dashboard';
  return { kind: 'module', moduleId: module.id, view };
}

function routeToHash(route: Route): string {
  if (route.kind === 'settings') return '#/settings';
  if (route.kind === 'tools') return '#/tools';
  return `#/${route.moduleId}/${route.view}`;
}

/**
 * location.hash と zustand の route を双方向同期する。
 * react-router を使わないため GitHub Pages でも 404 対策が不要。
 */
export function initNavSync(): void {
  const initial = parseHash(location.hash);
  if (initial) useAppStore.getState().navigate(initial);
  else history.replaceState(null, '', routeToHash(useAppStore.getState().route));

  window.addEventListener('hashchange', () => {
    const route = parseHash(location.hash);
    if (route && routeToHash(route) !== routeToHash(useAppStore.getState().route)) {
      useAppStore.getState().navigate(route);
    }
  });

  useAppStore.subscribe((state, prev) => {
    if (state.route !== prev.route) {
      const hash = routeToHash(state.route);
      if (location.hash !== hash) {
        history.pushState(null, '', hash);
      }
    }
  });
}
