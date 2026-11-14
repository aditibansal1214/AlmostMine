import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, runTransaction, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isTokenServiceDisabledError } from './firebase';
import { UserPrivate, PublicProfile, UserSettings } from '../domain/types';
import { handleFirestoreError, OperationType } from './firestoreErrors';

interface AuthContextType {
  currentUser: User | null;
  userPrivate: UserPrivate | null;
  publicProfile: PublicProfile | null;
  loading: boolean;
  tokenServiceDisabled: boolean;
  continueAsGuest: () => Promise<void>;
  verifyTokenHealth: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPrivate: (data: Partial<UserPrivate>) => Promise<void>;
  updatePublicProfile: (data: Partial<PublicProfile>) => Promise<void>;
  updateFullProfile: (profileData: {
    displayName: string;
    username: string;
    firstName: string;
    lastName: string;
    bio?: string;
    locality?: string;
    communityId?: string;
    interests?: string[];
    phone?: string;
    avatarUrl?: string;
    visibility?: PublicProfile['visibility'];
  }) => Promise<void>;
  completeOnboarding: (communityId: string, interests: string[]) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  landing: 'home',
  language: 'en',
  timeZone: 'Asia/Kolkata',
  dateFormat: 'YYYY-MM-DD',
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    textSize: 'medium',
  },
  notificationPrefs: {
    bookingUpdates: true,
    savedSearches: true,
    wishResponses: true,
    reviewReminders: true,
    emailEnabled: false,
  },
  dashboardPrefs: {
    kpis: ['earned', 'itemsSharing', 'requestsWaiting', 'saved'],
    widgets: ['nextBestActions', 'recentlyAdded'],
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenServiceDisabled, setTokenServiceDisabled] = useState(false);

  // Check redirect result on mobile PWA mount
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.warn('Redirect sign-in check notice:', err);
    });
  }, []);

  const continueAsGuest = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserPrivate(null);
      setPublicProfile(null);
      setTokenServiceDisabled(false);
    } catch (err) {
      console.warn('Guest mode switch notice:', err);
    }
  };

  const verifyTokenHealth = async (): Promise<boolean> => {
    try {
      const apiKey = auth.config.apiKey;
      const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=test',
      });
      const data = await res.json();
      if (data?.error?.message?.includes('Token Service API has not been used') || data?.error?.message?.includes('disabled')) {
        setTokenServiceDisabled(true);
        return false;
      }
      // If error is INVALID_REFRESH_TOKEN or similar, the API is fully enabled and ready!
      setTokenServiceDisabled(false);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setUserPrivate(null);
        setPublicProfile(null);
        setLoading(false);
        setTokenServiceDisabled(false);
        return;
      }

      // Check if user's token is functional or if Secure Token API is disabled on GCP
      let isTokenValid = true;
      try {
        await user.getIdToken();
        setTokenServiceDisabled(false);
      } catch (tokErr: any) {
        if (isTokenServiceDisabledError(tokErr)) {
          isTokenValid = false;
          setTokenServiceDisabled(true);
          console.warn(
            'Token Service API (securetoken.googleapis.com) is disabled on Google Cloud project 412108184439. Visit https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=412108184439 to enable it.'
          );
        }
      }

      // If token service is disabled on GCP, immediately sign out to clear broken credentials from Auth & IndexedDB
      // This prevents Firestore from dropping into offline mode and allows public marketplace queries to work seamlessly.
      if (!isTokenValid) {
        await signOut(auth);
        setCurrentUser(null);
        setUserPrivate(null);
        setPublicProfile(null);
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Check if userPrivate document exists
      const userRef = doc(db, 'users', user.uid);
      const publicRef = doc(db, 'publicProfiles', user.uid);

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // First login: create users/{uid} and publicProfiles/{uid}
          const names = (user.displayName || 'Member').split(' ');
          const firstName = names[0] || 'Member';
          const lastName = names.slice(1).join(' ') || '';
          const baseUsername = (user.email ? user.email.split('@')[0] : 'user')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 15) || 'member';
          const uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;

          const newPrivate: UserPrivate = {
            uid: user.uid,
            email: user.email,
            phone: user.phoneNumber,
            firstName,
            lastName,
            settings: DEFAULT_SETTINGS,
            onboarding: { done: false, step: 1 },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const newPublic: PublicProfile = {
            uid: user.uid,
            displayName: user.displayName || firstName,
            username: uniqueUsername,
            avatarUrl: user.photoURL || '',
            bio: '',
            locality: 'Bengaluru',
            communityId: 'comm_greenfield',
            interests: [],
            visibility: {
              bio: true,
              locality: true,
              interests: true,
              showLastName: false,
              discoverable: true,
            },
            memberSince: serverTimestamp(),
            deleted: false,
          };

          // Reserve username and create docs
          await runTransaction(db, async (txn) => {
            const usernameRef = doc(db, 'usernames', uniqueUsername);
            txn.set(usernameRef, { uid: user.uid, createdAt: serverTimestamp() });
            txn.set(userRef, newPrivate);
            txn.set(publicRef, newPublic);
          });
        }
      } catch (err: any) {
        if (isTokenServiceDisabledError(err)) {
          setTokenServiceDisabled(true);
        } else if (err?.message?.includes('offline')) {
          console.warn('User profile check deferred: Firestore client is offline.');
        } else {
          console.error('Error initializing user profile on first login:', err);
        }
      }

      // Realtime listener for private profile
      const unsubPrivate = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUserPrivate(docSnap.data() as UserPrivate);
          }
        },
        (error) => {
          if (isTokenServiceDisabledError(error)) {
            setTokenServiceDisabled(true);
          } else if (error.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          } else {
            console.warn('Notice from users snapshot listener:', error.message);
          }
        }
      );

      // Realtime listener for public profile
      const unsubPublic = onSnapshot(
        publicRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setPublicProfile(docSnap.data() as PublicProfile);
          }
          setLoading(false);
        },
        (error) => {
          if (isTokenServiceDisabledError(error)) {
            setTokenServiceDisabled(true);
          } else if (error.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.GET, `publicProfiles/${user.uid}`);
          } else {
            console.warn('Notice from publicProfiles snapshot listener:', error.message);
          }
          setLoading(false);
        }
      );

      return () => {
        unsubPrivate();
        unsubPublic();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    // Check if on mobile standalone or small screen to choose redirect vs popup
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isMobile && isStandalone) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err) {
        console.warn('Redirect sign-in failed, attempting popup fallback:', err);
        await signInWithPopup(auth, googleProvider);
      }
    } else {
      try {
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user) {
          try {
            await res.user.getIdToken(true);
            setTokenServiceDisabled(false);
          } catch (tokErr) {
            if (isTokenServiceDisabledError(tokErr)) {
              setTokenServiceDisabled(true);
              await signOut(auth);
              throw new Error(
                'Google Cloud Token Service API (securetoken.googleapis.com) is disabled on project 412108184439. Please enable it in Google Cloud Console before signing in.'
              );
            }
          }
        }
      } catch (err: any) {
        if (err?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
        } else if (isTokenServiceDisabledError(err)) {
          setTokenServiceDisabled(true);
          await signOut(auth);
        } else {
          throw err;
        }
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setTokenServiceDisabled(false);
  };

  const updateUserPrivate = async (data: Partial<UserPrivate>) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updatePublicProfile = async (data: Partial<PublicProfile>) => {
    if (!currentUser) return;
    try {
      const publicRef = doc(db, 'publicProfiles', currentUser.uid);
      await updateDoc(publicRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${currentUser.uid}`);
    }
  };

  const updateFullProfile = async (profileData: {
    displayName: string;
    username: string;
    firstName: string;
    lastName: string;
    bio?: string;
    locality?: string;
    communityId?: string;
    interests?: string[];
    phone?: string;
    avatarUrl?: string;
    visibility?: PublicProfile['visibility'];
  }) => {
    if (!currentUser) return;
    const cleanUsername = profileData.username.toLowerCase().trim();
    const currentUsername = publicProfile?.username;

    await runTransaction(db, async (txn) => {
      // If username changed, reserve new username
      if (cleanUsername !== currentUsername) {
        const newUsernameRef = doc(db, 'usernames', cleanUsername);
        const newUsernameSnap = await txn.get(newUsernameRef);
        if (newUsernameSnap.exists()) {
          throw new Error('This username is already taken. Please choose another.');
        }
        txn.set(newUsernameRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const publicRef = doc(db, 'publicProfiles', currentUser.uid);

      txn.update(userRef, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone || null,
        updatedAt: serverTimestamp(),
      });

      txn.update(publicRef, {
        displayName: profileData.displayName,
        username: cleanUsername,
        bio: profileData.bio || '',
        locality: profileData.locality || '',
        communityId: profileData.communityId || 'comm_greenfield',
        interests: profileData.interests || [],
        avatarUrl: profileData.avatarUrl !== undefined ? profileData.avatarUrl : publicProfile?.avatarUrl || '',
        visibility: profileData.visibility || publicProfile?.visibility,
        updatedAt: serverTimestamp(),
      });
    });
  };

  const completeOnboarding = async (communityId: string, interests: string[]) => {
    if (!currentUser) return;
    await updatePublicProfile({ communityId, interests });
    await updateUserPrivate({ onboarding: { done: true, step: 3 } });
  };

  const deleteUserAccount = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    // Anonymise public profile, delete private user doc
    const publicRef = doc(db, 'publicProfiles', uid);
    const userRef = doc(db, 'users', uid);

    await updateDoc(publicRef, {
      displayName: 'Deleted User',
      bio: '',
      locality: '',
      avatarUrl: '',
      deleted: true,
      updatedAt: serverTimestamp(),
    });

    await setDoc(userRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    });

    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userPrivate,
        publicProfile,
        loading,
        tokenServiceDisabled,
        continueAsGuest,
        verifyTokenHealth,
        signInWithGoogle,
        logout,
        updateUserPrivate,
        updatePublicProfile,
        updateFullProfile,
        completeOnboarding,
        deleteUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
