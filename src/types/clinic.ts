export type RoleType = 'dentist' | 'secretary' | 'assistant' | 'patient';

export type PermissionKey =
  | 'view_ehr'
  | 'edit_ehr'
  | 'manage_appointments'
  | 'manage_billing'
  | 'send_sms'
  | 'view_reports'
  | 'manage_consultations'
  | 'manage_staff';

export type AvatarKey = 'female_dentist' | 'male_dentist' | 'ortho_dentist';
export type RadiologyAssetKey = 'xray_opg' | 'xray_pa';

export interface StaffMember {
  id: string;
  name: string;
  role: Exclude<RoleType, 'patient'>;
  roleTitle: string;
  specialty?: string;
  bio?: string;
  phone: string;
  avatarKey?: AvatarKey;
  isDoctor: boolean;
  active: boolean;
  permissions: Record<PermissionKey, boolean>;
}

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'filled'
  | 'root_canal'
  | 'crown'
  | 'implant'
  | 'extracted'
  | 'planned';

export interface ToothRecord {
  toothNumber: number;
  condition: ToothCondition;
  notes?: string;
  updatedAt: string;
}

export interface ClinicalRecord {
  id: string;
  date: string;
  doctorId: string;
  doctorName: string;
  procedure: string;
  teeth: number[];
  notes: string;
  cost: number;
}

export type RadiologyCategory = 'OPG' | 'PA' | 'CBCT' | 'آزمایش' | 'مدرک پزشکی';

export interface RadiologyDocument {
  id: string;
  title: string;
  category: RadiologyCategory;
  date: string;
  assetKey?: RadiologyAssetKey;
  customDataUrl?: string;
  notes: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  nationalId: string;
  phone: string;
  birthYear: string;
  gender: 'زن' | 'مرد';
  bloodType: string;
  allergies: string[];
  systemicConditions: string[];
  medications: string;
  medicalNotes: string;
  createdAt: string;
  teethChart: Record<number, ToothRecord>;
  clinicalHistory: ClinicalRecord[];
  documents: RadiologyDocument[];
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  date: string;
  /** Exact time like "10:00" OR attendance window label like "شیفت صبح (۰۹:۰۰ تا ۱۳:۰۰)" when exact time slots are disabled */
  time: string;
  /** Optional attendance shift label when booked without exact hour */
  shiftLabel?: string;
  durationMinutes: number;
  service: string;
  status: AppointmentStatus;
  source: 'clinic' | 'online';
  notes?: string;
  reminderSent?: boolean;
}

export interface AttendanceWindow {
  id: string;
  label: string;
  start: string;
  end: string;
}

/** 0 = شنبه (Saturday), 1 = یکشنبه, ..., 6 = جمعه (Friday) */
export type PersianWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayScheduleRule {
  weekday: PersianWeekday;
  enabled: boolean;
  dailyCapacity: number;
  windows: AttendanceWindow[];
  /** Custom manually added hours e.g. ["13:15"] */
  manualAddedSlots: string[];
  /** Specific generated hours manually removed/blocked e.g. ["10:30"] */
  removedSlots: string[];
}

export interface DateOverrideRule {
  date: string; // YYYY-MM-DD
  closed: boolean;
  dailyCapacity?: number;
  customWindows?: AttendanceWindow[];
  manualAddedSlots?: string[];
  removedSlots?: string[];
  note?: string;
}

export interface DoctorBookingConfig {
  doctorId: string;
  /** If false, exact clock times are hidden and patients reserve by day + attendance window up to dailyCapacity */
  enableExactTimeSlots: boolean;
  slotDurationMinutes: number;
  defaultDailyCapacity: number;
  bookingHorizonDays: number;
  weekSchedule: Record<PersianWeekday, DayScheduleRule>;
  dateOverrides: DateOverrideRule[];
}

export interface InvoiceItem {
  id: string;
  title: string;
  tooth?: string;
  quantity: number;
  unitPrice: number;
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';
export type AccountingSyncStatus = 'pending' | 'synced';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  doctorId: string;
  doctorName: string;
  date: string;
  items: InvoiceItem[];
  discount: number;
  insuranceCoverage: number;
  paidAmount: number;
  status: InvoiceStatus;
  paymentRef?: string;
  paymentMethod?: string;
  paidAt?: string;
  accountingSync: AccountingSyncStatus;
  accountingVoucherCode?: string;
  accountingSoftware?: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'مواد مصرفی دندانپزشکی'
  | 'لابراتوار و پروتز'
  | 'تجهیزات و تعمیرات'
  | 'اجاره و قبوض'
  | 'حقوق و دستمزد'
  | 'پذیرایی و ملزومات اداری'
  | 'سایر هزینه‌ها';

export type ExpenseSource = 'clinic_purchase' | 'petty_cash';
export type ExpensePaymentStatus = 'paid' | 'unpaid';

export interface ClinicExpense {
  id: string;
  date: string;
  title: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  source: ExpenseSource;
  paymentMethod: 'کارت بانکی مطب' | 'انتقال حساب' | 'تنخواه نقدی' | 'چک';
  receiptNumber?: string;
  status: ExpensePaymentStatus;
  recordedBy: string;
  accountingSync: AccountingSyncStatus;
  accountingVoucherCode?: string;
  notes?: string;
}

export interface PettyCashTopUp {
  id: string;
  date: string;
  amount: number;
  custodian: string;
  description: string;
  referenceCode?: string;
}

export interface SmsLog {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  phone: string;
  message: string;
  sentAt: string;
  status: 'delivered' | 'queued';
  type: 'reminder' | 'invoice' | 'custom';
}

export interface ConsultationMessage {
  id: string;
  sender: 'patient' | 'doctor';
  senderName: string;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
}

export interface ConsultationThread {
  id: string;
  patientName: string;
  patientPhone: string;
  patientId?: string;
  doctorId: string;
  doctorName: string;
  subject: string;
  status: 'open' | 'converted' | 'closed';
  updatedAt: string;
  messages: ConsultationMessage[];
}

export interface ClinicState {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  accountingSoftwareName: string;
  smsTemplate: string;
  staff: StaffMember[];
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  expenses: ClinicExpense[];
  pettyCashTopUps: PettyCashTopUp[];
  bookingConfigs: Record<string, DoctorBookingConfig>;
  smsLogs: SmsLog[];
  consultations: ConsultationThread[];
}

export type AppView =
  | 'dashboard'
  | 'appointments'
  | 'booking_settings'
  | 'patients'
  | 'billing'
  | 'consultations'
  | 'reports'
  | 'staff';

export type AppSection = 'clinic' | 'patient_portal';

export type ReportPeriodType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';
