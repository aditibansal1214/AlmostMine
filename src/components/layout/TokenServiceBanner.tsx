import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, UserX } from 'lucide-react';
import { useAuth } from '../../lib/authContext';

export const TokenServiceBanner: React.FC = () => {
  const { tokenServiceDisabled, continueAsGuest, verifyTokenHealth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  if (!tokenServiceDisabled) return null;

  const handleRetry = async () => {
    setIsVerifying(true);
    setRetryMessage(null);
    const success = await verifyTokenHealth();
    setIsVerifying(false);
    if (!success) {
      setRetryMessage('API is still activating. If you just clicked Enable, please wait 1-2 minutes for Google Cloud propagation.');
    }
  };

  return (
    <aside
      aria-label="Google Cloud API configuration alert"
      className="bg-red-500/10 border-b border-red-500/30 text-red-950 dark:text-red-200 px-4 py-3 text-sm transition-all"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100">
              Action Required: Google Cloud Token Service API Disabled (Project 412108184439)
            </p>
            <p className="text-xs text-red-800/90 dark:text-red-300 mt-0.5">
              Firebase Authentication cannot mint or refresh tokens until the <code>securetoken.googleapis.com</code> API is enabled for this project.
            </p>
            {retryMessage && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mt-1">
                {retryMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <a
            href="https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=412108184439"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-am-input bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <span>Enable in Google Cloud</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleRetry}
            disabled={isVerifying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-am-input bg-white dark:bg-am-surface-2 hover:bg-am-surface-3 text-am-ink border border-am-border font-medium text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Retry'}</span>
          </button>

          <button
            type="button"
            onClick={continueAsGuest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-am-input bg-white dark:bg-am-surface-2 hover:bg-am-surface-3 text-am-ink border border-am-border font-medium text-xs transition-colors"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Browse as Guest</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
