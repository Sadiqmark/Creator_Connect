import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { notificationsApi, notificationKeys } from '../../services/api/notifications';
import {
  NotificationDTO,
  NotificationsListDTO,
  NotificationType,
  UserRole,
} from '@creator-connect/shared';
import { useAuth } from '../../context/AuthContext';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

function getNotificationContent(type: NotificationType) {
  switch (type) {
    case NotificationType.INQUIRY_RECEIVED:
      return {
        title: 'New inquiry received',
        description: 'Review the collaboration details',
        icon: Mail,
        iconColor: 'text-accent',
        bgColor: 'bg-accent/10',
      };
    case NotificationType.INQUIRY_ACCEPTED:
      return {
        title: 'Inquiry accepted',
        description: 'Contact details are now available',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
      };
    case NotificationType.INQUIRY_REJECTED:
      return {
        title: 'Inquiry declined',
        description: 'Collaboration could not proceed',
        icon: XCircle,
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
      };
    case NotificationType.INQUIRY_EXPIRED:
      return {
        title: 'Inquiry expired',
        description: 'No response received within 60 days',
        icon: Clock,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      };
    case NotificationType.COLLABORATION_EMAIL_UPDATED:
      return {
        title: 'Contact email updated',
        description: 'Collaboration details modified',
        icon: UserCheck,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      };
    default:
      return {
        title: 'Inquiry update',
        description: 'Collaboration status updated',
        icon: Bell,
        iconColor: 'text-foreground-muted',
        bgColor: 'bg-surface-muted',
      };
  }
}

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

export const HeaderNotificationDropdown: React.FC = () => {
  const auth = useOptionalAuth();
  const appUser = auth?.appUser ?? null;
  const status = auth?.status ?? 'UNAUTHENTICATED';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = status === 'AUTHENTICATED' && !!appUser;

  // Poll notifications every 45 seconds while authenticated
  const { data, isLoading, isError } = useQuery<NotificationsListDTO>({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsApi.getNotifications(20),
    enabled: isAuthenticated,
    refetchInterval: 45000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  // Optimistic Mark-as-Read Mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationAsRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousData = queryClient.getQueryData<NotificationsListDTO>(notificationKeys.all);

      if (previousData) {
        const wasUnread = previousData.notifications.some((n) => n.id === id && !n.readAt);
        queryClient.setQueryData<NotificationsListDTO>(notificationKeys.all, {
          ...previousData,
          unreadCount: wasUnread
            ? Math.max(0, previousData.unreadCount - 1)
            : previousData.unreadCount,
          notifications: previousData.notifications.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(notificationKeys.all, context.previousData);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<NotificationsListDTO>(notificationKeys.all, (prev) => {
        if (!prev) return prev;
        const updated = prev.notifications.map((n) =>
          n.id === data.notification.id ? data.notification : n
        );
        return {
          ...prev,
          notifications: updated,
          unreadCount: updated.filter((n) => !n.readAt).length,
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Optimistic Mark-All-Read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousData = queryClient.getQueryData<NotificationsListDTO>(notificationKeys.all);

      if (previousData) {
        queryClient.setQueryData<NotificationsListDTO>(notificationKeys.all, {
          ...previousData,
          unreadCount: 0,
          notifications: previousData.notifications.map((n) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          })),
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(notificationKeys.all, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Dismiss on outside click and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const handleNotificationClick = async (notification: NotificationDTO) => {
    const isUnread = !notification.readAt;

    if (isUnread) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        // Rollback is handled by mutation onError
      }
    }

    setIsOpen(false);

    if (notification.referenceId) {
      const destination =
        appUser.role === UserRole.CREATOR
          ? `/creator/inquiries/${notification.referenceId}`
          : `/business/inquiries/${notification.referenceId}`;
      navigate(destination);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0 && !markAllReadMutation.isPending) {
      markAllReadMutation.mutate();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-accent rounded-full border-2 border-surface animate-in zoom-in-50"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-border shadow-dropdown z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-muted/50">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Mark all read</span>
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-surface-muted" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="h-3.5 bg-surface-muted rounded w-3/4" />
                      <div className="h-3 bg-surface-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-rose-500">Failed to load notifications.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-surface-muted flex items-center justify-center text-foreground-muted mb-2.5">
                  <Bell className="w-5 h-5 stroke-[1.5]" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications yet</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Inquiry and collaboration updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isUnread = !notification.readAt;
                const { title, description, icon: Icon, iconColor, bgColor } = getNotificationContent(
                  notification.type
                );

                return (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-surface-muted/60 transition-colors cursor-pointer group ${
                      isUnread ? 'bg-accent/[0.03]' : ''
                    }`}
                  >
                    {/* Event Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgColor} ${iconColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isUnread ? 'text-foreground font-bold' : 'text-foreground'
                          }`}
                        >
                          {title}
                        </p>
                        <span className="text-[10px] text-foreground-muted shrink-0">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted truncate mt-0.5">
                        {description}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
