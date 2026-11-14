import React, { useState } from 'react';
import { KPI_REGISTRY, KPIDefinition } from '../../domain/kpis';
import { Modal } from './Modal';
import { Info } from 'lucide-react';

export interface KPITileProps {
  definitionId: string;
  value: string | number;
  trend?: string;
  className?: string;
}

export const KPITile: React.FC<KPITileProps> = ({ definitionId, value, trend, className = '' }) => {
  const [showDetails, setShowDetails] = useState(false);
  const def: KPIDefinition | undefined = KPI_REGISTRY[definitionId];

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className={`group text-left p-4 rounded-am-card border border-am-border bg-am-surface hover:border-am-primary/40 transition shadow-am-soft flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-am-primary ${className}`}
        aria-label={`View details for ${def?.label || definitionId}`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-am-ink-muted uppercase tracking-wider">
            {def?.label || definitionId}
          </span>
          <div className="flex items-center gap-1.5">
            {def && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  def.type === 'Recorded'
                    ? 'bg-am-sand/80 text-am-ink'
                    : 'bg-am-accent/15 text-am-accent'
                }`}
              >
                {def.type}
              </span>
            )}
            <Info className="w-3.5 h-3.5 text-am-ink-muted/60 group-hover:text-am-ink transition" />
          </div>
        </div>

        <div className="text-2xl md:text-3xl font-heading font-semibold text-am-ink tracking-tight mb-1">
          {value}
        </div>

        {trend ? (
          <p className="text-xs text-am-ink-muted truncate">{trend}</p>
        ) : (
          <p className="text-xs text-am-ink-muted/70 truncate">Tap for calculation method</p>
        )}
      </button>

      {/* KPI Definition Modal / Sheet */}
      {def && (
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={def.label}
          description={`${def.type} Platform Metric`}
        >
          <div className="flex flex-col gap-4 text-left">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">Summary</span>
              <p className="text-sm text-am-ink mt-1 leading-relaxed">{def.description}</p>
            </div>

            <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border font-mono text-xs text-am-ink">
              <span className="text-am-ink-muted block text-[10px] uppercase font-sans mb-1 font-semibold">
                Formula
              </span>
              {def.formula}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-am-input bg-am-surface-2 border border-am-border">
                <span className="text-am-ink-muted block text-[10px] uppercase font-semibold">Status Scope</span>
                <span className="font-medium text-am-ink">{def.statusFilters.join(', ')}</span>
              </div>
              <div className="p-2.5 rounded-am-input bg-am-surface-2 border border-am-border">
                <span className="text-am-ink-muted block text-[10px] uppercase font-semibold">Source Collection</span>
                <span className="font-medium text-am-ink">{def.sourceCollections.join(', ')}</span>
              </div>
            </div>

            <p className="text-xs text-am-ink-muted italic border-t border-am-border pt-3">
              {def.type === 'Recorded'
                ? 'This metric reflects immutable public activity or completed booking records.'
                : 'This is an upper-bound estimate based on reported purchase spend avoided.'}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};
