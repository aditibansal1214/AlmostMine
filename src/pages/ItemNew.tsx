import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Stepper } from '../components/ui/Stepper';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { CATEGORIES, CONDITIONS, formatINR } from '../domain/rules';
import { Category, ItemCondition, TransactionType, Listing } from '../domain/types';
import { resizeImageToDataUrl } from '../lib/imageUtils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Upload, X, Sparkles, CheckCircle2, Share2, Plus, Info, ArrowLeft } from 'lucide-react';

export const ItemNew: React.FC = () => {
  const { currentUser, publicProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [publishedItem, setPublishedItem] = useState<{ id: string; title: string } | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Cameras and creator gear');
  const [condition, setCondition] = useState<ItemCondition>('Like new');
  const [replacementValue, setReplacementValue] = useState<number>(15000);
  const [transactionType, setTransactionType] = useState<TransactionType>('rent');
  const [pricePerDay, setPricePerDay] = useState<number>(500);
  const [minDays, setMinDays] = useState<number>(1);
  const [maxDays, setMaxDays] = useState<number>(14);
  const [depositInfo, setDepositInfo] = useState('');
  const [rules, setRules] = useState('');
  const [handover, setHandover] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live Fair Price comparables state
  const [comparables, setComparables] = useState<{ count: number; median?: number; p25?: number; p75?: number }>({ count: 0 });

  useEffect(() => {
    async function fetchComparables() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('category', '==', category),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const prices: number[] = [];
        snap.forEach((doc) => {
          const l = doc.data() as Listing;
          if (l.transactionType === 'rent' && l.pricePerDay > 0) {
            prices.push(l.pricePerDay);
          }
        });

        if (prices.length >= 5) {
          prices.sort((a, b) => a - b);
          const median = prices[Math.floor(prices.length / 2)];
          const p25 = prices[Math.floor(prices.length * 0.25)];
          const p75 = prices[Math.floor(prices.length * 0.75)];
          setComparables({ count: prices.length, median, p25, p75 });
        } else {
          setComparables({ count: prices.length });
        }
      } catch (err) {
        console.warn('Fair price fetch notice:', err);
      }
    }
    fetchComparables();
  }, [category]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      showToast({ type: 'warning', message: 'Maximum 5 photos allowed per item.' });
      return;
    }

    setUploadingImage(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const resized = await resizeImageToDataUrl(files[i]);
        newImages.push(resized);
      }
      setImages(newImages);
      if (errors.images) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.images;
          return next;
        });
      }
    } catch (err: any) {
      showToast({ type: 'danger', message: err.message || 'Image upload failed.' });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required (e.g., Sony Alpha A7 III)';
    if (title.length > 80) newErrors.title = 'Title must be 80 characters or fewer';
    if (images.length === 0) newErrors.images = 'Please add at least 1 photo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!replacementValue || replacementValue <= 0) {
      newErrors.replacementValue = 'Enter an approximate replacement value in INR';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (transactionType === 'rent' && (!pricePerDay || pricePerDay <= 0)) {
      newErrors.pricePerDay = 'Enter a valid daily rental price';
    }
    if (minDays < 1) newErrors.minDays = 'Minimum days must be at least 1';
    if (maxDays < minDays) newErrors.maxDays = 'Maximum days cannot be less than minimum days';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSave = async (status: 'active' | 'draft') => {
    if (!currentUser) return;
    if (status === 'active' && !validateStep3()) return;

    setLoading(true);
    try {
      const listingData: Omit<Listing, 'id'> = {
        ownerId: currentUser.uid,
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        replacementValue: Number(replacementValue) || 10000,
        transactionType,
        pricePerDay: transactionType === 'rent' ? Number(pricePerDay) || 0 : 0,
        minDays: Number(minDays) || 1,
        maxDays: Number(maxDays) || 14,
        depositInfo: depositInfo.trim() || undefined,
        images,
        communityId: publicProfile?.communityId || 'comm_greenfield',
        locality: publicProfile?.locality || 'Sarjapur, Bengaluru',
        rules: rules.trim() || undefined,
        handover: handover.trim() || undefined,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'listings'), listingData);

      if (status === 'active') {
        setPublishedItem({ id: docRef.id, title: title.trim() });
      } else {
        showToast({ type: 'success', message: 'Draft saved to My Items.' });
        navigate('/items');
      }
    } catch (err: any) {
      console.error('Error saving listing:', err);
      showToast({ type: 'danger', message: 'Failed to publish listing.' });
    } finally {
      setLoading(false);
    }
  };

  // Idle value estimate calculation for Step 2 preview
  const idleDaysEstimate = 20; // illustrative typical unused days per year
  const illustrativeYearlyEarning = Math.round(
    (transactionType === 'rent' ? pricePerDay : 400) * idleDaysEstimate * 0.92
  );

  const steps = [
    { id: 1, label: 'Photos & Name' },
    { id: 2, label: 'Category & Value' },
    { id: 3, label: 'Sharing & Pricing' },
  ];

  // Success view after publishing
  if (publishedItem) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-am-success/15 text-am-success flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-heading text-2xl font-semibold text-am-ink mb-2">
          Listing Published!
        </h2>
        <p className="text-sm text-am-ink-muted mb-6 leading-relaxed">
          <strong>"{publishedItem.title}"</strong> is now live for neighbors in your community to discover and request.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            icon={<Share2 className="w-4 h-4" />}
            onClick={() => {
              navigator.clipboard?.writeText(window.location.origin + `/listing/${publishedItem.id}`);
              showToast({ type: 'success', message: 'Listing link copied to clipboard!' });
            }}
          >
            Copy share link
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setPublishedItem(null);
              setStep(1);
              setTitle('');
              setDescription('');
              setImages([]);
            }}
          >
            List another item
          </Button>
          <Link to="/items" className="text-xs text-am-ink-muted hover:text-am-ink pt-2 font-medium">
            Go to My Items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/items'))}
          className="flex items-center gap-1.5 text-xs font-semibold text-am-ink-muted hover:text-am-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step > 1 ? 'Back' : 'Cancel'}</span>
        </button>
        <span className="text-xs text-am-ink-muted">Step {step} of 3</span>
      </div>

      <div className="mb-8">
        <Stepper steps={steps} currentStep={step} />
      </div>

      {/* STEP 1: Photos & Name */}
      {step === 1 && (
        <div className="flex flex-col gap-6 text-left">
          <div>
            <h2 className="font-heading text-xl font-semibold text-am-ink">
              1. Photos & Name
            </h2>
            <p className="text-xs text-am-ink-muted mt-1">
              Clear photos of the actual item help neighbors trust and request faster.
            </p>
          </div>

          {/* Photo Uploader */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
              Photos (up to 5, at least 1 required)
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-am-card border border-am-border overflow-hidden bg-am-surface-2 group"
                >
                  <img src={img} alt={`Item ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black transition"
                    aria-label="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] bg-am-primary text-white px-1.5 py-0.5 rounded-full font-semibold">
                      Cover
                    </span>
                  )}
                </div>
              ))}

              {images.length < 5 && (
                <label className="aspect-square rounded-am-card border border-dashed border-am-border hover:border-am-primary bg-am-surface-2/60 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition">
                  <Upload className="w-5 h-5 text-am-ink-muted mb-1" />
                  <span className="text-[11px] font-medium text-am-ink">
                    {uploadingImage ? 'Resizing...' : 'Add photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
            {errors.images && <p className="text-xs text-am-danger mt-1.5 font-medium">{errors.images}</p>}
          </div>

          {/* Title */}
          <Input
            label="Item Title"
            placeholder="e.g. Sony Alpha A7 III with 28-70mm Lens"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            helperText={`${title.length}/80 characters`}
          />

          {/* Description */}
          <Textarea
            label="Description & What's Included"
            placeholder="Describe the condition, what accessories or cables are included, and any helpful tips for the borrower."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <div className="flex justify-end pt-4 border-t border-am-border">
            <Button variant="primary" size="md" onClick={handleNext}>
              Continue to Step 2
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Category, Condition & Value */}
      {step === 2 && (
        <div className="flex flex-col gap-6 text-left">
          <div>
            <h2 className="font-heading text-xl font-semibold text-am-ink">
              2. Category & Value
            </h2>
            <p className="text-xs text-am-ink-muted mt-1">
              Categorize accurately to connect with relevant community requests.
            </p>
          </div>

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
          />

          <Select
            label="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as ItemCondition)}
            options={CONDITIONS.map((c) => ({ label: c, value: c }))}
          />

          <Input
            label="Approximate Replacement Value (INR)"
            type="number"
            value={replacementValue}
            onChange={(e) => setReplacementValue(Number(e.target.value))}
            error={errors.replacementValue}
            helperText="What would it cost to buy this item new today? Used only for savings estimation."
            startAdornment="₹"
          />

          {/* Live Idle Value Preview */}
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
            <div className="flex items-center gap-2 mb-2 text-am-primary">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Idle Value Insight
              </h4>
            </div>
            <p className="text-xs text-am-ink-muted leading-relaxed mb-3">
              Items in <strong>{category}</strong> typically sit idle 85% of the year. Sharing this item could generate an illustrative <strong>{formatINR(illustrativeYearlyEarning)}</strong> annually while helping a neighbor avoid purchasing new.
            </p>
            <p className="text-[10px] text-am-ink-muted italic">
              *Illustrative estimate based on typical category usage rarity and condition. Not guaranteed earnings.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-am-border">
            <Button variant="ghost" size="md" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="md" onClick={handleNext}>
              Continue to Step 3
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Sharing, Pricing & Rules */}
      {step === 3 && (
        <div className="flex flex-col gap-6 text-left">
          <div>
            <h2 className="font-heading text-xl font-semibold text-am-ink">
              3. How You Will Share It
            </h2>
            <p className="text-xs text-am-ink-muted mt-1">
              Set pricing and terms. You retain full control over who you approve.
            </p>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
              Share Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'rent', label: 'Rent per day', desc: 'Earn daily fees' },
                { type: 'free lend', label: 'Free Lend', desc: 'Community goodwill' },
                { type: 'swap', label: 'Swap', desc: 'Trade for other items' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setTransactionType(opt.type as TransactionType)}
                  className={`p-3 rounded-am-card border text-left transition cursor-pointer ${
                    transactionType === opt.type
                      ? 'border-am-primary bg-am-surface ring-2 ring-am-primary/20'
                      : 'border-am-border bg-am-surface hover:bg-am-surface-2'
                  }`}
                >
                  <p className="font-semibold text-am-ink text-xs mb-0.5">{opt.label}</p>
                  <p className="text-[10px] text-am-ink-muted">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Price per day (if rent) */}
          {transactionType === 'rent' && (
            <div className="flex flex-col gap-2">
              <Input
                label="Price Per Day (INR)"
                type="number"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
                error={errors.pricePerDay}
                startAdornment="₹"
              />

              {/* Live Fair-Price Hint */}
              <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border text-xs text-am-ink flex items-start gap-2.5">
                <Info className="w-4 h-4 text-am-info shrink-0 mt-0.5" />
                <div>
                  {comparables.count >= 5 ? (
                    <p>
                      <strong>Fair-price hint:</strong> Active {category} in similar condition rent for a median of{' '}
                      <strong>{formatINR(comparables.median!)}/day</strong> (25th–75th percentile: {formatINR(comparables.p25!)} – {formatINR(comparables.p75!)}).
                    </p>
                  ) : (
                    <p className="text-am-ink-muted">
                      Not enough comparable listings in {category} yet ({comparables.count} of 5 needed) to compute fair-price percentiles. You are setting the trend!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Min & Max Days */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Days"
              type="number"
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              error={errors.minDays}
            />
            <Input
              label="Maximum Days"
              type="number"
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
              error={errors.maxDays}
            />
          </div>

          {/* House rules & handover instructions */}
          <Input
            label="House Rules (Optional)"
            placeholder="e.g. Return clean, indoor use only, no pets"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
          />

          <Input
            label="Handover / Pickup Notes"
            placeholder="e.g. Pickup at Tower C lobby between 6 PM - 9 PM"
            value={handover}
            onChange={(e) => setHandover(e.target.value)}
          />

          {/* Security & Payment Disclaimer */}
          <div className="p-3 rounded-am-input bg-am-surface-2/60 border border-am-border text-[11px] text-am-ink-muted leading-relaxed">
            Payments are arranged directly between users. AlmostMine does not process payments, verify identity, or insure items.
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-am-border">
            <Button variant="ghost" size="md" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleSave('draft')}
                loading={loading}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleSave('active')}
                loading={loading}
              >
                Publish Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
