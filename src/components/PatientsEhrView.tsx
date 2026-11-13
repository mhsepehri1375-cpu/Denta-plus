import React, { useState } from 'react';
import {
  AlertTriangle,
  FileImage,
  FilePlus2,
  Maximize2,
  Plus,
  Search,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  ClinicState,
  Patient,
  RadiologyCategory,
  RadiologyDocument,
  ToothCondition,
} from '../types/clinic';
import {
  calculateInvoiceTotals,
  formatCurrencyToman,
  formatPersianDate,
  generateNextPatientCode,
  searchPatients,
  toPersianDigits,
  validatePatientCode,
} from '../utils/clinicLogic';
import { RADIOLOGY_ASSETS } from '../utils/mediaAssets';
import { DentalChart } from './DentalChart';

interface PatientsEhrViewProps {
  state: ClinicState;
  selectedPatientId: string | null;
  canViewEhr: boolean;
  canEditEhr: boolean;
  canManageBilling: boolean;
  onSelectPatient: (id: string | null) => void;
  onCreatePatient: (patient: Omit<Patient, 'id'>) => Patient;
  onUpdateTooth: (
    patientId: string,
    toothNumber: number,
    condition: ToothCondition,
    notes: string
  ) => void;
  onAddProcedure: (
    patientId: string,
    data: {
      toothNumber: number;
      doctorId: string;
      procedure: string;
      notes: string;
      cost: number;
      newCondition: ToothCondition;
    }
  ) => void;
  onAddRadiologyDoc: (patientId: string, doc: Omit<RadiologyDocument, 'id'>) => void;
  onQuickCreateInvoice: (patientId: string) => void;
}

export const PatientsEhrView: React.FC<PatientsEhrViewProps> = ({
  state,
  selectedPatientId,
  canViewEhr,
  canEditEhr,
  canManageBilling,
  onSelectPatient,
  onCreatePatient,
  onUpdateTooth,
  onAddProcedure,
  onAddRadiologyDoc,
  onQuickCreateInvoice,
}) => {
  const [query, setQuery] = useState('');
  const [ehrTab, setEhrTab] = useState<'chart' | 'history' | 'radiology' | 'billing'>('chart');
  const [lightboxDoc, setLightboxDoc] = useState<RadiologyDocument | null>(null);

  // New Patient Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [codeMode, setCodeMode] = useState<'auto' | 'custom'>('auto');
  const [customCode, setCustomCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('1370');
  const [gender, setGender] = useState<'زن' | 'مرد'>('زن');
  const [bloodType, setBloodType] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [medications, setMedications] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Radiology Upload State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<RadiologyCategory>('OPG');
  const [docNotes, setDocNotes] = useState('');
  const [docDataUrl, setDocDataUrl] = useState<string>('');
  const [docError, setDocError] = useState('');

  const filteredPatients = searchPatients(state.patients, query);
  const activePatient =
    state.patients.find((p) => p.id === selectedPatientId) ?? null;
  const doctors = state.staff.filter((s) => s.isDoctor && s.active);

  const nextAutoCode = generateNextPatientCode(state.patients);

  const handleOpenNewPatient = () => {
    setCodeMode('auto');
    setCustomCode(nextAutoCode);
    setFullName('');
    setNationalId('');
    setPhone('');
    setAllergiesText('');
    setConditionsText('');
    setMedications('');
    setMedicalNotes('');
    setFormError('');
    setShowNewModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode = codeMode === 'auto' ? nextAutoCode : customCode.trim().toUpperCase();
    const codeValidation = validatePatientCode(targetCode, state.patients);
    if (!codeValidation.valid) {
      setFormError(codeValidation.error || 'کد بیمار نامعتبر است.');
      return;
    }
    if (!fullName.trim() || !phone.trim() || !nationalId.trim()) {
      setFormError('نام کامل، شماره همراه و کدملی الزامی هستند.');
      return;
    }

    const created = onCreatePatient({
      patientCode: targetCode,
      fullName: fullName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      birthYear: birthYear.trim() || '1370',
      gender,
      bloodType,
      allergies: allergiesText
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      systemicConditions: conditionsText
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      medications: medications.trim() || 'ندارد',
      medicalNotes: medicalNotes.trim(),
      createdAt: '2026-11-13',
      teethChart: {},
      clinicalHistory: [],
      documents: [],
    });
    setShowNewModal(false);
    onSelectPatient(created.id);
    setEhrTab('chart');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setDocError('حجم فایل نباید بیشتر از ۴ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDocDataUrl(reader.result);
        if (!docTitle) {
          setDocTitle(file.name.replace(/\.[^.]+$/, ''));
        }
        setDocError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !canEditEhr) return;
    if (!docTitle.trim()) {
      setDocError('عنوان مدرک یا تصویر رادیولوژی را وارد کنید.');
      return;
    }
    onAddRadiologyDoc(activePatient.id, {
      title: docTitle.trim(),
      category: docCategory,
      date: '2026-11-13',
      assetKey: docDataUrl ? undefined : docCategory === 'PA' ? 'xray_pa' : 'xray_opg',
      customDataUrl: docDataUrl || undefined,
      notes: docNotes.trim() || 'ثبت‌شده در پرونده الکترونیک بیمار',
    });
    setDocTitle('');
    setDocNotes('');
    setDocDataUrl('');
    setDocError('');
  };

  const getDocImageSrc = (doc: RadiologyDocument): string => {
    if (doc.customDataUrl) return doc.customDataUrl;
    if (doc.assetKey) return RADIOLOGY_ASSETS[doc.assetKey];
    return RADIOLOGY_ASSETS.xray_opg;
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی بیمار با نام، شماره همراه، کدملی یا کد بیمار"
            placeholder="جستجو با نام بیمار، شماره همراه، کدملی یا کد بیمار (مثال: DN-1001)..."
            className="w-full min-h-10 pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-teal-600"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenNewPatient}
          className="min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>تشکیل پرونده بیمار جدید</span>
        </button>
      </div>

      {/* Directory or Selected Patient Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Patient List Column */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">فهرست پرونده‌ها</h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(filteredPatients.length)} پرونده
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                بیماری با این مشخصات یافت نشد.
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = activePatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPatient(p.id)}
                    className={`w-full text-right p-3.5 transition-colors flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.fullName}</div>
                      <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        کد ملی: {toPersianDigits(p.nationalId)} · {toPersianDigits(p.phone)}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-0.5 shrink-0">
                      {p.patientCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Patient EHR Detail */}
        <div className="lg:col-span-8">
          {!activePatient ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">
                یک پرونده بیمار را انتخاب کنید
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                برای مشاهده سوابق پزشکی، چارت دندانی تعاملی، تصاویر رادیولوژی و سوابق مالی، از فهرست سمت راست بیمار را انتخاب یا پرونده جدید ایجاد کنید.
              </p>
            </div>
          ) : !canViewEhr ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-semibold text-slate-900">محدودیت سطح دسترسی</h3>
              <p className="text-sm text-slate-600">
                نقش فعلی شما مجوز مشاهده جزئیات پرونده پزشکی و رادیولوژی بیماران را ندارد. مدیر کلینیک می‌تواند این دسترسی را در بخش همکاران فعال کند.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Header Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{activePatient.fullName}</h2>
                      <span className="font-mono tabular-nums text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded px-2 py-0.5">
                        {activePatient.patientCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2 tabular-nums">
                      <span>کدملی: {toPersianDigits(activePatient.nationalId)}</span>
                      <span>·</span>
                      <span>همراه: {toPersianDigits(activePatient.phone)}</span>
                      <span>·</span>
                      <span>
                        {activePatient.gender} · متولد {toPersianDigits(activePatient.birthYear)}
                      </span>
                      <span>·</span>
                      <span>گروه خونی: {activePatient.bloodType}</span>
                    </div>
                  </div>

                  {canManageBilling && (
                    <button
                      type="button"
                      onClick={() => onQuickCreateInvoice(activePatient.id)}
                      className="min-h-9 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>صدور فاکتور برای این بیمار</span>
                    </button>
                  )}
                </div>

                {/* Medical Alerts Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
                    <div className="font-semibold text-rose-900">حساسیت و آلرژی دارویی</div>
                    <div className="text-rose-800 mt-1">
                      {activePatient.allergies.length > 0
                        ? activePatient.allergies.join('، ')
                        : 'موردی ثبت نشده'}
                    </div>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                    <div className="font-semibold text-amber-900">بیماری‌های زمینه‌ای و دارو</div>
                    <div className="text-amber-800 mt-1">
                      {activePatient.systemicConditions.length > 0
                        ? activePatient.systemicConditions.join('، ')
                        : 'ندارد'}{' '}
                      · {activePatient.medications}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="font-semibold text-slate-800">ملاحظات پزشکی پزشک</div>
                    <div className="text-slate-600 mt-1">
                      {activePatient.medicalNotes || 'یادداشتی ثبت نشده است.'}
                    </div>
                  </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEhrTab('chart')}
                    className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      ehrTab === 'chart'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    چارت دندانی (Odontogram)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEhrTab('history')}
                    className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      ehrTab === 'history'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    سوابق درمان ({toPersianDigits(activePatient.clinicalHistory.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEhrTab('radiology')}
                    className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      ehrTab === 'radiology'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    رادیولوژی و مدارک ({toPersianDigits(activePatient.documents.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEhrTab('billing')}
                    className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      ehrTab === 'billing'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    سوابق مالی و فاکتورها
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {ehrTab === 'chart' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <DentalChart
                    key={activePatient.id}
                    teethChart={activePatient.teethChart}
                    canEdit={canEditEhr}
                    doctors={doctors}
                    onUpdateTooth={(toothNum, cond, nts) =>
                      onUpdateTooth(activePatient.id, toothNum, cond, nts)
                    }
                    onAddProcedureFromTooth={(data) => onAddProcedure(activePatient.id, data)}
                  />
                </div>
              )}

              {ehrTab === 'history' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">
                      تاریخچه اقدامات دندانپزشکی
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {activePatient.clinicalHistory.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        هنوز سابقه درمانی ثبت نشده است. از چارت دندانی می‌توانید درمان جدید ثبت کنید.
                      </div>
                    ) : (
                      activePatient.clinicalHistory.map((rec) => (
                        <div key={rec.id} className="p-4 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-slate-900">
                              {rec.procedure}
                            </span>
                            <span className="text-xs font-semibold text-teal-700 tabular-nums">
                              {formatCurrencyToman(rec.cost)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            {formatPersianDate(rec.date, true)} · {rec.doctorName}
                            {rec.teeth.length > 0 &&
                              ` · دندان ${rec.teeth.map((t) => toPersianDigits(t)).join('، ')}`}
                          </div>
                          {rec.notes && (
                            <p className="text-xs text-slate-600 leading-relaxed pt-1">
                              {rec.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {ehrTab === 'radiology' && (
                <div className="space-y-4">
                  {canEditEhr && (
                    <form
                      onSubmit={handleUploadDocument}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <FilePlus2 className="w-4 h-4 text-teal-600" />
                        <h4 className="text-sm font-semibold text-slate-900">
                          افزودن تصویر رادیولوژی یا مدرک پزشکی جدید
                        </h4>
                      </div>
                      {docError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {docError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          placeholder="عنوان گرافی یا مدرک (مثال: OPG جدید)"
                          className="min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <select
                          value={docCategory}
                          onChange={(e) => setDocCategory(e.target.value as RadiologyCategory)}
                          className="min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                        >
                          <option value="OPG">گرافی OPG</option>
                          <option value="PA">گرافی تک‌دندان (PA)</option>
                          <option value="CBCT">اسکن سه‌بعدی (CBCT)</option>
                          <option value="آزمایش">آزمایش خون / پزشکی</option>
                          <option value="مدرک پزشکی">رضایت‌نامه / مدرک پزشکی</option>
                        </select>
                        <input
                          type="file"
                          accept="image/*"
                          aria-label="انتخاب فایل تصویر رادیولوژی"
                          onChange={handleFileChange}
                          className="min-h-10 px-2 py-1.5 text-xs border border-slate-300 rounded-lg file:ml-2 file:px-2.5 file:py-1 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={docNotes}
                          onChange={(e) => setDocNotes(e.target.value)}
                          placeholder="توضیحات تشخیصی پزشک..."
                          className="flex-1 min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <button
                          type="submit"
                          className="min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap"
                        >
                          ثبت در پروفایل بیمار
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activePatient.documents.length === 0 ? (
                      <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                        هنوز تصویر رادیولوژی یا مدرکی برای این بیمار بارگذاری نشده است.
                      </div>
                    ) : (
                      activePatient.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden">
                            <img
                              src={getDocImageSrc(doc)}
                              alt={doc.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setLightboxDoc(doc)}
                              aria-label={`بزرگنمایی ${doc.title}`}
                              className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900/80 rounded-lg hover:bg-slate-900"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>بزرگنمایی</span>
                            </button>
                          </div>
                          <div className="p-4 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm text-slate-900">{doc.title}</span>
                              <span className="text-xs font-medium text-teal-700">{doc.category}</span>
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {formatPersianDate(doc.date)}
                            </div>
                            <p className="text-xs text-slate-600 pt-1">{doc.notes}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {ehrTab === 'billing' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">صورت‌حساب‌های بیمار</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {state.invoices.filter((i) => i.patientId === activePatient.id).length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        صورت‌حسابی برای این بیمار صادر نشده است.
                      </div>
                    ) : (
                      state.invoices
                        .filter((i) => i.patientId === activePatient.id)
                        .map((inv) => {
                          const t = calculateInvoiceTotals(
                            inv.items,
                            inv.discount,
                            inv.insuranceCoverage,
                            inv.paidAmount
                          );
                          return (
                            <div
                              key={inv.id}
                              className="p-4 flex flex-wrap items-center justify-between gap-3"
                            >
                              <div>
                                <div className="font-mono text-sm font-semibold text-slate-900">
                                  {inv.invoiceNumber}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                  {formatPersianDate(inv.date, true)} · {inv.doctorName}
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-bold text-slate-900 tabular-nums">
                                  {formatCurrencyToman(t.netTotal)}
                                </div>
                                <div className="text-xs text-slate-500 tabular-nums">
                                  مانده: {formatCurrencyToman(t.remaining)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تشکیل پرونده بیمار جدید"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-slate-900">تشکیل پرونده الکترونیک جدید</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                aria-label="بستن فرم پرونده جدید"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              {/* Patient Code Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800">
                    تعریف کد پرونده بیمار
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeMode('auto');
                        setCustomCode(nextAutoCode);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                        codeMode === 'auto' ? 'bg-white text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      کد خودکار
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeMode('custom')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                        codeMode === 'custom' ? 'bg-white text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      کد اختصاصی دلخواه
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  disabled={codeMode === 'auto'}
                  value={codeMode === 'auto' ? nextAutoCode : customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="مثال: DN-2050 یا VIP-101"
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: علیرضا حسینی"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">شماره همراه</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09120000000"
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">کدملی (۱۰ رقم)</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="0012345678"
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">سال تولد</label>
                    <input
                      type="text"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full min-h-10 px-2 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">جنسیت</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'زن' | 'مرد')}
                      className="w-full min-h-10 px-2 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="زن">زن</option>
                      <option value="مرد">مرد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">گروه خونی</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full min-h-10 px-2 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    حساسیت‌ها (با کاما جدا کنید)
                  </label>
                  <input
                    type="text"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="مثال: پنی‌سیلین، لاتکس"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    بیماری‌های زمینه‌ای
                  </label>
                  <input
                    type="text"
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder="مثال: دیابت، فشار خون"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">داروهای مصرفی فعلی</label>
                <input
                  type="text"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="نام داروها یا «ندارد»"
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات پرونده پزشکی</label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ایجاد پرونده الکترونیک
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Radiology Lightbox */}
      {lightboxDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxDoc.title}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-3">
            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-teal-400" />
              <span className="font-semibold text-sm">{lightboxDoc.title}</span>
              <span className="text-xs text-slate-400">· {formatPersianDate(lightboxDoc.date)}</span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxDoc(null)}
              aria-label="بستن نمایشگر رادیولوژی"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={getDocImageSrc(lightboxDoc)}
            alt={lightboxDoc.title}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] max-w-full rounded-xl border border-slate-800 object-contain"
          />
          <p className="text-sm text-slate-300 mt-3 max-w-2xl text-center">{lightboxDoc.notes}</p>
        </div>
      )}
    </div>
  );
};
