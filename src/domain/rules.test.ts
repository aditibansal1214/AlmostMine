import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInclusiveDays,
  generateDateRangeList,
  isValidStatusTransition,
  calculateAgreedTotal,
  calculateCommissionAndEarnings,
  isLateCancellation,
  calculateEstimatedSavings,
  calculateCompletionRate,
  getDefaultChecklistForCategory,
} from './rules';

test('calculateInclusiveDays: calculates correct inclusive days', () => {
  assert.equal(calculateInclusiveDays('2026-11-01', '2026-11-01'), 1);
  assert.equal(calculateInclusiveDays('2026-11-01', '2026-11-03'), 3);
  assert.equal(calculateInclusiveDays('2026-11-05', '2026-11-02'), 0); // invalid
  assert.equal(calculateInclusiveDays('', '2026-11-02'), 0);
});

test('generateDateRangeList: outputs all inclusive ISO dates', () => {
  const dates = generateDateRangeList('2026-11-01', '2026-11-03');
  assert.deepEqual(dates, ['2026-11-01', '2026-11-02', '2026-11-03']);
});

test('isValidStatusTransition: strictly enforces booking state machine', () => {
  // pending can transition to approved, rejected, cancelled
  assert.equal(isValidStatusTransition('pending', 'approved'), true);
  assert.equal(isValidStatusTransition('pending', 'rejected'), true);
  assert.equal(isValidStatusTransition('pending', 'cancelled'), true);
  assert.equal(isValidStatusTransition('pending', 'completed'), false);

  // approved can transition to cancelled, completed
  assert.equal(isValidStatusTransition('approved', 'completed'), true);
  assert.equal(isValidStatusTransition('approved', 'cancelled'), true);
  assert.equal(isValidStatusTransition('approved', 'rejected'), false);
  assert.equal(isValidStatusTransition('approved', 'pending'), false);

  // terminal states cannot transition
  assert.equal(isValidStatusTransition('rejected', 'approved'), false);
  assert.equal(isValidStatusTransition('cancelled', 'approved'), false);
  assert.equal(isValidStatusTransition('completed', 'cancelled'), false);
});

test('calculateAgreedTotal: calculates rental total and zeroes free/swap', () => {
  assert.equal(calculateAgreedTotal(500, 3, 'rent'), 1500);
  assert.equal(calculateAgreedTotal(500, 3, 'free lend'), 0);
  assert.equal(calculateAgreedTotal(500, 3, 'swap'), 0);
});

test('calculateCommissionAndEarnings: computes 8% commission and owner net', () => {
  const result = calculateCommissionAndEarnings(1000, 0.08);
  assert.equal(result.commission, 80);
  assert.equal(result.ownerEarnings, 920);
});

test('isLateCancellation: triggers when under 48 hours to start date', () => {
  const startDate = '2026-11-05';
  // 50 hours before 2026-11-05 00:00:00 -> not late
  const earlyTime = new Date('2026-11-02T22:00:00');
  assert.equal(isLateCancellation(startDate, earlyTime), false);

  // 24 hours before 2026-11-05 00:00:00 -> late
  const lateTime = new Date('2026-11-04T00:00:00');
  assert.equal(isLateCancellation(startDate, lateTime), true);
});

test('calculateEstimatedSavings: computes replacement value avoided minus fees', () => {
  assert.equal(calculateEstimatedSavings(25000, 1500, true), 23500);
  assert.equal(calculateEstimatedSavings(25000, 1500, false), 0);
});

test('calculateCompletionRate: computes percentage accurately', () => {
  assert.equal(calculateCompletionRate(8, 1, 1), 80); // 8 / (8 + 1 + 1) = 80%
  assert.equal(calculateCompletionRate(0, 0, 0), 0);
});

test('getDefaultChecklistForCategory: returns category items', () => {
  const cameraChecklist = getDefaultChecklistForCategory('Cameras and creator gear');
  assert.ok(cameraChecklist.length >= 3);
  assert.ok(cameraChecklist.some(item => item.includes('lens')));
});
