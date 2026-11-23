import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface StudioNotification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationBannerProps {
  notification: StudioNotification | null;
  onDismiss: () => void;
}

export function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  if (!notification) return null;

  const icon =
    notification.type === 'success' ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
    ) : notification.type === 'error' ? (
      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
    ) : (
      <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
    );

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="studio-notification"
      className="fixed bottom-4 right-4 z-50 max-w-sm flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg text-xs text-zinc-800 dark:text-zinc-200"
    >
      {icon}
      <span className="font-medium leading-snug">{notification.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
