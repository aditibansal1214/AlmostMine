import {
  writeBatch,
  doc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateSyntheticMarketplaceData, GeneratedDemoData } from './demoDataGenerator';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export interface SeedProgressCallback {
  (stage: string, percent: number): void;
}

export interface DemoStatusReport {
  isSeeded: boolean;
  demoModeActive: boolean;
  seededAt: string | null;
  counts: {
    users: number;
    publicProfiles: number;
    listings: number;
    lockedDays: number;
    bookings: number;
    completedBookings: number;
    approvedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    rejectedBookings: number;
    reviews: number;
    notifications: number;
    favourites: number;
    savedSearches: number;
    wishes: number;
    publicActivities: number;
  };
}

const BATCH_CHUNK_SIZE = 250; // Below Firestore 500 write limit

export async function seedDemoData(onProgress?: SeedProgressCallback): Promise<DemoStatusReport> {
  onProgress?.('Generating synthetic data models...', 5);
  const data: GeneratedDemoData = generateSyntheticMarketplaceData();

  onProgress?.('Preparing chunked database operations...', 10);

  // Group operations into chunks
  let currentBatch = writeBatch(db);
  let opCount = 0;
  const commitPromises: Array<() => Promise<void>> = [];

  const queueSet = (ref: any, docData: any) => {
    currentBatch.set(ref, docData);
    opCount++;
    if (opCount >= BATCH_CHUNK_SIZE) {
      const batchToCommit = currentBatch;
      commitPromises.push(() => batchToCommit.commit());
      currentBatch = writeBatch(db);
      opCount = 0;
    }
  };

  // 1. Queue 50 Users (Private, Public, and Username)
  for (const u of data.users) {
    const userRef = doc(db, 'users', u.uid);
    queueSet(userRef, {
      uid: u.uid,
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      settings: {
        theme: 'system',
        landing: 'home',
        language: 'en',
        timeZone: 'Asia/Kolkata',
        dateFormat: 'YYYY-MM-DD',
        accessibility: { highContrast: false, reducedMotion: false, textSize: 'medium' },
        notificationPrefs: { bookingUpdates: true, savedSearches: true, wishResponses: true, reviewReminders: true, emailEnabled: false },
        dashboardPrefs: { kpis: ['earned', 'itemsSharing', 'requestsWaiting', 'saved'], widgets: ['nextBestActions', 'recentlyAdded'] },
      },
      onboarding: { done: true, step: 3 },
      isDemo: true,
      dataSource: 'demo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const publicRef = doc(db, 'publicProfiles', u.uid);
    queueSet(publicRef, {
      uid: u.uid,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      locality: u.locality,
      communityId: u.communityId,
      interests: u.interests,
      visibility: { bio: true, locality: true, interests: true, showLastName: false, discoverable: true },
      memberSince: serverTimestamp(),
      deleted: false,
      isDemo: true,
      dataSource: 'demo',
    });

    const usernameRef = doc(db, 'usernames', u.username);
    queueSet(usernameRef, {
      uid: u.uid,
      isDemo: true,
      dataSource: 'demo',
      createdAt: serverTimestamp(),
    });
  }

  // 2. Queue 100 Listings
  for (const l of data.listings) {
    const listRef = doc(db, 'listings', l.id);
    queueSet(listRef, {
      id: l.id,
      ownerId: l.ownerId,
      title: l.title,
      description: l.description,
      category: l.category,
      condition: l.condition,
      replacementValue: l.replacementValue,
      transactionType: l.transactionType,
      pricePerDay: l.pricePerDay,
      minDays: l.minDays,
      maxDays: l.maxDays,
      images: l.images,
      communityId: l.communityId,
      locality: l.locality,
      status: l.status,
      rules: l.rules,
      handover: l.handover,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(l.createdAt),
      updatedAt: Timestamp.fromDate(l.updatedAt),
    });
  }

  // 3. Queue Locked Days
  for (const lock of data.lockedDays) {
    const lockRef = doc(db, 'listings', lock.listingId, 'lockedDays', lock.date);
    queueSet(lockRef, {
      date: lock.date,
      type: lock.type,
      bookingId: lock.bookingId || null,
      ownerId: lock.ownerId,
      isDemo: true,
      dataSource: 'demo',
      createdAt: serverTimestamp(),
    });
  }

  // 4. Queue 200 Bookings and their initial status history
  for (const b of data.bookings) {
    const bRef = doc(db, 'bookings', b.id);
    queueSet(bRef, {
      id: b.id,
      listingId: b.listingId,
      ownerId: b.ownerId,
      borrowerId: b.borrowerId,
      startDate: b.startDate,
      endDate: b.endDate,
      days: b.days,
      transactionType: b.transactionType,
      pricePerDayAtRequest: b.pricePerDayAtRequest,
      agreedTotal: b.agreedTotal,
      commissionPct: b.commissionPct,
      status: b.status,
      wouldHaveBought: b.wouldHaveBought,
      borrowerMessage: b.borrowerMessage,
      rejectionReason: b.rejectionReason || null,
      cancelReason: b.cancelReason || null,
      cancelledBy: b.cancelledBy || null,
      lateCancellation: b.lateCancellation,
      hoursToRespond: b.hoursToRespond,
      leadTimeDays: b.leadTimeDays,
      tripLengthDays: b.tripLengthDays,
      priceBand: b.priceBand,
      listingSnapshot: b.listingSnapshot,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(b.createdAt),
      respondedAt: b.respondedAt ? Timestamp.fromDate(b.respondedAt) : null,
      approvedAt: b.approvedAt ? Timestamp.fromDate(b.approvedAt) : null,
      completedAt: b.completedAt ? Timestamp.fromDate(b.completedAt) : null,
      updatedAt: serverTimestamp(),
    });

    const histRef = doc(db, 'bookings', b.id, 'statusHistory', 'evt_init');
    queueSet(histRef, {
      fromStatus: null,
      toStatus: b.status,
      actorUid: b.borrowerId,
      note: 'Synthetic historical status',
      at: Timestamp.fromDate(b.createdAt),
      isDemo: true,
      dataSource: 'demo',
    });
  }

  // 5. Queue 80 Reviews
  for (const r of data.reviews) {
    const rRef = doc(db, 'reviews', r.id);
    queueSet(rRef, {
      bookingId: r.bookingId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      rating: r.rating,
      text: r.text,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(r.createdAt),
    });
  }

  // 6. Queue 150 Notifications
  for (const n of data.notifications) {
    const nRef = doc(db, 'notifications', n.id);
    queueSet(nRef, {
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
      read: n.read,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(n.createdAt),
    });
  }

  // 7. Queue 100 Favourites
  for (const f of data.favourites) {
    const fRef = doc(db, 'favourites', f.id);
    queueSet(fRef, {
      userId: f.userId,
      listingId: f.listingId,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(f.createdAt),
    });
  }

  // 8. Queue 30 Saved Searches
  for (const s of data.savedSearches) {
    const sRef = doc(db, 'savedSearches', s.id);
    queueSet(sRef, {
      userId: s.userId,
      query: s.query,
      category: s.category || null,
      maxPrice: s.maxPrice || null,
      lastCheckedAt: Timestamp.fromDate(s.createdAt),
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(s.createdAt),
    });
  }

  // 9. Queue 50 Wishes
  for (const w of data.wishes) {
    const wRef = doc(db, 'wishes', w.id);
    queueSet(wRef, {
      id: w.id,
      requesterId: w.requesterId,
      requesterName: w.requesterName,
      itemName: w.itemName,
      category: w.category,
      neededFrom: w.neededFrom,
      neededTo: w.neededTo,
      maxBudgetPerDay: w.maxBudgetPerDay,
      communityId: w.communityId,
      status: w.status,
      isDemo: true,
      dataSource: 'demo',
      createdAt: Timestamp.fromDate(w.createdAt),
      updatedAt: Timestamp.fromDate(w.createdAt),
    });
  }

  // 10. Queue Public Activities
  for (const pa of data.publicActivities) {
    const paRef = doc(db, 'publicActivity', pa.id);
    queueSet(paRef, {
      type: pa.type,
      subjectUid: pa.subjectUid,
      otherUid: pa.otherUid,
      listingId: pa.listingId,
      category: pa.category,
      communityId: pa.communityId,
      bookingId: pa.bookingId,
      hoursToRespond: pa.hoursToRespond || null,
      isDemo: true,
      dataSource: 'demo',
      at: Timestamp.fromDate(pa.at),
    });
  }

  // Final remaining operations in current batch
  if (opCount > 0) {
    const lastBatch = currentBatch;
    commitPromises.push(() => lastBatch.commit());
  }

  // Execute chunked batches sequentially to prevent overwhelming network/Firestore
  const totalBatches = commitPromises.length;
  onProgress?.(`Writing ${totalBatches} transactional batches to Firestore...`, 20);

  for (let idx = 0; idx < totalBatches; idx++) {
    await commitPromises[idx]();
    const percent = Math.round(20 + ((idx + 1) / totalBatches) * 70);
    onProgress?.(`Committed batch ${idx + 1} of ${totalBatches}...`, percent);
  }

  // Update appConfig/global
  onProgress?.('Updating global marketplace configuration...', 95);
  await setDoc(doc(db, 'appConfig', 'global'), {
    showDemoListings: true,
    demoModeActive: true,
    commissionPct: 0.08,
    zeroBookingThresholdDays: 14,
    demoSeededAt: serverTimestamp(),
  });

  // Track demo batch
  await setDoc(doc(db, 'demoBatches', 'batch_001'), {
    batchId: 'batch_001',
    seededAt: new Date().toISOString(),
    itemCount: data.listings.length,
    bookingCount: data.bookings.length,
    userCount: data.users.length,
    isDemo: true,
    dataSource: 'demo',
  });

  onProgress?.('Complete! Verifying seeded status...', 100);
  return getDemoDataStatus();
}

/**
 * Retrieves counts and validation metrics for demo data vs live records
 */
export async function getDemoDataStatus(): Promise<DemoStatusReport> {
  try {
    const qUsers = query(collection(db, 'publicProfiles'), where('dataSource', '==', 'demo'));
    const qListings = query(collection(db, 'listings'), where('dataSource', '==', 'demo'));
    const qBookings = query(collection(db, 'bookings'), where('dataSource', '==', 'demo'));
    const qReviews = query(collection(db, 'reviews'), where('dataSource', '==', 'demo'));
    const qNotifs = query(collection(db, 'notifications'), where('dataSource', '==', 'demo'));
    const qFavs = query(collection(db, 'favourites'), where('dataSource', '==', 'demo'));
    const qSearches = query(collection(db, 'savedSearches'), where('dataSource', '==', 'demo'));
    const qWishes = query(collection(db, 'wishes'), where('dataSource', '==', 'demo'));
    const qActivities = query(collection(db, 'publicActivity'), where('dataSource', '==', 'demo'));

    const [
      snapUsers,
      snapListings,
      snapBookings,
      snapReviews,
      snapNotifs,
      snapFavs,
      snapSearches,
      snapWishes,
      snapActivities,
    ] = await Promise.all([
      getDocs(qUsers),
      getDocs(qListings),
      getDocs(qBookings),
      getDocs(qReviews),
      getDocs(qNotifs),
      getDocs(qFavs),
      getDocs(qSearches),
      getDocs(qWishes),
      getDocs(qActivities),
    ]);

    let completedBookings = 0;
    let approvedBookings = 0;
    let pendingBookings = 0;
    let cancelledBookings = 0;
    let rejectedBookings = 0;

    snapBookings.forEach((d) => {
      const data = d.data();
      if (data.status === 'completed') completedBookings++;
      else if (data.status === 'approved') approvedBookings++;
      else if (data.status === 'pending') pendingBookings++;
      else if (data.status === 'cancelled') cancelledBookings++;
      else if (data.status === 'rejected') rejectedBookings++;
    });

    const isSeeded = snapListings.size >= 10;

    return {
      isSeeded,
      demoModeActive: true,
      seededAt: isSeeded ? new Date().toISOString() : null,
      counts: {
        users: snapUsers.size,
        publicProfiles: snapUsers.size,
        listings: snapListings.size,
        lockedDays: approvedBookings * 3, // approximate dates locked
        bookings: snapBookings.size,
        completedBookings,
        approvedBookings,
        pendingBookings,
        cancelledBookings,
        rejectedBookings,
        reviews: snapReviews.size,
        notifications: snapNotifs.size,
        favourites: snapFavs.size,
        savedSearches: snapSearches.size,
        wishes: snapWishes.size,
        publicActivities: snapActivities.size,
      },
    };
  } catch (err) {
    console.error('Error fetching demo data status:', err);
    return {
      isSeeded: false,
      demoModeActive: false,
      seededAt: null,
      counts: {
        users: 0,
        publicProfiles: 0,
        listings: 0,
        lockedDays: 0,
        bookings: 0,
        completedBookings: 0,
        approvedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        rejectedBookings: 0,
        reviews: 0,
        notifications: 0,
        favourites: 0,
        savedSearches: 0,
        wishes: 0,
        publicActivities: 0,
      },
    };
  }
}

/**
 * Resets ONLY demo data records without touching any live user records
 */
export async function resetDemoData(onProgress?: SeedProgressCallback): Promise<void> {
  onProgress?.('Identifying demo records for safe removal...', 10);

  const collectionsToClean = [
    'listings',
    'bookings',
    'reviews',
    'notifications',
    'favourites',
    'savedSearches',
    'wishes',
    'publicActivity',
    'users',
    'publicProfiles',
    'usernames',
  ];

  let totalDeleted = 0;

  for (let cIdx = 0; cIdx < collectionsToClean.length; cIdx++) {
    const colName = collectionsToClean[cIdx];
    const qDemo = query(collection(db, colName), where('dataSource', '==', 'demo'));
    const snap = await getDocs(qDemo);

    if (!snap.empty) {
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        count++;
        totalDeleted++;
        if (count >= BATCH_CHUNK_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }

    const pct = Math.round(10 + ((cIdx + 1) / collectionsToClean.length) * 80);
    onProgress?.(`Cleaned demo ${colName}...`, pct);
  }

  // Also clean demoBatches
  const batchSnap = await getDocs(collection(db, 'demoBatches'));
  if (!batchSnap.empty) {
    const batch = writeBatch(db);
    batchSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Update appConfig/global
  await setDoc(doc(db, 'appConfig', 'global'), {
    showDemoListings: false,
    demoModeActive: false,
    demoResetAt: serverTimestamp(),
  });

  onProgress?.(`Reset completed. Safely removed ${totalDeleted} demo records. Real data intact.`, 100);
}
