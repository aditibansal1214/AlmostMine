import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { useToast } from '../lib/toastContext';
import { usePWAInstall } from '../lib/pwa';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CATEGORIES } from '../domain/rules';
import { resizeImageToDataUrl } from '../lib/imageUtils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  User,
  Shield,
  Palette,
  Sliders,
  Bell,
  HardDrive,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  Trash2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    currentUser,
    userPrivate,
    publicProfile,
    updateFullProfile,
    updateUserPrivate,
    deleteUserAccount,
    logout,
  } = useAuth();
  const {
    theme,
    setTheme,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    textSize,
    setTextSize,
  } = useTheme();
  const { showToast } = useToast();
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'account' | 'privacy' | 'preferences' | 'appearance' | 'notifications' | 'data'
  >('profile');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [locality, setLocality] = useState('');
  const [communityId, setCommunityId] = useState('comm_greenfield');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  // Privacy toggles
  const [showBio, setShowBio] = useState(true);
  const [showLocality, setShowLocality] = useState(true);
  const [showInterests, setShowInterests] = useState(true);
  const [showLastName, setShowLastName] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);

  // Notifications
  const [notifBooking, setNotifBooking] = useState(true);
  const [notifSearches, setNotifSearches] = useState(true);
  const [notifWishes, setNotifWishes] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Account deletion dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset defaults dialog
  const [resetDefaultsOpen, setResetDefaultsOpen] = useState(false);

  // Initialize form from context
  useEffect(() => {
    if (publicProfile) {
      setDisplayName(publicProfile.displayName || '');
      setUsername(publicProfile.username || '');
      setBio(publicProfile.bio || '');
      setLocality(publicProfile.locality || '');
      setCommunityId(publicProfile.communityId || 'comm_greenfield');
      setAvatarUrl(publicProfile.avatarUrl || '');
      setInterests(publicProfile.interests || []);

      if (publicProfile.visibility) {
        setShowBio(publicProfile.visibility.bio ?? true);
        setShowLocality(publicProfile.visibility.locality ?? true);
        setShowInterests(publicProfile.visibility.interests ?? true);
        setShowLastName(publicProfile.visibility.showLastName ?? false);
        setDiscoverable(publicProfile.visibility.discoverable ?? true);
      }
    }
    if (userPrivate) {
      setFirstName(userPrivate.firstName || '');
      setLastName(userPrivate.lastName || '');
      setPhone(userPrivate.phone || '');

      if (userPrivate.settings?.notificationPrefs) {
        const np = userPrivate.settings.notificationPrefs;
        setNotifBooking(np.bookingUpdates ?? true);
        setNotifSearches(np.savedSearches ?? true);
        setNotifWishes(np.wishResponses ?? true);
        setNotifReviews(np.reviewReminders ?? true);
      }
    }
    setIsDirty(false);
  }, [publicProfile, userPrivate]);

  const handleFieldChange = () => {
    setIsDirty(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256, 0.7);
      setAvatarUrl(dataUrl);
      setIsDirty(true);
    } catch (err: any) {
      showToast({ type: 'danger', message: err.message || 'Avatar upload failed.' });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (displayName.trim().length < 2 || displayName.trim().length > 40) {
      errs.displayName = 'Display name must be between 2 and 40 characters.';
    }
    const cleanUser = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      errs.username = 'Username must be 3-20 characters (lowercase letters, digits, underscore).';
    }
    if (bio.length > 280) {
      errs.bio = 'Bio must be 280 characters or fewer.';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateFullProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        locality: locality.trim(),
        communityId,
        interests,
        phone: phone.trim(),
        avatarUrl,
        visibility: {
          bio: showBio,
          locality: showLocality,
          interests: showInterests,
          showLastName,
          discoverable,
        },
      });

      // Update notification prefs
      if (userPrivate) {
        await updateUserPrivate({
          settings: {
            ...userPrivate.settings,
            notificationPrefs: {
              bookingUpdates: notifBooking,
              savedSearches: notifSearches,
              wishResponses: notifWishes,
              reviewReminders: notifReviews,
              emailEnabled: false,
            },
          },
        });
      }

      setIsDirty(false);
      showToast({ type: 'success', message: 'Settings saved successfully.' });
    } catch (err: any) {
      console.error('Settings save error:', err);
      showToast({ type: 'danger', message: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    // Re-populate from current profile state
    if (publicProfile) {
      setDisplayName(publicProfile.displayName || '');
      setUsername(publicProfile.username || '');
      setBio(publicProfile.bio || '');
      setLocality(publicProfile.locality || '');
      setAvatarUrl(publicProfile.avatarUrl || '');
    }
    if (userPrivate) {
      setFirstName(userPrivate.firstName || '');
      setLastName(userPrivate.lastName || '');
      setPhone(userPrivate.phone || '');
    }
    setIsDirty(false);
    setValidationErrors({});
    showToast({ type: 'info', message: 'Unsaved changes discarded.' });
  };

  // Export JSON Data
  const handleExportData = async () => {
    if (!currentUser) return;
    try {
      showToast({ type: 'info', message: 'Generating data archive...' });
      const listingsSnap = await getDocs(
        query(collection(db, 'listings'), where('ownerId', '==', currentUser.uid))
      );
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('borrowerId', '==', currentUser.uid))
      );

      const archive = {
        exportedAt: new Date().toISOString(),
        profile: publicProfile,
        account: {
          uid: currentUser.uid,
          email: currentUser.email,
          createdAt: userPrivate?.createdAt,
        },
        listings: listingsSnap.docs.map((d) => d.data()),
        bookingsRequested: bookingsSnap.docs.map((d) => d.data()),
      };

      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `almostmine_data_${currentUser.uid}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast({ type: 'success', message: 'Data export downloaded.' });
    } catch (err) {
      console.error('Export error:', err);
      showToast({ type: 'danger', message: 'Failed to export data.' });
    }
  };

  // Calculate profile completeness percentage
  let completeness = 20; // base auth
  if (displayName) completeness += 20;
  if (bio) completeness += 20;
  if (locality) completeness += 20;
  if (avatarUrl) completeness += 20;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data', icon: HardDrive },
  ];

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 flex flex-col gap-6 text-left pb-24">
      {/* Top Header & Completeness Ring */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-am-border pb-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink">
            Settings
          </h1>
          <p className="text-xs text-am-ink-muted">
            Manage your profile, community visibility, and preferences
          </p>
        </div>

        {/* Completeness indicator */}
        <div className="flex items-center gap-3 p-2.5 rounded-am-card border border-am-border bg-am-surface self-start sm:self-auto">
          <div className="relative w-8 h-8 flex items-center justify-center font-bold text-xs text-am-primary">
            <span>{completeness}%</span>
          </div>
          <div className="text-xs">
            <span className="font-semibold text-am-ink block">Profile Completeness</span>
            <span className="text-[10px] text-am-ink-muted">
              {completeness === 100 ? 'All details set!' : 'Add bio and photo to increase trust'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-b border-am-border text-xs">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-am-input font-medium whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-am-sand text-am-ink font-semibold'
                  : 'text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. Profile Tab */}
      {activeTab === 'profile' && (
        <div className="flex flex-col gap-5 max-w-xl">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-am-border bg-am-surface-2 flex items-center justify-center font-heading font-semibold text-am-primary text-xl overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase() || 'M'
              )}
            </div>
            <div>
              <label className="text-xs font-semibold px-3 py-1.5 rounded-am-input bg-am-surface border border-am-border hover:bg-am-surface-2 text-am-ink cursor-pointer inline-block transition">
                Change avatar
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <span className="text-[10px] text-am-ink-muted block mt-1">
                Resized to 256px client-side (&lt; 40KB)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                handleFieldChange();
              }}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                handleFieldChange();
              }}
            />
          </div>

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              handleFieldChange();
            }}
            error={validationErrors.displayName}
            helperText="Visible to members on requests and listings (2 to 40 characters)"
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              handleFieldChange();
            }}
            error={validationErrors.username}
            helperText="Unique community identifier (e.g. aditi_b)"
            startAdornment="@"
          />

          <Textarea
            label="Bio (Max 280 characters)"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              handleFieldChange();
            }}
            error={validationErrors.bio}
            helperText={`${bio.length}/280 characters`}
            rows={3}
          />

          <Input
            label="General Locality"
            value={locality}
            onChange={(e) => {
              setLocality(e.target.value);
              handleFieldChange();
            }}
            helperText="General cluster or neighborhood only (e.g. Sarjapur, Bengaluru). Never enter a street address."
          />

          <Input
            label="Phone Number (Private)"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              handleFieldChange();
            }}
            placeholder="+91 98765 43210"
            helperText="Stored privately in your users document. Labelled 'Not verified' (no SMS verification flow exists)."
          />
        </div>
      )}

      {/* 2. Account Tab */}
      {activeTab === 'account' && (
        <div className="flex flex-col gap-6 max-w-xl">
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
              Authentication Method
            </h3>
            <p className="text-sm font-semibold text-am-ink">
              Sign in with Google ({currentUser?.email})
            </p>
            <p className="text-xs text-am-ink-muted leading-relaxed">
              Google manages your password and account security. Profile credentials and authentication tokens are authenticated directly through Firebase.
            </p>
          </div>

          <div className="p-4 rounded-am-card border border-am-border bg-am-surface-2/40 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-am-ink">Sign Out</h4>
              <p className="text-[11px] text-am-ink-muted">Sign out of this browser session</p>
            </div>
            <Button variant="secondary" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={logout}>
              Sign out
            </Button>
          </div>

          <div className="p-4 rounded-am-card border border-am-danger/30 bg-am-danger/10 flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-semibold text-am-danger flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Danger Zone: Delete Account
              </h4>
              <p className="text-xs text-am-ink-muted mt-1 leading-relaxed">
                Deletes private profile, removes active listings, and anonymises past completed records as "Deleted user".
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="self-start"
            >
              Delete my account
            </Button>
          </div>
        </div>
      )}

      {/* 3. Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="flex flex-col gap-5 max-w-xl">
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink mb-3">
              Public Profile Visibility
            </h3>
            <p className="text-xs text-am-ink-muted mb-4 leading-relaxed">
              Control what information appears when neighbors inspect your Community Trust Profile or listings.
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Show Bio</span>
                <input
                  type="checkbox"
                  checked={showBio}
                  onChange={(e) => {
                    setShowBio(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Show General Locality</span>
                <input
                  type="checkbox"
                  checked={showLocality}
                  onChange={(e) => {
                    setShowLocality(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Show Full Last Name (otherwise initial only)</span>
                <input
                  type="checkbox"
                  checked={showLastName}
                  onChange={(e) => {
                    setShowLastName(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Allow profile discovery in community member search</span>
                <input
                  type="checkbox"
                  checked={discoverable}
                  onChange={(e) => {
                    setDiscoverable(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>
            </div>
          </div>

          <div className="p-3.5 rounded-am-input bg-am-surface-2/60 border border-am-border text-xs text-am-ink-muted leading-relaxed">
            <strong>Privacy Guarantee:</strong> Email and phone exist strictly in your private <code>users</code> document. They are never published to public profiles or readable by other users.
          </div>
        </div>
      )}

      {/* 4. Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="flex flex-col gap-6 max-w-xl">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
                { id: 'system', label: 'System Default' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id as any)}
                  className={`p-3 rounded-am-card border text-center transition text-xs font-semibold cursor-pointer ${
                    theme === opt.id
                      ? 'border-am-primary bg-am-sand text-am-ink'
                      : 'border-am-border bg-am-surface text-am-ink-muted hover:text-am-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
              Accessibility & Display
            </label>
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-am-input bg-am-surface border border-am-border cursor-pointer">
                <div>
                  <span className="font-semibold text-am-ink block">High Contrast Mode</span>
                  <span className="text-[10px] text-am-ink-muted">Increases border and text distinction (WCAG AAA)</span>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-am-input bg-am-surface border border-am-border cursor-pointer">
                <div>
                  <span className="font-semibold text-am-ink block">Reduced Motion</span>
                  <span className="text-[10px] text-am-ink-muted">Disables animations and transitions</span>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <div className="p-3 rounded-am-input bg-am-surface border border-am-border">
                <span className="font-semibold text-am-ink block mb-1">Text Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTextSize(sz)}
                      className={`py-1.5 rounded-am-input text-xs font-medium border capitalize ${
                        textSize === sz ? 'bg-am-primary text-white border-am-primary' : 'bg-am-surface border-am-border'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PWA Install in Settings */}
          {canInstall && !isStandalone && (
            <div className="p-4 rounded-am-card border border-am-border bg-am-sand/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-am-ink">Install AlmostMine App</h4>
                <p className="text-[11px] text-am-ink-muted">Fast standalone experience on your device</p>
              </div>
              <Button variant="primary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={triggerInstall}>
                Install
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 5. Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="flex flex-col gap-5 max-w-xl">
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink mb-3">
              In-App Notification Alerts
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Booking & Request Updates</span>
                <input
                  type="checkbox"
                  checked={notifBooking}
                  onChange={(e) => {
                    setNotifBooking(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Saved Search Item Alerts</span>
                <input
                  type="checkbox"
                  checked={notifSearches}
                  onChange={(e) => {
                    setNotifSearches(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Wishboard Match Responses</span>
                <input
                  type="checkbox"
                  checked={notifWishes}
                  onChange={(e) => {
                    setNotifWishes(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-am-input bg-am-surface-2 cursor-pointer">
                <span className="font-medium text-am-ink">Review Reminders</span>
                <input
                  type="checkbox"
                  checked={notifReviews}
                  onChange={(e) => {
                    setNotifReviews(e.target.checked);
                    handleFieldChange();
                  }}
                  className="w-4 h-4 rounded-xs accent-am-primary"
                />
              </label>
            </div>
          </div>

          <div className="p-3.5 rounded-am-input bg-am-surface-2 border border-am-border text-xs text-am-ink-muted">
            <span className="font-semibold block mb-0.5">Email Notifications</span>
            Email notifications are not available because no email provider is configured.
          </div>
        </div>
      )}

      {/* 6. Data Tab */}
      {activeTab === 'data' && (
        <div className="flex flex-col gap-5 max-w-xl">
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
              Export Your Data
            </h3>
            <p className="text-xs text-am-ink-muted leading-relaxed">
              Download a complete JSON export of your profile, listings, and requested booking records.
            </p>
            <Button
              variant="secondary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportData}
              className="self-start"
            >
              Export JSON Archive
            </Button>
          </div>
        </div>
      )}

      {/* 7. Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="flex flex-col gap-5 max-w-xl">
          <Select
            label="Preferred Community"
            value={communityId}
            onChange={(e) => {
              setCommunityId(e.target.value);
              handleFieldChange();
            }}
            options={[
              { label: 'Greenfield Eco-Residences, Bengaluru', value: 'comm_greenfield' },
              { label: 'Powai Tech & Campus Enclave, Mumbai', value: 'comm_iitb' },
              { label: 'CyberHub Urban Loft Community, Gurugram', value: 'comm_gurugram' },
            ]}
          />

          <Select
            label="Preferred Date Format"
            value="YYYY-MM-DD"
            onChange={() => {}}
            options={[{ label: 'YYYY-MM-DD (ISO standard)', value: 'YYYY-MM-DD' }]}
          />

          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border text-xs text-am-ink-muted">
            Currency is locked to INR (₹) with Indian numbering format (en-IN).
          </div>
        </div>
      )}

      {/* STICKY SAVE AND DISCARD BAR (when isDirty) */}
      {isDirty && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-xl mx-auto z-40 p-4 rounded-am-card border border-am-primary/30 bg-am-surface shadow-lg flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-am-ink">
            You have unsaved changes
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* Account Deletion Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteUserAccount();
            showToast({ type: 'info', message: 'Account deleted.' });
          } catch (err) {
            console.error('Delete error:', err);
            showToast({ type: 'danger', message: 'Failed to delete account.' });
          } finally {
            setDeleting(false);
          }
        }}
        title="Delete Your Account"
        message="This will permanently delete your private account data, remove your active listings, and anonymize past completed records as 'Deleted user'."
        requiredInputText="DELETE"
        inputPlaceholder="Type DELETE to confirm"
        confirmLabel="Permanently Delete Account"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
};
