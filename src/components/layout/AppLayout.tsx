import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { DemoBanner } from './DemoBanner';
import { TokenServiceBanner } from './TokenServiceBanner';
import { BottomTabs } from './BottomTabs';
import { Footer } from './Footer';
import { usePWAInstall } from '../../lib/pwa';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Share2, PlusSquare } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isIOS, isStandalone } = usePWAInstall();
  const [showIOSInstallSheet, setShowIOSInstallSheet] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col bg-am-bg text-am-ink">
      <Navbar />
      <TokenServiceBanner />
      <DemoBanner />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <Outlet />
      </main>

      <Footer />
      <BottomTabs />

      {/* iOS Safari Home Screen instructions sheet */}
      {isIOS && !isStandalone && (
        <Modal
          isOpen={showIOSInstallSheet}
          onClose={() => setShowIOSInstallSheet(false)}
          title="Install AlmostMine"
          description="Add to your iPhone / iPad Home Screen for the full app experience"
        >
          <div className="flex flex-col gap-4 text-left text-sm py-2">
            <div className="flex items-start gap-3 p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <Share2 className="w-5 h-5 text-am-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-am-ink">1. Tap the Share button</p>
                <p className="text-xs text-am-ink-muted">In Safari, tap the square Share icon at the bottom of the screen.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <PlusSquare className="w-5 h-5 text-am-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-am-ink">2. Tap 'Add to Home Screen'</p>
                <p className="text-xs text-am-ink-muted">Scroll down in the action sheet and select "Add to Home Screen".</p>
              </div>
            </div>

            <Button variant="primary" size="md" onClick={() => setShowIOSInstallSheet(false)}>
              Got it
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
