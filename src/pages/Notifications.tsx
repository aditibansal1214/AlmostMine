import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { InAppNotification } from '../domain/types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { EmptyState } from '../components/ui/EmptyState';
import { Bell, Check, Inbox } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    async function loadNotifications() {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'notifications'),
          where('recipientId', '==', currentUser!.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InAppNotification));
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setNotifications(list);
      } catch (err) {
        console.warn('Notifications fetch notice:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [currentUser]);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-6 text-left">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink">
          Notifications
        </h1>
        <p className="text-sm text-am-ink-muted">In-app exchange and request updates</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-am-card bg-am-surface-2 animate-pulse" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="flex flex-col gap-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-am-card border transition flex items-start justify-between gap-3 ${
                notif.read
                  ? 'bg-am-surface border-am-border text-am-ink-muted'
                  : 'bg-am-surface border-am-primary/40 text-am-ink shadow-am-soft'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-am-ink">{notif.title}</h4>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-am-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-am-ink leading-relaxed">{notif.message}</p>
                {notif.link && (
                  <Link
                    to={notif.link}
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs font-semibold text-am-primary hover:underline mt-2 inline-block"
                  >
                    View details →
                  </Link>
                )}
              </div>

              {!notif.read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  title="Mark as read"
                  className="p-1.5 text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2 rounded-full"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="All caught up"
          description="You will receive alerts here when neighbors send requests, respond to wishes, or complete returns."
          actionLabel="Browse items"
          onAction={() => (window.location.href = '/browse')}
        />
      )}
    </div>
  );
};
