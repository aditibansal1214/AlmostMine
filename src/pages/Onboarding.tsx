import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { Button } from '../components/ui/Button';
import { Stepper } from '../components/ui/Stepper';
import { CATEGORIES } from '../domain/rules';
import { Building2, Sparkles, Check, ArrowRight } from 'lucide-react';

const COMMUNITIES = [
  { id: 'comm_greenfield', name: 'Greenfield Eco-Residences', city: 'Bengaluru', locality: 'Sarjapur' },
  { id: 'comm_iitb', name: 'Powai Tech & Campus Enclave', city: 'Mumbai', locality: 'Powai' },
  { id: 'comm_gurugram', name: 'CyberHub Urban Loft Community', city: 'Gurugram', locality: 'DLF Phase 2' },
];

export const Onboarding: React.FC = () => {
  const { completeOnboarding, userPrivate } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCommunity, setSelectedCommunity] = useState('comm_greenfield');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (category: string) => {
    setSelectedInterests((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleFinish = async (targetRoute: '/items/new' | '/browse') => {
    try {
      setLoading(true);
      await completeOnboarding(selectedCommunity, selectedInterests);
      navigate(targetRoute);
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Community' },
    { id: 2, label: 'Interests' },
    { id: 3, label: 'Get Started' },
  ];

  return (
    <div className="max-w-xl mx-auto py-8 px-4 flex flex-col items-center text-center">
      <div className="w-full mb-8">
        <Stepper steps={steps} currentStep={step} />
      </div>

      {/* Screen 1: Community */}
      {step === 1 && (
        <div className="w-full flex flex-col items-center">
          <div className="p-3 rounded-full bg-am-sand text-am-primary mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-am-ink mb-2">
            Choose your community
          </h2>
          <p className="text-sm text-am-ink-muted mb-6 max-w-md">
            AlmostMine works best with neighbors and nearby peers so handovers are fast and effortless.
          </p>

          <div className="flex flex-col gap-3 w-full mb-8 text-left">
            {COMMUNITIES.map((comm) => (
              <button
                key={comm.id}
                onClick={() => setSelectedCommunity(comm.id)}
                className={`p-4 rounded-am-card border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedCommunity === comm.id
                    ? 'border-am-primary bg-am-surface ring-2 ring-am-primary/20'
                    : 'border-am-border bg-am-surface hover:bg-am-surface-2'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-am-ink text-sm">{comm.name}</h4>
                  <p className="text-xs text-am-ink-muted">
                    {comm.locality}, {comm.city}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedCommunity === comm.id
                      ? 'border-am-primary bg-am-primary text-white'
                      : 'border-am-border bg-am-surface'
                  }`}
                >
                  {selectedCommunity === comm.id && <Check className="w-3 h-3" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => handleFinish('/browse')}
              className="text-xs text-am-ink-muted hover:text-am-ink font-medium"
            >
              Skip onboarding
            </button>
            <Button variant="primary" size="md" onClick={() => setStep(2)}>
              Next Step
            </Button>
          </div>
        </div>
      )}

      {/* Screen 2: Interests */}
      {step === 2 && (
        <div className="w-full flex flex-col items-center">
          <div className="p-3 rounded-full bg-am-sand text-am-primary mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-am-ink mb-2">
            What gear interests you?
          </h2>
          <p className="text-sm text-am-ink-muted mb-6 max-w-md">
            Select a few categories you frequently use or might need to borrow (optional).
          </p>

          <div className="flex flex-wrap gap-2.5 justify-center mb-8 max-w-lg">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedInterests.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleInterest(cat)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium border transition cursor-pointer ${
                    isSelected
                      ? 'bg-am-primary text-am-on-primary border-am-primary'
                      : 'bg-am-surface text-am-ink border-am-border hover:bg-am-surface-2'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="md" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="md" onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Screen 3: Choose Next Action */}
      {step === 3 && (
        <div className="w-full flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-am-primary text-am-on-primary flex items-center justify-center mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-am-ink mb-2">
            You're all set!
          </h2>
          <p className="text-sm text-am-ink-muted mb-8 max-w-md">
            How would you like to start? Most members begin by listing one camera, drill, or travel bag that's sitting idle.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <Button
              variant="primary"
              size="lg"
              loading={loading}
              onClick={() => handleFinish('/items/new')}
              className="w-full flex-1"
            >
              List your first item
            </Button>
            <Button
              variant="secondary"
              size="lg"
              loading={loading}
              onClick={() => handleFinish('/browse')}
              className="w-full flex-1"
            >
              Browse items first
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
