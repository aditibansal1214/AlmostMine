import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Listing, Category, ItemCondition, TransactionType } from '../domain/types';
import { CATEGORIES, CONDITIONS, formatINR } from '../domain/rules';
import { ListingCard } from '../components/ui/ListingCard';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Search, SlidersHorizontal, Sparkles, Bookmark, X, Compass } from 'lucide-react';

export const Browse: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(
    (searchParams.get('cat') as Category) || 'all'
  );
  const [selectedCondition, setSelectedCondition] = useState<ItemCondition | 'all'>('all');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);

  useEffect(() => {
    async function fetchActiveListings() {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
        setListings(all);
      } catch (err) {
        console.warn('Failed to load browse listings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveListings();
  }, []);

  // Filter listings client-side
  const filteredListings = listings
    .filter((item) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesDesc = item.description?.toLowerCase().includes(term);
        const matchesLoc = item.locality?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
      }
      // Category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Condition
      if (selectedCondition !== 'all' && item.condition !== selectedCondition) {
        return false;
      }
      // Type
      if (selectedType !== 'all' && item.transactionType !== selectedType) {
        return false;
      }
      // Max price (for rent)
      if (item.transactionType === 'rent' && item.pricePerDay > maxPrice) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.pricePerDay || 0) - (b.pricePerDay || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.pricePerDay || 0) - (a.pricePerDay || 0);
      }
      // newest
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

  // Save this search with one tap
  const handleSaveSearch = async () => {
    if (!currentUser) {
      showToast({ type: 'warning', message: 'Sign in to save searches.' });
      return;
    }
    try {
      setSavingSearch(true);
      await addDoc(collection(db, 'savedSearches'), {
        userId: currentUser.uid,
        query: searchTerm.trim() || null,
        category: selectedCategory !== 'all' ? selectedCategory : null,
        maxPrice: maxPrice || null,
        lastCheckedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      showToast({
        type: 'success',
        message: 'Search saved! You will receive in-app alerts when matching items are listed.',
      });
    } catch (err) {
      console.error('Error saving search:', err);
      showToast({ type: 'danger', message: 'Failed to save search.' });
    } finally {
      setSavingSearch(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCondition('all');
    setSelectedType('all');
    setMaxPrice(5000);
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'all' ||
    selectedCondition !== 'all' ||
    selectedType !== 'all' ||
    maxPrice < 5000;

  return (
    <div className="flex flex-col gap-6 md:gap-8 text-left">
      {/* Top Banner: "Describe what you need" -> Find it for me */}
      <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-am-sand text-am-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-am-ink">
              Can't find the exact item you need?
            </h3>
            <p className="text-xs text-am-ink-muted">
              Use "Find it for me" to match availability across your community or post a wish.
            </p>
          </div>
        </div>
        <Link to="/tools/find-it" className="shrink-0">
          <Button variant="secondary" size="sm">
            Find it for me
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-am-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cameras, power tools, camping gear, luggage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-am-surface text-am-ink text-base md:text-sm h-11 pl-10 pr-10 rounded-am-input border border-am-border focus:border-am-primary focus:outline-none focus:ring-1 focus:ring-am-primary transition shadow-am-soft"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-am-ink-muted hover:text-am-ink p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Filter Sheet trigger */}
          <Button
            variant="secondary"
            size="md"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setFilterSheetOpen(true)}
            className="flex-1 sm:flex-initial"
          >
            <span>Filters {hasActiveFilters && '•'}</span>
          </Button>

          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-am-surface text-am-ink text-sm h-11 px-3 rounded-am-input border border-am-border focus:outline-none focus:ring-1 focus:ring-am-primary transition cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {/* Save Search */}
          <Button
            variant="ghost"
            size="md"
            icon={<Bookmark className="w-4 h-4" />}
            onClick={handleSaveSearch}
            loading={savingSearch}
            title="Save this search"
            className="hidden sm:inline-flex"
          >
            Save search
          </Button>
        </div>
      </div>

      {/* Quick Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-am-primary text-am-on-primary'
              : 'bg-am-surface border border-am-border text-am-ink hover:bg-am-surface-2'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.slice(0, 6).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-am-primary text-am-on-primary'
                : 'bg-am-surface border border-am-border text-am-ink hover:bg-am-surface-2'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count & Save search button on mobile */}
      <div className="flex items-center justify-between text-xs text-am-ink-muted">
        <span>
          Showing <strong>{filteredListings.length}</strong> available item
          {filteredListings.length === 1 ? '' : 's'}
        </span>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-am-primary font-medium hover:underline">
            Reset filters
          </button>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-4/3 rounded-am-card bg-am-surface-2 animate-pulse" />
          ))}
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredListings.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Compass className="w-8 h-8" />}
          title="No items found"
          description={
            hasActiveFilters
              ? 'Try widening your search terms or clearing active filters.'
              : 'No active items listed in your cluster yet. Be the first to share!'
          }
          actionLabel={hasActiveFilters ? 'Clear filters' : 'List an item'}
          onAction={hasActiveFilters ? clearFilters : () => (window.location.href = '/items/new')}
          secondaryActionLabel="Post to Wishboard"
          onSecondaryAction={() => (window.location.href = '/wishboard')}
        />
      )}

      {/* Filter Sheet / Drawer */}
      <Modal
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filter Listings"
        description="Refine by category, condition, price, or sharing mode"
      >
        <div className="flex flex-col gap-5 text-left py-2">
          <Select
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            options={[{ label: 'All Categories', value: 'all' }, ...CATEGORIES.map((c) => ({ label: c, value: c }))]}
          />

          <Select
            label="Condition"
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value as any)}
            options={[{ label: 'Any Condition', value: 'all' }, ...CONDITIONS.map((c) => ({ label: c, value: c }))]}
          />

          <Select
            label="Share Mode"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            options={[
              { label: 'All Modes', value: 'all' },
              { label: 'Rent per day', value: 'rent' },
              { label: 'Free Lend', value: 'free lend' },
              { label: 'Swap', value: 'swap' },
            ]}
          />

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
                Max Daily Rent
              </label>
              <span className="text-xs font-semibold text-am-ink">{formatINR(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-am-primary cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-am-border">
            <Button variant="secondary" size="md" onClick={clearFilters}>
              Reset
            </Button>
            <Button variant="primary" size="md" onClick={() => setFilterSheetOpen(false)}>
              Show Results
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
