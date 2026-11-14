import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Clock, ArrowLeft } from 'lucide-react';

export const ComingSoon: React.FC<{ featureName?: string }> = ({ featureName }) => {
  const location = useLocation();

  const getTitle = () => {
    if (featureName) return featureName;
    if (location.pathname.startsWith('/wishboard')) return 'Community Wishboard';
    if (location.pathname.startsWith('/tools')) return 'Marketplace Tools';
    if (location.pathname.startsWith('/insights')) return 'Marketplace Insights';
    if (location.pathname.startsWith('/admin/analytics/validation')) return 'Analytics Fixture Validation';
    if (location.pathname.startsWith('/admin/analytics')) return 'Admin Marketplace Analytics';
    if (location.pathname.startsWith('/admin/moderation')) return 'Admin Moderation';
    if (location.pathname.startsWith('/admin/demo')) return 'Admin Demo Data Studio';
    if (location.pathname.startsWith('/admin')) return 'Admin Console';
    return 'Feature';
  };

  const title = getTitle();

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-am-sand text-am-ink flex items-center justify-center mb-4">
        <Clock className="w-6 h-6 text-am-primary" />
      </div>

      <div className="inline-block px-3 py-1 rounded-full bg-am-surface-2 text-am-ink-muted text-xs font-semibold uppercase tracking-wider mb-3">
        Coming soon
      </div>

      <h1 className="font-heading text-2xl font-semibold text-am-ink mb-2">
        {title}
      </h1>

      <p className="text-sm text-am-ink-muted leading-relaxed mb-6">
        This area is scheduled for implementation in upcoming stages according to the product roadmap.
      </p>

      <Link to="/">
        <Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Home
        </Button>
      </Link>
    </div>
  );
};
