import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedClinicState } from '../data/seedData';
import {
  calculateInvoiceTotals,
  computeMonthlyAnalytics,
  formatPersianDate,
  generateNextPatientCode,
  getAvailableSlots,
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

  // st-doc-1 has 10:00 for 45 min on 2026-11-13
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-1', '2026-11-13', '10:00', 30), true);
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-1', '2026-11-13', '10:30', 30), true);
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-1', '2026-11-13', '11:00', 30), false);
  assert.equal(hasAppointmentConflict(appointments, 'st-doc-2', '2026-11-13', '10:00', 30), false);

  const openSlots = getAvailableSlots(appointments, 'st-doc-1', '2026-11-13');
  assert.equal(openSlots.includes('10:00'), false);
  assert.equal(openSlots.includes('10:30'), false);
  assert.equal(openSlots.includes('11:00'), true);
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

test('renderSmsTemplate and formatPersianDate interpolate Persian appointment details', () => {
  const formatted = formatPersianDate('2026-11-13', true);
  assert.ok(formatted.includes('۱۴۰۵'));

  const msg = renderSmsTemplate('{patient} - {doctor} - {date} - {time} - {clinic}', {
    patientName: 'نیلوفر پارسا',
    doctorName: 'دکتر سارا محمدی',
    date: '2026-11-13',
    time: '10:00',
    clinicName: 'کلینیک لبخند',
  });
  assert.ok(msg.includes('نیلوفر پارسا'));
  assert.ok(msg.includes('۱۰:۰۰'));
  assert.ok(msg.includes('کلینیک لبخند'));
});

test('hasPermission enforces RBAC per staff role', () => {
  const { staff } = createSeedClinicState();
  const secretary = staff.find((s) => s.id === 'st-sec-1')!;
  const assistant = staff.find((s) => s.id === 'st-ast-1')!;
  const director = staff.find((s) => s.id === 'st-doc-1')!;

  assert.equal(hasPermission(secretary, 'secretary', 'manage_appointments'), true);
  assert.equal(hasPermission(secretary, 'secretary', 'view_ehr'), false);
  assert.equal(hasPermission(assistant, 'assistant', 'edit_ehr'), true);
  assert.equal(hasPermission(assistant, 'assistant', 'manage_billing'), false);
  assert.equal(hasPermission(director, 'dentist', 'manage_staff'), true);
  assert.equal(hasPermission(director, 'patient', 'view_ehr'), false);
});

test('computeMonthlyAnalytics aggregates revenue, collection, visits, and services', () => {
  const seed = createSeedClinicState();
  const summary = computeMonthlyAnalytics(seed.appointments, seed.invoices, seed.patients);

  assert.ok(summary.totalBilled > 0);
  assert.ok(summary.totalCollected > 0);
  assert.equal(summary.totalOutstanding, summary.totalBilled - summary.totalCollected);
  assert.ok(summary.months.length >= 2);
  assert.ok(summary.byDoctor.length >= 2);
  assert.ok(summary.topServices.length >= 3);
});
