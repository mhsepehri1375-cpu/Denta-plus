import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarCog,
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { AppointmentsSmsView } from './components/AppointmentsSmsView';
import { BillingAccountingView } from './components/BillingAccountingView';
import { BookingSettingsView } from './components/BookingSettingsView';
import { ConsultationsView } from './components/ConsultationsView';
import { DashboardView } from './components/DashboardView';
import { PatientPortalView } from './components/PatientPortalView';
import { PatientsEhrView } from './components/PatientsEhrView';
import { ReportsAnalyticsView } from './components/ReportsAnalyticsView';
import { StaffRbacView } from './components/StaffRbacView';
import { useClinicStore } from './hooks/useClinicStore';
import type {
  Appointment,
  AppointmentStatus,
  AppSection,
  AppView,
  ClinicExpense,
  ConsultationThread,
  DoctorBookingConfig,
  Invoice,
  Patient,
  PermissionKey,
  PettyCashTopUp,
  RadiologyDocument,
  RoleType,
  StaffMember,
  ToothCondition,
} from './types/clinic';
import {
  calculateInvoiceTotals,
  createDefaultBookingConfig,
  generateNextPatientCode,
  hasPermission,
  renderSmsTemplate,
  searchPatients,
  toPersianDigits,
} from './utils/clinicLogic';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.FC<{ className?: string }>;
  requiredPerm?: PermissionKey;
}

const CLINIC_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد مطب', icon: LayoutDashboard },
  {
    id: 'appointments',
    label: 'نوبت‌دهی و پیامک',
    icon: CalendarDays,
    requiredPerm: 'manage_appointments',
  },
  {
    id: 'booking_settings',
    label: 'تنظیمات نوبت‌گیری',
    icon: CalendarCog,
    requiredPerm: 'manage_appointments',
  },
  { id: 'patients', label: 'پرونده الکترونیک بیماران', icon: Users },
  {
    id: 'billing',
    label: 'مالی، خرید و تنخواه',
    icon: CreditCard,
    requiredPerm: 'manage_billing',
  },
  {
    id: 'consultations',
    label: 'مشاوره آنلاین بیماران',
    icon: MessageSquare,
    requiredPerm: 'manage_consultations',
  },
  {
    id: 'reports',
    label: 'گزارش‌های حرفه‌ای حسابداری',
    icon: BarChart3,
    requiredPerm: 'view_reports',
  },
  {
    id: 'staff',
    label: 'همکاران و دسترسی‌ها',
    icon: ShieldCheck,
    requiredPerm: 'manage_staff',
  },
];

export default function App() {
  const { state, updateState } = useClinicStore();

  const [appSection, setAppSection] = useState<AppSection>('clinic');
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [activeStaffId, setActiveStaffId] = useState<string>('st-doc-1');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    state.patients[0]?.id ?? null
  );
  const [invoicePatientId, setInvoicePatientId] = useState<string | null>(null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentStaff: StaffMember | null =
    state.staff.find((s) => s.id === activeStaffId) ?? state.staff[0] ?? null;
  const currentRole: RoleType =
    appSection === 'patient_portal' ? 'patient' : currentStaff?.role ?? 'dentist';

  const can = (perm: PermissionKey) => hasPermission(currentStaff, currentRole, perm);

  const visibleNavItems = useMemo(() => {
    return CLINIC_NAV_ITEMS.filter((n) => !n.requiredPerm || can(n.requiredPerm));
  }, [currentRole, currentStaff]);

  const effectiveView: AppView = useMemo(() => {
    const allowed = visibleNavItems.some((item) => item.id === activeView);
    return allowed ? activeView : 'dashboard';
  }, [visibleNavItems, activeView]);

  const globalResults = useMemo(() => {
    if (!globalQuery.trim()) return [];
    return searchPatients(state.patients, globalQuery).slice(0, 6);
  }, [state.patients, globalQuery]);

  const activeNavTitle =
    CLINIC_NAV_ITEMS.find((n) => n.id === effectiveView)?.label ?? 'داشبورد مطب';

  // Mutations
  const handleCreateAppointment = (apt: Omit<Appointment, 'id'>) => {
    updateState((prev) => ({
      ...prev,
      appointments: [{ ...apt, id: `apt-${Date.now()}` }, ...prev.appointments],
    }));
  };

  const handleUpdateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    updateState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }));
  };

  const handleSendSmsReminder = (apt: Appointment, customMsg?: string) => {
    updateState((prev) => {
      const msg =
        customMsg ||
        renderSmsTemplate(prev.smsTemplate, {
          patientName: apt.patientName,
          doctorName: apt.doctorName,
          date: apt.date,
          time: apt.time,
          clinicName: prev.clinicName,
        });
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      return {
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === apt.id ? { ...a, reminderSent: true } : a
        ),
        smsLogs: [
          {
            id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            appointmentId: apt.id,
            patientId: apt.patientId,
            patientName: apt.patientName,
            phone: apt.patientPhone,
            message: msg,
            sentAt: `${apt.date} ${timeStr}`,
            status: 'delivered',
            type: 'reminder',
          },
          ...prev.smsLogs,
        ],
      };
    });
  };

  const handleSaveBookingConfig = (doctorId: string, config: DoctorBookingConfig) => {
    updateState((prev) => ({
      ...prev,
      bookingConfigs: {
        ...prev.bookingConfigs,
        [doctorId]: config,
      },
    }));
  };

  const handleApplyBookingConfigToAll = (sourceConfig: DoctorBookingConfig) => {
    updateState((prev) => {
      const nextConfigs: Record<string, DoctorBookingConfig> = { ...prev.bookingConfigs };
      for (const s of prev.staff) {
        if (s.isDoctor && s.active) {
          nextConfigs[s.id] = {
            ...sourceConfig,
            doctorId: s.id,
          };
        }
      }
      return {
        ...prev,
        bookingConfigs: nextConfigs,
      };
    });
  };

  const handleCreatePatient = (patientData: Omit<Patient, 'id'>): Patient => {
    const newPatient: Patient = { ...patientData, id: `pat-${Date.now()}` };
    updateState((prev) => ({
      ...prev,
      patients: [newPatient, ...prev.patients],
    }));
    return newPatient;
  };

  const handleUpdateTooth = (
    patientId: string,
    toothNumber: number,
    condition: ToothCondition,
    notes: string
  ) => {
    updateState((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          teethChart: {
            ...p.teethChart,
            [toothNumber]: {
              toothNumber,
              condition,
              notes,
              updatedAt: '2026-11-19',
            },
          },
        };
      }),
    }));
  };

  const handleAddProcedure = (
    patientId: string,
    data: {
      toothNumber: number;
      doctorId: string;
      procedure: string;
      notes: string;
      cost: number;
      newCondition: ToothCondition;
    }
  ) => {
    updateState((prev) => {
      const doc = prev.staff.find((s) => s.id === data.doctorId);
      return {
        ...prev,
        patients: prev.patients.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            teethChart: {
              ...p.teethChart,
              [data.toothNumber]: {
                toothNumber: data.toothNumber,
                condition: data.newCondition,
                notes: data.notes || p.teethChart[data.toothNumber]?.notes,
                updatedAt: '2026-11-19',
              },
            },
            clinicalHistory: [
              {
                id: `rec-${Date.now()}`,
                date: '2026-11-19',
                doctorId: data.doctorId,
                doctorName: doc?.name ?? 'پزشک کلینیک',
                procedure: data.procedure,
                teeth: [data.toothNumber],
                notes: data.notes,
                cost: data.cost,
              },
              ...p.clinicalHistory,
            ],
          };
        }),
      };
    });
  };

  const handleAddRadiologyDoc = (patientId: string, doc: Omit<RadiologyDocument, 'id'>) => {
    updateState((prev) => ({
      ...prev,
      patients: prev.patients.map((p) =>
        p.id === patientId
          ? { ...p, documents: [{ ...doc, id: `doc-${Date.now()}` }, ...p.documents] }
          : p
      ),
    }));
  };

  const handleCreateInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    updateState((prev) => {
      const num = 122 + prev.invoices.length;
      const newInv: Invoice = {
        ...invoiceData,
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-1405-${num}`,
      };
      return {
        ...prev,
        invoices: [newInv, ...prev.invoices],
      };
    });
  };

  const handlePayInvoice = (invoiceId: string, paidAmount: number, paymentRef: string) => {
    updateState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = inv.paidAmount + paidAmount;
        const t = calculateInvoiceTotals(
          inv.items,
          inv.discount,
          inv.insuranceCoverage,
          newPaid
        );
        return {
          ...inv,
          paidAmount: newPaid,
          status: t.status,
          paymentRef,
          paymentMethod: 'درگاه پرداخت مستقیم',
          paidAt: '2026-11-19',
          accountingSync: 'synced',
          accountingVoucherCode:
            inv.accountingVoucherCode || `ACC-405-${1400 + prev.invoices.length}`,
          accountingSoftware: prev.accountingSoftwareName,
        };
      }),
    }));
  };

  const handleSyncAccounting = (invoiceId: string) => {
    updateState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv, idx) =>
        inv.id === invoiceId
          ? {
              ...inv,
              accountingSync: 'synced',
              accountingVoucherCode: `ACC-405-${1500 + idx}`,
              accountingSoftware: prev.accountingSoftwareName,
            }
          : inv
      ),
    }));
  };

  const handleAddExpense = (expenseData: Omit<ClinicExpense, 'id'>) => {
    updateState((prev) => ({
      ...prev,
      expenses: [{ ...expenseData, id: `exp-${Date.now()}` }, ...prev.expenses],
    }));
  };

  const handleSyncExpenseAccounting = (expenseId: string) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp, idx) =>
        exp.id === expenseId
          ? {
              ...exp,
              accountingSync: 'synced',
              accountingVoucherCode: `EXP-405-${200 + idx}`,
            }
          : exp
      ),
    }));
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  };

  const handleAddPettyCashTopUp = (topUpData: Omit<PettyCashTopUp, 'id'>) => {
    updateState((prev) => ({
      ...prev,
      pettyCashTopUps: [{ ...topUpData, id: `top-${Date.now()}` }, ...prev.pettyCashTopUps],
    }));
  };

  const handleReplyConsultation = (threadId: string, senderName: string, text: string) => {
    updateState((prev) => ({
      ...prev,
      consultations: prev.consultations.map((c) =>
        c.id === threadId
          ? {
              ...c,
              updatedAt: '2026-11-19 13:20',
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: 'doctor',
                  senderName,
                  text,
                  createdAt: '2026-11-19 13:20',
                },
              ],
            }
          : c
      ),
    }));
  };

  const handleConvertToAppointment = (thread: ConsultationThread) => {
    updateState((prev) => {
      let patient = prev.patients.find(
        (p) => p.id === thread.patientId || p.phone === thread.patientPhone
      );
      let nextPatients = prev.patients;
      if (!patient) {
        patient = {
          id: `pat-${Date.now()}`,
          patientCode: generateNextPatientCode(prev.patients),
          fullName: thread.patientName,
          nationalId: '0000000000',
          phone: thread.patientPhone,
          birthYear: '1375',
          gender: 'زن',
          bloodType: 'O+',
          allergies: [],
          systemicConditions: [],
          medications: 'نامشخص',
          medicalNotes: `تبدیل‌شده از مشاوره آنلاین: ${thread.subject}`,
          createdAt: '2026-11-19',
          teethChart: {},
          clinicalHistory: [],
          documents: [],
        };
        nextPatients = [patient, ...prev.patients];
      }

      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientCode: patient.patientCode,
        patientPhone: patient.phone,
        doctorId: thread.doctorId,
        doctorName: thread.doctorName,
        date: '2026-11-21',
        time: '12:00',
        durationMinutes: 30,
        service: thread.subject,
        status: 'confirmed',
        source: 'online',
        reminderSent: false,
      };

      return {
        ...prev,
        patients: nextPatients,
        appointments: [newApt, ...prev.appointments],
        consultations: prev.consultations.map((c) =>
          c.id === thread.id ? { ...c, status: 'converted', patientId: patient?.id } : c
        ),
      };
    });
    setActiveView('appointments');
  };

  const handleOnlineBooking = (data: {
    doctorId: string;
    date: string;
    time: string;
    shiftLabel?: string;
    service: string;
    patientName: string;
    phone: string;
    nationalId: string;
  }) => {
    const bookingCode = `BK-${Math.floor(10000 + Math.random() * 89999)}`;
    updateState((prev) => {
      const doctor = prev.staff.find((s) => s.id === data.doctorId);
      let patient = prev.patients.find(
        (p) => p.phone === data.phone || p.nationalId === data.nationalId
      );
      let nextPatients = prev.patients;
      if (!patient) {
        patient = {
          id: `pat-${Date.now()}`,
          patientCode: generateNextPatientCode(prev.patients),
          fullName: data.patientName,
          nationalId: data.nationalId,
          phone: data.phone,
          birthYear: '1374',
          gender: 'زن',
          bloodType: 'O+',
          allergies: [],
          systemicConditions: [],
          medications: 'ثبت‌نشده',
          medicalNotes: 'تشکیل پرونده از طریق رزرو آنلاین بیمار',
          createdAt: '2026-11-19',
          teethChart: {},
          clinicalHistory: [],
          documents: [],
        };
        nextPatients = [patient, ...prev.patients];
      }

      const apt: Appointment = {
        id: `apt-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientCode: patient.patientCode,
        patientPhone: patient.phone,
        doctorId: data.doctorId,
        doctorName: doctor?.name ?? 'پزشک کلینیک',
        date: data.date,
        time: data.time,
        shiftLabel: data.shiftLabel,
        durationMinutes: prev.bookingConfigs[data.doctorId]?.slotDurationMinutes ?? 30,
        service: data.service,
        status: 'confirmed',
        source: 'online',
        notes: `کد رهگیری آنلاین: ${bookingCode}`,
        reminderSent: false,
      };
      return {
        ...prev,
        patients: nextPatients,
        appointments: [apt, ...prev.appointments],
      };
    });
    return { bookingCode };
  };

  const handleStartConsultation = (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    subject: string;
    message: string;
  }) => {
    updateState((prev) => {
      const doc = prev.staff.find((s) => s.id === data.doctorId);
      const thread: ConsultationThread = {
        id: `con-${Date.now()}`,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        doctorId: data.doctorId,
        doctorName: doc?.name ?? 'دکتر سارا محمدی',
        subject: data.subject,
        status: 'open',
        updatedAt: '2026-11-19 13:25',
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: 'patient',
            senderName: data.patientName,
            text: data.message,
            createdAt: '2026-11-19 13:25',
          },
        ],
      };
      return {
        ...prev,
        consultations: [thread, ...prev.consultations],
      };
    });
  };

  const handleTogglePermission = (staffId: string, perm: PermissionKey) => {
    updateState((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === staffId
          ? { ...s, permissions: { ...s.permissions, [perm]: !s.permissions[perm] } }
          : s
      ),
    }));
  };

  const handleToggleStaffActive = (staffId: string) => {
    updateState((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => (s.id === staffId ? { ...s, active: !s.active } : s)),
    }));
  };

  const handleAddStaff = (member: Omit<StaffMember, 'id'>) => {
    const newId = `st-${Date.now()}`;
    updateState((prev) => ({
      ...prev,
      staff: [...prev.staff, { ...member, id: newId }],
      bookingConfigs: member.isDoctor
        ? { ...prev.bookingConfigs, [newId]: createDefaultBookingConfig(newId) }
        : prev.bookingConfigs,
    }));
  };

  const openPatientEhr = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView('patients');
    setGlobalQuery('');
  };

  // =========================================================================
  // DEDICATED PATIENT / USER PORTAL SHELL (Separated from Clinic Admin Side)
  // =========================================================================
  if (appSection === 'patient_portal') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 sticky top-0 z-30 no-print">
          <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
            <span className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap shrink-0">
              دنتاپلاس
            </span>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
              <span>بخش کاربران و مراجعین</span>
              <span aria-hidden="true">·</span>
              <span>رزرو نوبت آنلاین و پرداخت</span>
            </div>

            <button
              type="button"
              onClick={() => setAppSection('clinic')}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Building2 className="w-4 h-4 text-teal-700" />
              <span>ورود به پنل کلینیک (مطب)</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          <PatientPortalView
            state={state}
            onOnlineBooking={handleOnlineBooking}
            onPayInvoice={handlePayInvoice}
            onStartConsultation={handleStartConsultation}
          />
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>{state.clinicName}</span>
            <span className="font-mono tabular-nums">پشتیبانی پذیرش: {toPersianDigits(state.clinicPhone)}</span>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // CLINIC / DENTAL OFFICE MANAGEMENT SHELL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-x-clip">
      {/* Mobile Sidebar Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Right Sidebar Navigation (RTL) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-white border-l border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 no-print ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            دنتاپلاس
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="بستن منو"
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dedicated Clinic vs User Portal Switcher */}
        <div className="p-3 border-b border-slate-100">
          <div
            className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="انتخاب بخش کلینیک یا بخش کاربر"
          >
            <button
              type="button"
              onClick={() => setAppSection('clinic')}
              className="min-h-9 px-2 py-1 text-xs font-semibold rounded-md bg-white text-teal-800 shadow-xs whitespace-nowrap"
            >
              پنل کلینیک
            </button>
            <button
              type="button"
              onClick={() => {
                setAppSection('patient_portal');
                setMobileMenuOpen(false);
              }}
              className="min-h-9 px-2 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              بخش رزرو کاربر
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="منوی مدیریت مطب">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = effectiveView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                  if (item.id !== 'billing') setInvoicePatientId(null);
                }}
                className={`w-full min-h-11 flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors text-right ${
                  active
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-teal-700' : 'text-slate-400'}`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => {
              setAppSection('patient_portal');
              setMobileMenuOpen(false);
            }}
            className="w-full min-h-10 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>مشاهده صفحه رزرو آنلاین بیمار</span>
          </button>
          <div className="px-1 text-xs text-slate-500 space-y-0.5">
            <div className="font-semibold text-slate-800 truncate">{state.clinicName}</div>
            <div className="font-mono tabular-nums">{toPersianDigits(state.clinicPhone)}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 no-print">
          {/* Zone 1: Mobile Menu + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="باز کردن منوی ناوبری"
              className="lg:hidden min-h-10 min-w-10 shrink-0 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 shrink-0">پنل کلینیک</span>
              <span className="hidden sm:inline text-slate-300 shrink-0">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{activeNavTitle}</h1>
            </div>
          </div>

          {/* Zone 2: Global Fast Patient Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="search"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              aria-label="جستجوی سریع بیمار"
              placeholder="جستجوی سریع پرونده (نام، همراه، کدملی، کد بیمار)..."
              className="w-full min-h-10 pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
            />
            {globalResults.length > 0 && (
              <div className="absolute top-11 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40 divide-y divide-slate-100">
                {globalResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openPatientEhr(p.id)}
                    className="w-full text-right px-3.5 py-2.5 hover:bg-teal-50/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{p.fullName}</span>
                      <span className="text-slate-500 mr-2 font-mono tabular-nums">
                        {toPersianDigits(p.phone)} · {toPersianDigits(p.nationalId)}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-teal-700">
                      {p.patientCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zone 3: Staff Role Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="role-switcher" className="sr-only">
              تغییر کاربر یا نقش فعال پرسنل
            </label>
            <select
              id="role-switcher"
              value={activeStaffId}
              onChange={(e) => setActiveStaffId(e.target.value)}
              className="min-h-10 px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg text-slate-800 max-w-[140px] sm:max-w-xs truncate focus:outline-none focus:border-teal-600"
            >
              {state.staff
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (
                    {s.role === 'dentist'
                      ? 'دندانپزشک'
                      : s.role === 'secretary'
                      ? 'منشی'
                      : 'دستیار'}
                    )
                  </option>
                ))}
            </select>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1380px] w-full mx-auto min-w-0 overflow-x-clip">
          {effectiveView === 'dashboard' && (
            <DashboardView
              state={state}
              currentStaff={currentStaff}
              currentRole={currentRole}
              onNavigate={setActiveView}
              onOpenPatientEhr={openPatientEhr}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onSendReminderSms={(apt) => handleSendSmsReminder(apt)}
            />
          )}

          {effectiveView === 'appointments' && (
            <AppointmentsSmsView
              state={state}
              canManageAppointments={can('manage_appointments')}
              canSendSms={can('send_sms')}
              canViewEhr={can('view_ehr')}
              onCreateAppointment={handleCreateAppointment}
              onUpdateStatus={handleUpdateAppointmentStatus}
              onSendSmsReminder={handleSendSmsReminder}
              onUpdateSmsTemplate={(tpl) =>
                updateState((prev) => ({ ...prev, smsTemplate: tpl }))
              }
              onOpenPatientEhr={openPatientEhr}
              onOpenBookingSettings={() => setActiveView('booking_settings')}
            />
          )}

          {effectiveView === 'booking_settings' && (
            <BookingSettingsView
              state={state}
              canEdit={can('manage_appointments')}
              onSaveConfig={handleSaveBookingConfig}
              onApplyToAllDoctors={handleApplyBookingConfigToAll}
            />
          )}

          {effectiveView === 'patients' && (
            <PatientsEhrView
              state={state}
              selectedPatientId={selectedPatientId}
              canViewEhr={can('view_ehr')}
              canEditEhr={can('edit_ehr')}
              canManageBilling={can('manage_billing')}
              onSelectPatient={setSelectedPatientId}
              onCreatePatient={handleCreatePatient}
              onUpdateTooth={handleUpdateTooth}
              onAddProcedure={handleAddProcedure}
              onAddRadiologyDoc={handleAddRadiologyDoc}
              onQuickCreateInvoice={(pid) => {
                setInvoicePatientId(pid);
                setActiveView('billing');
              }}
            />
          )}

          {effectiveView === 'billing' && (
            <BillingAccountingView
              state={state}
              currentUserName={currentStaff?.name ?? 'کاربر مطب'}
              preselectedPatientId={invoicePatientId}
              onCreateInvoice={handleCreateInvoice}
              onPayInvoice={handlePayInvoice}
              onSyncAccounting={handleSyncAccounting}
              onAddExpense={handleAddExpense}
              onSyncExpenseAccounting={handleSyncExpenseAccounting}
              onDeleteExpense={handleDeleteExpense}
              onAddPettyCashTopUp={handleAddPettyCashTopUp}
            />
          )}

          {effectiveView === 'consultations' && (
            <ConsultationsView
              state={state}
              currentStaff={currentStaff}
              onReplyThread={handleReplyConsultation}
              onConvertToAppointment={handleConvertToAppointment}
            />
          )}

          {effectiveView === 'reports' && <ReportsAnalyticsView state={state} />}

          {effectiveView === 'staff' && (
            <StaffRbacView
              state={state}
              onTogglePermission={handleTogglePermission}
              onToggleActive={handleToggleStaffActive}
              onAddStaff={handleAddStaff}
            />
          )}
        </main>
      </div>
    </div>
  );
}
