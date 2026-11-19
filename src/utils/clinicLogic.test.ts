import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedClinicState } from '../data/seedData';
import {
  calculateInvoiceTotals,
  computeAccountingReport,
  computeMonthlyAnalytics,
  computePettyCashSummary,
  createDefaultBookingConfig,
  formatPersianDate,
  generateNextPatientCode,
  generateSlotsFromWindows,
  getAvailableSlots,
  getDoctorDayAvailability,
  getPersianWeekday,
  hasAppointmentConflict,
  hasPermission,
  normalizeDigits,
  renderSmsTemplate,
  searchPatients,
  validatePatientCode,
} from './clinicLogic';

test('normalizeDigits converts Persian and Arabic numerals to ASCII', () => {
  assert.equal(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(normalizeDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
  assert.equal(normalizeDigits('DN-۱۰۰۱'), 'DN-1001');
});

test('searchPatients finds matches by name, phone, national ID, and patient code', () => {
  const { patients } = createSeedClinicState();

  assert.equal(searchPatients(patients, 'نیلوفر').length, 1);
  assert.equal(searchPatients(patients, '۰۹۱۲۳۰۹۸۷۴۵')[0]?.id, 'pat-2');
  assert.equal(searchPatients(patients, '0440192837')[0]?.id, 'pat-3');
  assert.equal(searchPatients(patients, 'dn-1004')[0]?.id, 'pat-4');
  assert.equal(searchPatients(patients, '   ').length, patients.length);
});

test('generateNextPatientCode and validatePatientCode handle unique & custom codes', () => {
  const { patients } = createSeedClinicState();
  assert.equal(generateNextPatientCode(patients), 'DN-1006');

  assert.equal(validatePatientCode('DN-1001', patients).valid, false);
  assert.equal(validatePatientCode('DN-1001', patients, 'pat-1').valid, true);
  assert.equal(validatePatientCode('VIP-202', patients).valid, true);
  assert.equal(validatePatientCode('12', patients).valid, false);
});

test('hasAppointmentConflict and getAvailableSlots detect doctor/date overlaps', () => {
  const { appointments } = createSeedClinicState();

  // st-doc-1 has 10:00 for 30 min on 2026-11-19
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-1', '2026-11-19', '10:00', 30), true);
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-1', '2026-11-19', '10:30', 30), false);
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-2', '2026-11-19', '10:00', 30), false);

  const openSlots = getAvailableSlots(appointments, 'st-doc-1', '2026-11-19');
  assert.equal(openSlots.includes('10:00'), false);
  assert.equal(openSlots.includes('10:30'), true);
});

test('booking schedule engine supports manual slots, removed slots, daily capacity, and no-hour window mode', () => {
  const config = createDefaultBookingConfig('st-doc-1');
  // 2026-11-21 is Saturday (weekday 0), 2026-11-20 is Friday (weekday 6)
  assert.equal(getPersianWeekday('2026-11-21'), 0);
  assert.equal(getPersianWeekday('2026-11-20'), 6);

  const fridayAvail = getDoctorDayAvailability(config, [], 'st-doc-1', '2026-11-20');
  assert.equal(fridayAvail.isWorkingDay, false);

  // Add manual slot 13:15 and remove 09:30 on Saturday
  config.weekSchedule[0].manualAddedSlots = ['13:15'];
  config.weekSchedule[0].removedSlots = ['09:30'];
  config.weekSchedule[0].dailyCapacity = 2;

  const satSlots = generateSlotsFromWindows(
    config.weekSchedule[0].windows,
    30,
    config.weekSchedule[0].manualAddedSlots,
    config.weekSchedule[0].removedSlots
  );
  assert.equal(satSlots.includes('13:15'), true);
  assert.equal(satSlots.includes('09:30'), false);

  // Disable exact time slots and verify daily capacity fills up
  config.enableExactTimeSlots = false;
  const twoBookings = [
    {
      id: 'b1',
      patientId: 'p1',
      patientName: 'A',
      patientCode: 'DN-1',
      patientPhone: '0912',
      doctorId: 'st-doc-1',
      doctorName: 'D',
      date: '2026-11-21',
      time: 'شیفت صبح',
      durationMinutes: 30,
      service: 'معاینه',
      status: 'confirmed' as const,
      source: 'online' as const,
    },
    {
      id: 'b2',
      patientId: 'p2',
      patientName: 'B',
      patientCode: 'DN-2',
      patientPhone: '0912',
      doctorId: 'st-doc-1',
      doctorName: 'D',
      date: '2026-11-21',
      time: 'شیفت عصر',
      durationMinutes: 30,
      service: 'معاینه',
      status: 'confirmed' as const,
      source: 'online' as const,
    },
  ];

  const fullSat = getDoctorDayAvailability(config, twoBookings, 'st-doc-1', '2026-11-21');
  assert.equal(fullSat.enableExactTimeSlots, false);
  assert.equal(fullSat.remainingCapacity, 0);
  assert.equal(fullSat.availableSlots.length, 0);
});

test('calculateInvoiceTotals computes net, remaining, and status accurately', () => {
  const items = [
    { id: '1', title: 'عصب‌کشی', quantity: 1, unitPrice: 5000000 },
    { id: '2', title: 'گرافی', quantity: 2, unitPrice: 300000 },
  ];

  const unpaid = calculateInvoiceTotals(items, 200000, 400000, 0);
  assert.equal(unpaid.subtotal, 5600000);
  assert.equal(unpaid.netTotal, 5000000);
  assert.equal(unpaid.remaining, 5000000);
  assert.equal(unpaid.status, 'unpaid');

  const partial = calculateInvoiceTotals(items, 200000, 400000, 2000000);
  assert.equal(partial.remaining, 3000000);
  assert.equal(partial.status, 'partial');

  const paid = calculateInvoiceTotals(items, 200000, 400000, 5000000);
  assert.equal(paid.remaining, 0);
  assert.equal(paid.status, 'paid');
});

test('computePettyCashSummary computes top-ups, petty cash spent, balance, and clinic purchases', () => {
  const seed = createSeedClinicState();
  const summary = computePettyCashSummary(seed.expenses, seed.pettyCashTopUps);

  assert.equal(summary.totalTopUps, 8000000);
  assert.equal(summary.totalSpent, 1730000);
  assert.equal(summary.currentBalance, 6270000);
  assert.equal(summary.totalAllExpenses, summary.totalSpent + summary.clinicPurchasesTotal);
});

test('computeAccountingReport calculates P&L across daily, weekly, monthly, quarterly, yearly, and custom ranges', () => {
  const seed = createSeedClinicState();

  const monthly = computeAccountingReport(seed.appointments, seed.invoices, seed.expenses, 'monthly');
  assert.equal(monthly.netProfit, monthly.totalCollected - monthly.totalExpenses);
  assert.ok(monthly.buckets.length >= 3);
  assert.ok(monthly.expenseBreakdown.length >= 3);

  const quarterly = computeAccountingReport(seed.appointments, seed.invoices, seed.expenses, 'quarterly');
  assert.ok(quarterly.buckets.length >= 2);

  const yearly = computeAccountingReport(seed.appointments, seed.invoices, seed.expenses, 'yearly');
  assert.equal(yearly.buckets.length, 1);

  const custom = computeAccountingReport(seed.appointments, seed.invoices, seed.expenses, 'custom', {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
  });
  assert.ok(custom.totalBilled < monthly.totalBilled);
  assert.equal(custom.netProfit, custom.totalCollected - custom.totalExpenses);
});

test('renderSmsTemplate, formatPersianDate, hasPermission, and computeMonthlyAnalytics work accurately', () => {
  const seed = createSeedClinicState();
  const formatted = formatPersianDate('2026-11-19', true);
  assert.ok(formatted.includes('۱۴۰۵'));

  const msg = renderSmsTemplate('{patient} - {doctor} - {date} - {time} - {clinic}', {
    patientName: 'نیلوفر پارسا',
    doctorName: 'دکتر سارا محمدی',
    date: '2026-11-19',
    time: '10:00',
    clinicName: 'کلینیک لبخند',
  });
  assert.ok(msg.includes('۱۰:۰۰'));

  const secretary = seed.staff.find((s) => s.id === 'st-sec-1')!;
  assert.equal(hasPermission(secretary, 'secretary', 'manage_billing'), true);
  assert.equal(hasPermission(secretary, 'secretary', 'view_reports'), false);

  const summary = computeMonthlyAnalytics(seed.appointments, seed.invoices, seed.patients);
  assert.ok(summary.totalBilled > 0);
});
