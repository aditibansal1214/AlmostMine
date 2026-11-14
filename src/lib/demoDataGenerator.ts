import { Category, ItemCondition, TransactionType, BookingStatus } from '../domain/types';

export interface GeneratedDemoData {
  users: Array<{
    uid: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    bio: string;
    locality: string;
    communityId: string;
    interests: Category[];
  }>;
  listings: Array<{
    id: string;
    ownerId: string;
    title: string;
    description: string;
    category: Category;
    condition: ItemCondition;
    replacementValue: number;
    transactionType: TransactionType;
    pricePerDay: number;
    minDays: number;
    maxDays: number;
    images: string[];
    communityId: string;
    locality: string;
    status: 'active' | 'paused' | 'draft';
    rules: string;
    handover: string;
    createdAt: Date;
    updatedAt: Date;
    // For analytics testing:
    viewsCount: number;
    requestsCount: number;
  }>;
  bookings: Array<{
    id: string;
    listingId: string;
    ownerId: string;
    borrowerId: string;
    startDate: string;
    endDate: string;
    days: number;
    transactionType: TransactionType;
    pricePerDayAtRequest: number;
    agreedTotal: number;
    commissionPct: number;
    status: BookingStatus;
    wouldHaveBought: 'yes' | 'no' | 'maybe';
    borrowerMessage: string;
    rejectionReason?: string;
    cancelReason?: string;
    cancelledBy?: string;
    lateCancellation: boolean;
    hoursToRespond: number;
    leadTimeDays: number;
    tripLengthDays: number;
    priceBand: 'low' | 'mid' | 'high' | 'premium';
    createdAt: Date;
    respondedAt?: Date;
    approvedAt?: Date;
    completedAt?: Date;
    listingSnapshot: {
      title: string;
      image: string;
      category: Category;
      replacementValue: number;
    };
  }>;
  lockedDays: Array<{
    listingId: string;
    date: string;
    type: 'booking' | 'blocked';
    bookingId?: string;
    ownerId: string;
  }>;
  reviews: Array<{
    id: string;
    bookingId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    text: string;
    createdAt: Date;
  }>;
  notifications: Array<{
    id: string;
    recipientId: string;
    title: string;
    message: string;
    type: 'booking' | 'saved_search' | 'wish' | 'review' | 'system';
    link: string;
    read: boolean;
    createdAt: Date;
  }>;
  favourites: Array<{
    id: string;
    userId: string;
    listingId: string;
    createdAt: Date;
  }>;
  savedSearches: Array<{
    id: string;
    userId: string;
    query: string;
    category?: Category;
    maxPrice?: number;
    createdAt: Date;
  }>;
  wishes: Array<{
    id: string;
    requesterId: string;
    requesterName: string;
    itemName: string;
    category: Category;
    neededFrom: string;
    neededTo: string;
    maxBudgetPerDay: number;
    communityId: string;
    status: 'open' | 'fulfilled' | 'closed';
    createdAt: Date;
  }>;
  publicActivities: Array<{
    id: string;
    type: 'request_created' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' | 'booking_completed';
    subjectUid: string;
    otherUid: string;
    listingId: string;
    category: Category;
    communityId: string;
    bookingId: string;
    hoursToRespond?: number;
    at: Date;
  }>;
}

// Seeded pseudorandom generator for deterministic reproducibility
class SeededRandom {
  private seed: number;
  constructor(seed = 123456789) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

export function generateSyntheticMarketplaceData(): GeneratedDemoData {
  const rng = new SeededRandom(42070);

  const communities = [
    { id: 'comm_greenfield', name: 'Greenfield Eco-Residences', locality: 'Sarjapur, Bengaluru' },
    { id: 'comm_iitb', name: 'Powai Tech & Campus Enclave', locality: 'Powai, Mumbai' },
    { id: 'comm_gurugram', name: 'CyberHub Urban Loft Community', locality: 'DLF Phase 2, Gurugram' },
  ];

  const firstNames = [
    'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Kabir', 'Tanvi', 'Siddharth', 'Pooja',
    'Aditya', 'Rhea', 'Arjun', 'Diya', 'Karan', 'Isha', 'Varun', 'Shreya', 'Dev', 'Meera',
    'Nikhil', 'Simran', 'Akash', 'Kavya', 'Rahul', 'Sneha', 'Manish', 'Ritika', 'Gaurav', 'Aditi',
    'Sameer', 'Natasha', 'Kunal', 'Zoya', 'Pranav', 'Payal', 'Harsh', 'Anushka', 'Rajat', 'Bhavna',
    'Tarun', 'Deepika', 'Aman', 'Sanya', 'Mohit', 'Juhi', 'Yash', 'Shruti', 'Vivek', 'Maya'
  ];

  const lastNames = [
    'Sharma', 'Iyer', 'Mehta', 'Nair', 'Patel', 'Deshmukh', 'Sen', 'Verma', 'Rao', 'Kulkarni',
    'Joshi', 'Kapoor', 'Reddy', 'Banerjee', 'Singhania', 'Menon', 'Chopra', 'Bhatia', 'Gupta', 'Dutta'
  ];

  const categories: Category[] = [
    'Cameras and creator gear',
    'Travel and luggage',
    'Tools and DIY',
    'Kitchen and appliances',
    'Party and event supplies',
    'Sports and outdoor',
    'Books and study',
    'Electronics and gadgets',
    'Furniture and decor',
    'Musical instruments',
    'Kids and baby',
    'Other'
  ];

  // 1. GENERATE 50 USERS
  const users: GeneratedDemoData['users'] = [];
  for (let i = 1; i <= 50; i++) {
    const fName = firstNames[(i - 1) % firstNames.length];
    const lName = lastNames[(i - 1) % lastNames.length];
    const uid = `demo_user_${String(i).padStart(2, '0')}`;
    const username = `${fName.toLowerCase()}_${lName.toLowerCase().slice(0, 3)}_${i}`;
    const comm = communities[i % communities.length];

    // High resolution SVG avatar data URL
    const svgAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%231F4D3A"/><text x="50" y="58" font-size="34" font-family="sans-serif" font-weight="600" fill="%23FFFFFF" text-anchor="middle">${fName[0]}${lName[0]}</text></svg>`;

    users.push({
      uid,
      email: `${username}@demo.almostmine.in`,
      phone: `+91 98${rng.int(10000000, 99999999)}`,
      firstName: fName,
      lastName: lName,
      displayName: `${fName} ${lName}`,
      username,
      avatarUrl: svgAvatar,
      bio: `Community member at ${comm.name}. Sharing quality gear and supporting peer reuse.`,
      locality: comm.locality,
      communityId: comm.id,
      interests: [categories[i % categories.length], categories[(i + 3) % categories.length]],
    });
  }

  // 2. GENERATE 100 LISTINGS ACROSS ALL CATEGORIES
  const listingTemplates: Array<{
    title: string;
    category: Category;
    price: number;
    value: number;
    desc: string;
  }> = [
    // Cameras & Creator Gear (Unmet demand cluster)
    { title: 'Sony Alpha A7 IV Full-Frame Camera', category: 'Cameras and creator gear', price: 1200, value: 210000, desc: '33MP full-frame hybrid camera with 28-70mm lens, 2 batteries, and 128GB high speed SD card.' },
    { title: 'DJI Mini 3 Pro Drone with Smart Controller', category: 'Cameras and creator gear', price: 950, value: 85000, desc: 'Sub-249g 4K drone with obstacle avoidance, 3 intelligent batteries, and ND filter set.' },
    { title: 'Rode Wireless PRO Dual Microphone Kit', category: 'Cameras and creator gear', price: 400, value: 38000, desc: 'Compact dual-channel wireless mic kit with 32-bit float on-board recording.' },
    { title: 'GoPro HERO 11 Black Creator Bundle', category: 'Cameras and creator gear', price: 500, value: 45000, desc: '5.3K60 video, Volta battery grip, Media Mod, Light Mod, and waterproof housing.' },
    { title: 'Sigma 24-70mm f/2.8 DG DN Art Lens for Sony', category: 'Cameras and creator gear', price: 650, value: 95000, desc: 'Standard fast zoom lens, pristine glass, lens hood, and padded pouch.' },
    { title: 'Aputure Amaran 200d LED Studio Light with Softbox', category: 'Cameras and creator gear', price: 450, value: 32000, desc: '200W daylight point-source LED, Bowens mount softbox, and heavy-duty light stand.' },
    { title: 'Zhiyun Crane 2S 3-Axis Gimbal Stabilizer', category: 'Cameras and creator gear', price: 500, value: 48000, desc: 'Professional camera stabilizer capable of carrying full-size cinema and mirrorless setups.' },
    { title: 'Shure SM7B Dynamic Cardioid Vocal Microphone', category: 'Cameras and creator gear', price: 400, value: 36000, desc: 'Industry-standard broadcast mic with Cloudlifter CL-1 preamp included.' },

    // Travel & Luggage
    { title: 'Samsonite Evocube 28" Hardside Spinner Suitcase', category: 'Travel and luggage', price: 300, value: 24000, desc: 'Ultra-light polycarbonate luggage with TSA combination lock and 360 dual wheels.' },
    { title: 'Osprey Farpoint 40L Travel Carry-On Backpack', category: 'Travel and luggage', price: 200, value: 16000, desc: 'Airline-compliant carry-on backpack with stowaway harness and padded laptop sleeve.' },
    { title: 'Thule Motion XT XL Roof Cargo Box (500L)', category: 'Travel and luggage', price: 800, value: 85000, desc: 'Aerodynamic roof box with DualSide opening and PowerClick quick-mount system.' },
    { title: 'Quechua 4-Person Fresh & Black Family Camping Tent', category: 'Travel and luggage', price: 350, value: 18000, desc: 'Patented heat-reflecting fabric tent with spacious living area and ground stakes.' },
    { title: 'Delsey Paris Chatelet Air 21" International Carry-on', category: 'Travel and luggage', price: 250, value: 28000, desc: 'Classic French styling with brake system, vegan leather accents, and laundry bag.' },

    // Tools & DIY (Unmet demand cluster)
    { title: 'Bosch Professional GSB 600W Impact Drill Kit', category: 'Tools and DIY', price: 200, value: 6500, desc: 'Heavy duty drill with masonry, wood, and metal bit set in rugged carrying case.' },
    { title: 'DeWalt 20V MAX Cordless Circular Saw (7-1/4")', category: 'Tools and DIY', price: 400, value: 22000, desc: 'Brushless motor cordless saw with two 5.0Ah batteries, fast charger, and carbide blade.' },
    { title: 'Stanley 110-Piece Mechanics Tool & Socket Set', category: 'Tools and DIY', price: 180, value: 9500, desc: 'Complete chrome vanadium socket set, ratchets, and hex keys for home and vehicle maintenance.' },
    { title: 'Kärcher K2 Universal High-Pressure Washer', category: 'Tools and DIY', price: 350, value: 14000, desc: '110 bar pressure washer for car wash, balcony cleaning, and patio detailing.' },
    { title: 'Black+Decker 1800W Dual Temperature Heat Gun', category: 'Tools and DIY', price: 120, value: 3500, desc: 'Precision heat gun for paint stripping, pipe bending, and vinyl wrapping.' },
    { title: 'Bosch UniversalLevel 360 Cross Line Laser', category: 'Tools and DIY', price: 250, value: 15000, desc: 'Self-leveling 360 degree horizontal line with 120 degree vertical line and tripod.' },

    // Kitchen & Appliances (Excess supply cluster)
    { title: 'Philips Digital Air Fryer XXL (7.2L with Wi-Fi)', category: 'Kitchen and appliances', price: 220, value: 17000, desc: 'Rapid CombiAir technology airfryer with baking basket and recipe presets.' },
    { title: 'KitchenAid Artisan 4.8L Stand Mixer (Empire Red)', category: 'Kitchen and appliances', price: 550, value: 58000, desc: 'Classic 10-speed mixer with dough hook, wire whisk, and flat beater attachments.' },
    { title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker', category: 'Kitchen and appliances', price: 180, value: 11000, desc: 'Pressure cooker, slow cooker, rice cooker, steamer, yogurt maker, and warmer.' },
    { title: 'Wonderchef Regalia Espresso Coffee Machine (15 Bar)', category: 'Kitchen and appliances', price: 200, value: 12000, desc: 'Italian 15-bar pump espresso maker with steam wand for cappuccino and latte.' },
    { title: 'Morphy Richards 5-Tier Food Dehydrator', category: 'Kitchen and appliances', price: 150, value: 7500, desc: 'Adjustable thermostat dehydrator for making dried fruit snacks and herbs.' },

    // Party & Event Supplies (Excess supply cluster)
    { title: 'JBL PartyBox 310 Portable Bluetooth Speaker (240W)', category: 'Party and event supplies', price: 700, value: 42000, desc: 'Gigantic JBL Pro sound with dynamic light show, dual mic inputs, and 18h battery.' },
    { title: 'BenQ TH585P Full HD 3500-Lumen Projector', category: 'Party and event supplies', price: 600, value: 55000, desc: 'Low input lag entertainment projector with 100-inch portable tripod screen.' },
    { title: 'Chafing Dish Stainless Steel Buffet Warmer Set (3-Pack)', category: 'Party and event supplies', price: 250, value: 12000, desc: '9-liter food warmers with water pans, food pans, and fuel holders for celebrations.' },
    { title: 'Chauvet DJ Hurricane 700 Compact Fog Machine', category: 'Party and event supplies', price: 180, value: 6500, desc: 'Water-based smoke machine with wireless remote and 1L fog fluid bottle.' },
    { title: 'Cotton Candy Machine with Dome Cover & Sticks', category: 'Party and event supplies', price: 200, value: 8500, desc: 'Electric commercial-grade fairy floss maker for kids birthdays and carnivals.' },

    // Sports & Outdoor
    { title: 'Decathlon Itiwit Inflatable 2-Person Touring Kayak', category: 'Sports and outdoor', price: 450, value: 28000, desc: 'Drop-stitch high pressure floor kayak with two double paddles, pump, and carry bag.' },
    { title: 'Trek Marlin 7 Gen 3 Hardtail Mountain Bike (Large)', category: 'Sports and outdoor', price: 500, value: 68000, desc: 'RockShox suspension fork, 1x10 Shimano Deore drivetrain, and hydraulic disc brakes.' },
    { title: 'Yonex Astrox 99 Pro Badminton Rackets (Pair)', category: 'Sports and outdoor', price: 180, value: 18000, desc: 'Head-heavy offensive rackets strung with BG65 at 26 lbs, full thermal covers.' },
    { title: 'Coleman Triton 2-Burner Propane Camping Stove', category: 'Sports and outdoor', price: 160, value: 9500, desc: '20,000 total BTUs of cooking power with WindBlock shielding.' },

    // Electronics & Gadgets
    { title: 'Meta Quest 2 128GB All-In-One VR Headset', category: 'Electronics and gadgets', price: 450, value: 34000, desc: 'Virtual reality headset with Touch controllers, Elite comfort strap, and silicon cover.' },
    { title: 'Apple iPad Air 10.9" M2 with Apple Pencil USB-C', category: 'Electronics and gadgets', price: 500, value: 64000, desc: 'Liquid Retina display, M2 silicon, 128GB storage, and protective folio stand.' },
    { title: 'Nintendo Switch OLED Model (Neon Blue/Red)', category: 'Electronics and gadgets', price: 400, value: 32000, desc: 'Vibrant 7-inch OLED screen, dock, 2 Joy-Cons, and Mario Kart 8 Deluxe.' },
    { title: 'Anker 737 Power Bank (PowerCore 24K, 140W Output)', category: 'Electronics and gadgets', price: 150, value: 14000, desc: 'Ultra-powerful two-way fast charging battery bank capable of charging laptops.' },
    { title: 'Bose QuietComfort 45 Wireless Noise-Cancelling Headphones', category: 'Electronics and gadgets', price: 300, value: 29000, desc: 'World-class active noise cancellation with 24 hours battery and audio cable.' },

    // Books & Study
    { title: 'Introduction to Algorithms (CLRS 4th Edition Hardcover)', category: 'Books and study', price: 60, value: 4500, desc: 'The definitive textbook on data structures, graph theory, and modern algorithm design.' },
    { title: 'System Design Interview Volumes 1 & 2 by Alex Xu', category: 'Books and study', price: 50, value: 3800, desc: 'Step-by-step guides for designing large-scale distributed tech architectures.' },
    { title: 'Sapiens & Homo Deus Graphic Edition Set by Harari', category: 'Books and study', price: 40, value: 2800, desc: 'Illustrated storytelling covering human history, biology, and the future of species.' },

    // Musical Instruments
    { title: 'Yamaha F310 Acoustic Guitar with Gig Bag & Capo', category: 'Musical instruments', price: 180, value: 11500, desc: 'Dreadnought acoustic guitar with spruce top, fresh D’Addario strings, and digital tuner.' },
    { title: 'Roland GO:KEYS 61-Key Music Keyboard Synthesizer', category: 'Musical instruments', price: 350, value: 28000, desc: 'Portable piano keyboard with Bluetooth audio/MIDI and built-in loop mix functions.' }
  ];

  const listings: GeneratedDemoData['listings'] = [];
  const baseDate = new Date('2026-11-01T12:00:00Z');

  for (let i = 1; i <= 100; i++) {
    const tmpl = listingTemplates[(i - 1) % listingTemplates.length];
    const owner = users[(i - 1) % users.length];
    const id = `demo_listing_${String(i).padStart(3, '0')}`;

    // Stagger listing creation across the last 180 days
    const createdDaysAgo = rng.int(10, 180);
    const createdAt = new Date(baseDate.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000);

    // Intentional variations for analytics:
    // Item 95-100 are overpriced zero-booking listings (R-PRICE-HIGH)
    let price = tmpl.price;
    if (i >= 95) {
      price = Math.round(tmpl.price * 2.8); // excessive price to trigger zero requests
    }

    // High resolution placeholder SVG image matching category theme
    const imageSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450"><rect width="600" height="450" fill="%23F3EEE5"/><rect x="20" y="20" width="560" height="410" rx="16" fill="%23FFFFFF" stroke="%23E2DACB" stroke-width="2"/><circle cx="300" cy="180" r="70" fill="%231F4D3A" fill-opacity="0.15"/><text x="300" y="195" font-size="44" font-family="sans-serif" font-weight="bold" fill="%231F4D3A" text-anchor="middle">AM</text><text x="300" y="300" font-size="20" font-family="sans-serif" font-weight="600" fill="%231E2A24" text-anchor="middle">${tmpl.title.split(' ').slice(0, 4).join(' ')}</text><text x="300" y="335" font-size="14" font-family="sans-serif" fill="%235B665F" text-anchor="middle">${tmpl.category}</text><text x="300" y="375" font-size="16" font-family="sans-serif" font-weight="bold" fill="%231F4D3A" text-anchor="middle">INR ${price}/day</text></svg>`;

    listings.push({
      id,
      ownerId: owner.uid,
      title: `${tmpl.title} #${i}`,
      description: tmpl.desc,
      category: tmpl.category,
      condition: i % 4 === 0 ? 'New' : i % 3 === 0 ? 'Good' : 'Like new',
      replacementValue: tmpl.value,
      transactionType: i % 15 === 0 ? 'free lend' : i % 25 === 0 ? 'swap' : 'rent',
      pricePerDay: i % 15 === 0 || i % 25 === 0 ? 0 : price,
      minDays: 1,
      maxDays: i % 5 === 0 ? 7 : 14,
      images: [imageSvg],
      communityId: owner.communityId,
      locality: owner.locality,
      status: i === 99 ? 'paused' : 'active',
      rules: 'Handle with care. Return fully cleaned and packed in protective case.',
      handover: 'Handover at residential club house reception or building lobby.',
      createdAt,
      updatedAt: createdAt,
      viewsCount: rng.int(12, 180),
      requestsCount: i >= 95 ? 0 : rng.int(1, 14),
    });
  }

  // 3. GENERATE 200 BOOKINGS SPANNING 6 MONTHS (180 DAYS)
  // Target status distribution:
  // - 80 completed
  // - 40 cancelled (with some late cancellations)
  // - 35 rejected
  // - 25 approved (current/upcoming)
  // - 20 pending (upcoming)
  const bookings: GeneratedDemoData['bookings'] = [];
  const lockedDays: GeneratedDemoData['lockedDays'] = [];
  const reviews: GeneratedDemoData['reviews'] = [];
  const publicActivities: GeneratedDemoData['publicActivities'] = [];

  // Track locked dates per listing to guarantee NO overlapping approved bookings!
  const listingLocks: Record<string, Set<string>> = {};

  const statusPool: BookingStatus[] = [
    ...Array(80).fill('completed'),
    ...Array(40).fill('cancelled'),
    ...Array(35).fill('rejected'),
    ...Array(25).fill('approved'),
    ...Array(20).fill('pending')
  ];

  for (let bIdx = 0; bIdx < 200; bIdx++) {
    const bookingId = `demo_booking_${String(bIdx + 1).padStart(3, '0')}`;
    const status = statusPool[bIdx];

    // Pick listing (avoid listings 95-100 which are zero-booking listings)
    const listing = listings[bIdx % 94];
    if (!listingLocks[listing.id]) listingLocks[listing.id] = new Set();

    // Pick borrower different from owner
    let borrower = users[(bIdx + 7) % users.length];
    if (borrower.uid === listing.ownerId) {
      borrower = users[(bIdx + 8) % users.length];
    }

    // Determine booking timeline relative to baseDate
    let daysAgoRequested: number;
    let daysToStart: number;
    const tripDays = rng.int(1, 5);

    if (status === 'completed') {
      // Completed bookings are strictly in the past (10 to 175 days ago)
      daysAgoRequested = rng.int(15, 175);
      daysToStart = -daysAgoRequested + rng.int(1, 5); // start date is in past
    } else if (status === 'cancelled' || status === 'rejected') {
      daysAgoRequested = rng.int(5, 160);
      daysToStart = -daysAgoRequested + rng.int(1, 4);
    } else if (status === 'approved') {
      // Approved bookings are upcoming (start within next 1 to 20 days)
      daysAgoRequested = rng.int(1, 8);
      daysToStart = rng.int(1, 20);
    } else {
      // Pending
      daysAgoRequested = rng.int(0, 3);
      daysToStart = rng.int(2, 14);
    }

    const requestTime = new Date(baseDate.getTime() - daysAgoRequested * 24 * 60 * 60 * 1000);
    const startDateObj = new Date(baseDate.getTime() + daysToStart * 24 * 60 * 60 * 1000);
    const endDateObj = new Date(startDateObj.getTime() + (tripDays - 1) * 24 * 60 * 60 * 1000);

    const startDate = startDateObj.toISOString().split('T')[0];
    const endDate = endDateObj.toISOString().split('T')[0];

    // If approved, check collision and lock days
    if (status === 'approved') {
      const datesToLock: string[] = [];
      const curr = new Date(startDateObj);
      for (let d = 0; d < tripDays; d++) {
        datesToLock.push(curr.toISOString().split('T')[0]);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      // Check collision with already locked days
      const hasConflict = datesToLock.some((dStr) => listingLocks[listing.id].has(dStr));
      if (!hasConflict) {
        datesToLock.forEach((dStr) => {
          listingLocks[listing.id].add(dStr);
          lockedDays.push({
            listingId: listing.id,
            date: dStr,
            type: 'booking',
            bookingId,
            ownerId: listing.ownerId,
          });
        });
      }
    }

    // Response delay (hours)
    // Fast (<2h), Medium (2-24h), Slow (24h+)
    let hoursToRespond = rng.int(1, 48);
    if (bIdx % 4 === 0) hoursToRespond = rng.int(1, 2); // fast
    else if (bIdx % 4 === 1) hoursToRespond = rng.int(3, 18); // medium
    else if (bIdx % 4 === 2) hoursToRespond = rng.int(26, 72); // slow (associated with drop-offs)

    const respondedAt = new Date(requestTime.getTime() + hoursToRespond * 60 * 60 * 1000);
    const agreedTotal = listing.transactionType === 'rent' ? listing.pricePerDay * tripDays : 0;
    const isLate = status === 'cancelled' && rng.next() < 0.35; // 35% of cancellations are late (<48h)

    // Price band quartile
    const priceBand: 'low' | 'mid' | 'high' | 'premium' =
      listing.pricePerDay < 250 ? 'low' : listing.pricePerDay < 500 ? 'mid' : listing.pricePerDay < 1000 ? 'high' : 'premium';

    const bookingRecord = {
      id: bookingId,
      listingId: listing.id,
      ownerId: listing.ownerId,
      borrowerId: borrower.uid,
      startDate,
      endDate,
      days: tripDays,
      transactionType: listing.transactionType,
      pricePerDayAtRequest: listing.pricePerDay,
      agreedTotal,
      commissionPct: 0.08,
      status,
      wouldHaveBought: (bIdx % 3 === 0 ? 'yes' : bIdx % 3 === 1 ? 'no' : 'maybe') as 'yes' | 'no' | 'maybe',
      borrowerMessage: 'Hello! I need this gear for a weekend project in the community.',
      rejectionReason: status === 'rejected' ? 'Dates conflict with personal schedule.' : undefined,
      cancelReason: status === 'cancelled' ? (isLate ? 'Last minute schedule change.' : 'Project postponed.') : undefined,
      cancelledBy: status === 'cancelled' ? (rng.next() < 0.8 ? borrower.uid : listing.ownerId) : undefined,
      lateCancellation: isLate,
      hoursToRespond,
      leadTimeDays: Math.max(1, daysToStart + daysAgoRequested),
      tripLengthDays: tripDays,
      priceBand,
      createdAt: requestTime,
      respondedAt: status !== 'pending' ? respondedAt : undefined,
      approvedAt: status === 'approved' || status === 'completed' ? respondedAt : undefined,
      completedAt: status === 'completed' ? new Date(endDateObj.getTime() + 4 * 60 * 60 * 1000) : undefined,
      listingSnapshot: {
        title: listing.title,
        image: listing.images[0],
        category: listing.category,
        replacementValue: listing.replacementValue,
      },
    };

    bookings.push(bookingRecord);

    // Record public activity ledger entry reflecting the 6-month historical activity
    const activityType: 'booking_completed' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' | 'request_created' =
      status === 'completed'
        ? 'booking_completed'
        : status === 'approved'
        ? 'booking_approved'
        : status === 'rejected'
        ? 'booking_rejected'
        : status === 'cancelled'
        ? 'booking_cancelled'
        : 'request_created';

    publicActivities.push({
      id: `demo_act_${String(publicActivities.length + 1).padStart(3, '0')}`,
      type: activityType,
      subjectUid: listing.ownerId,
      otherUid: borrower.uid,
      listingId: listing.id,
      category: listing.category,
      communityId: listing.communityId,
      bookingId,
      hoursToRespond,
      at: status === 'completed' ? new Date(endDateObj.getTime() + 4 * 60 * 60 * 1000) : requestTime,
    });

    // If completed: generate review
    if (status === 'completed') {
      const reviewId = `demo_review_${String(reviews.length + 1).padStart(3, '0')}`;
      const rating = rng.next() < 0.75 ? 5 : rng.next() < 0.9 ? 4 : 3;

      const reviewTexts = [
        'Gear was in impeccable condition! Very punctual and friendly neighbor.',
        'Super easy handover and clear communication. Will definitely borrow again!',
        'Saved me from buying expensive gear I only needed for 2 days. 10/10!',
        'The camera worked smoothly, battery was fully charged. Great experience.',
        'High quality tools and helpful usage tips provided at pickup.'
      ];

      reviews.push({
        id: reviewId,
        bookingId,
        reviewerId: borrower.uid,
        revieweeId: listing.ownerId,
        rating,
        text: rng.pick(reviewTexts),
        createdAt: new Date(endDateObj.getTime() + 6 * 60 * 60 * 1000),
      });
    }
  }

  // 4. GENERATE 150 NOTIFICATIONS
  const notifications: GeneratedDemoData['notifications'] = [];
  for (let n = 1; n <= 150; n++) {
    const user = users[(n - 1) % users.length];
    const nDate = new Date(baseDate.getTime() - rng.int(1, 60) * 24 * 60 * 60 * 1000);
    const types: GeneratedDemoData['notifications'][0]['type'][] = ['booking', 'saved_search', 'wish', 'review'];
    const chosenType = types[n % types.length];

    notifications.push({
      id: `demo_notif_${String(n).padStart(3, '0')}`,
      recipientId: user.uid,
      title: chosenType === 'booking' ? 'Borrow request update' : chosenType === 'review' ? 'Review received' : 'Community alert',
      message: `Your exchange activity in ${user.locality} has a new update.`,
      type: chosenType,
      link: '/requests',
      read: n % 3 === 0,
      createdAt: nDate,
    });
  }

  // 5. GENERATE 100 FAVOURITES
  const favourites: GeneratedDemoData['favourites'] = [];
  for (let f = 1; f <= 100; f++) {
    const user = users[(f - 1) % users.length];
    const listing = listings[(f * 7) % listings.length];
    favourites.push({
      id: `demo_fav_${String(f).padStart(3, '0')}`,
      userId: user.uid,
      listingId: listing.id,
      createdAt: new Date(baseDate.getTime() - rng.int(1, 100) * 24 * 60 * 60 * 1000),
    });
  }

  // 6. GENERATE 30 SAVED SEARCHES
  const savedSearches: GeneratedDemoData['savedSearches'] = [];
  const searchQueries = [
    'Sony camera', 'Drone 4K', 'DeWalt drill', 'Camping tent', 'Air fryer', 'Samsonite', 'Karaoke mic',
    'Projector 1080p', 'Trek bike', 'Pressure washer', 'Impact driver', 'OLED switch', 'Acoustic guitar'
  ];
  for (let s = 1; s <= 30; s++) {
    const user = users[(s - 1) % users.length];
    const query = searchQueries[s % searchQueries.length];
    savedSearches.push({
      id: `demo_search_${String(s).padStart(3, '0')}`,
      userId: user.uid,
      query,
      category: categories[s % categories.length],
      maxPrice: rng.int(300, 1500),
      createdAt: new Date(baseDate.getTime() - rng.int(2, 80) * 24 * 60 * 60 * 1000),
    });
  }

  // 7. GENERATE 50 WISHBOARD ENTRIES
  const wishes: GeneratedDemoData['wishes'] = [];
  const wishNeeds = [
    { item: 'GoPro for Scuba Trip in Andaman', cat: 'Cameras and creator gear', budget: 500 },
    { item: 'Heavy-Duty Pressure Washer for Sunday Deck Cleaning', cat: 'Tools and DIY', budget: 350 },
    { item: 'Extra Large Suitcase for 2-week Europe Trip', cat: 'Travel and luggage', budget: 250 },
    { item: 'JBL Party Speaker for Birthday Gathering', cat: 'Party and event supplies', budget: 600 },
    { item: 'Child Safety Car Seat for Weekend Roadtrip', cat: 'Kids and baby', budget: 300 },
    { item: 'Guitar Amp for Acoustic Jam Session', cat: 'Musical instruments', budget: 400 },
    { item: 'Inflatable Stand-Up Paddleboard for Lake Visit', cat: 'Sports and outdoor', budget: 500 },
    { item: 'High Speed Scanner for Archiving Family Album', cat: 'Electronics and gadgets', budget: 200 }
  ];

  for (let w = 1; w <= 50; w++) {
    const user = users[(w - 1) % users.length];
    const template = wishNeeds[(w - 1) % wishNeeds.length];
    const neededFromDate = new Date(baseDate.getTime() + rng.int(1, 15) * 24 * 60 * 60 * 1000);
    const neededToDate = new Date(neededFromDate.getTime() + rng.int(2, 4) * 24 * 60 * 60 * 1000);

    wishes.push({
      id: `demo_wish_${String(w).padStart(3, '0')}`,
      requesterId: user.uid,
      requesterName: user.displayName,
      itemName: `${template.item} (${w})`,
      category: template.cat as Category,
      neededFrom: neededFromDate.toISOString().split('T')[0],
      neededTo: neededToDate.toISOString().split('T')[0],
      maxBudgetPerDay: template.budget,
      communityId: user.communityId,
      status: w % 4 === 0 ? 'fulfilled' : 'open',
      createdAt: new Date(baseDate.getTime() - rng.int(1, 45) * 24 * 60 * 60 * 1000),
    });
  }

  return {
    users,
    listings,
    bookings,
    lockedDays,
    reviews,
    notifications,
    favourites,
    savedSearches,
    wishes,
    publicActivities,
  };
}
