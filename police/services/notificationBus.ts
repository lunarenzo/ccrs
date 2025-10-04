export interface NotificationRoute {
  type: 'assignment';
  reportId: string;
}

type Listener = (route: NotificationRoute) => void;

const listeners: Listener[] = [];

export function addNotificationRouteListener(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function emitNotificationRoute(route: NotificationRoute): void {
  // Fire-and-forget dispatch to all listeners
  listeners.forEach((l) => {
    try { l(route); } catch (e) { console.warn('Notification route listener error:', e); }
  });
}
