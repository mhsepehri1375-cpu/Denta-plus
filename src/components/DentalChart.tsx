import React, { useState } from 'react';
import { Check, Info, Plus } from 'lucide-react';
import type { StaffMember, ToothCondition, ToothRecord } from '../types/clinic';
import { formatPersianDate, toPersianDigits } from '../utils/clinicLogic';

interface DentalChartProps {
  teethChart: Record<number, ToothRecord>;
  canEdit: boolean;
  doctors: StaffMember[];
  onUpdateTooth: (toothNumber: number, condition: ToothCondition, notes: string) => void;
  onAddProcedureFromTooth: (data: {
    toothNumber: number;
    doctorId: string;
    procedure: string;
    notes: string;
    cost: number;
    newCondition: ToothCondition;
  }) => void;
}

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

export const CONDITION_META: Record<
  ToothCondition,
  { label: string; fill: string; stroke: string; textClass: string }
> = {
  healthy: {
    label: 'سالم',
    fill: '#FFFFFF',
    stroke: '#CBD5E1',
    textClass: 'text-slate-600',
  },
  caries: {
    label: 'پوسیدگی',
    fill: '#FEE2E2',
    stroke: '#DC2626',
    textClass: 'text-red-700',
  },
  filled: {
    label: 'ترمیم / پرکردگی',
    fill: '#DBEAFE',
    stroke: '#2563EB',
    textClass: 'text-blue-700',
  },
  root_canal: {
    label: 'عصب‌کشی شده',
    fill: '#FEF3C7',
    stroke: '#D97706',
    textClass: 'text-amber-700',
  },
  crown: {
    label: 'روکش',
    fill: '#E0E7FF',
    stroke: '#4F46E5',
    textClass: 'text-indigo-700',
  },
  implant: {
    label: 'ایمپلنت',
    fill: '#CCFBF1',
    stroke: '#0D9488',
    textClass: 'text-teal-700',
  },
  extracted: {
    label: 'کشیده شده',
    fill: '#F1F5F9',
    stroke: '#94A3B8',
    textClass: 'text-slate-500',
  },
  planned: {
    label: 'طرح درمان آینده',
    fill: '#FCE7F3',
    stroke: '#DB2777',
    textClass: 'text-pink-700',
  },
};

function isMolar(num: number): boolean {
  const unit = num % 10;
  return unit >= 6;
}

function ToothSvg({
  toothNumber,
  condition,
  selected,
  isUpper,
}: {
  toothNumber: number;
  condition: ToothCondition;
  selected: boolean;
  isUpper: boolean;
}) {
  const meta = CONDITION_META[condition];
  const molar = isMolar(toothNumber);

  return (
    <svg
      viewBox="0 0 36 46"
      className={`w-6 h-8 sm:w-7 sm:h-9 transition-transform duration-150 ${
        selected ? 'scale-110' : 'group-hover:scale-105'
      }`}
      aria-hidden="true"
    >
      {isUpper ? (
        <>
          {/* Upper roots pointing up */}
          {condition === 'implant' ? (
            <path
              d="M15 4 L21 4 L20 20 L16 20 Z M14 8 L22 8 M14 12 L22 12 M15 16 L21 16"
              fill="#99F6E4"
              stroke={meta.stroke}
              strokeWidth="1.5"
            />
          ) : (
            <path
              d={
                molar
                  ? 'M10 21 C9 12, 10 5, 13 3 C15 5, 16 12, 18 14 C20 12, 21 5, 23 3 C26 5, 27 12, 26 21 Z'
                  : 'M12 21 C12 11, 15 4, 18 3 C21 4, 24 11, 24 21 Z'
              }
              fill={condition === 'extracted' ? '#E2E8F0' : '#F8FAFC'}
              stroke={meta.stroke}
              strokeWidth="1.4"
              strokeDasharray={condition === 'extracted' ? '2 2' : undefined}
            />
          )}
          {/* Crown */}
          <rect
            x="6"
            y="19"
            width="24"
            height="21"
            rx="6"
            fill={meta.fill}
            stroke={selected ? '#0F766E' : meta.stroke}
            strokeWidth={selected ? '2.2' : '1.5'}
            strokeDasharray={condition === 'extracted' ? '3 2' : undefined}
          />
          {condition === 'root_canal' && (
            <path d="M15 7 L17 28 M21 7 L19 28" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
          )}
          {condition === 'extracted' && (
            <path d="M11 24 L25 35 M25 24 L11 35" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </>
      ) : (
        <>
          {/* Lower crown */}
          <rect
            x="6"
            y="6"
            width="24"
            height="21"
            rx="6"
            fill={meta.fill}
            stroke={selected ? '#0F766E' : meta.stroke}
            strokeWidth={selected ? '2.2' : '1.5'}
            strokeDasharray={condition === 'extracted' ? '3 2' : undefined}
          />
          {/* Lower roots pointing down */}
          {condition === 'implant' ? (
            <path
              d="M16 26 L20 26 L21 42 L15 42 Z M14 30 L22 30 M14 34 L22 34 M15 38 L21 38"
              fill="#99F6E4"
              stroke={meta.stroke}
              strokeWidth="1.5"
            />
          ) : (
            <path
              d={
                molar
                  ? 'M10 25 C9 34, 10 41, 13 43 C15 41, 16 34, 18 32 C20 34, 21 41, 23 43 C26 41, 27 34, 26 25 Z'
                  : 'M12 25 C12 35, 15 42, 18 43 C21 42, 24 35, 24 25 Z'
              }
              fill={condition === 'extracted' ? '#E2E8F0' : '#F8FAFC'}
              stroke={meta.stroke}
              strokeWidth="1.4"
              strokeDasharray={condition === 'extracted' ? '2 2' : undefined}
            />
          )}
          {condition === 'root_canal' && (
            <path d="M15 39 L17 18 M21 39 L19 18" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
          )}
          {condition === 'extracted' && (
            <path d="M11 11 L25 22 M25 11 L11 22" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}

export const DentalChart: React.FC<DentalChartProps> = ({
  teethChart,
  canEdit,
  doctors,
  onUpdateTooth,
  onAddProcedureFromTooth,
}) => {
  const [selectedTooth, setSelectedTooth] = useState<number>(36);
  const currentRecord = teethChart[selectedTooth];
  const [condition, setCondition] = useState<ToothCondition>(
    currentRecord?.condition ?? 'healthy'
  );
  const [notes, setNotes] = useState<string>(currentRecord?.notes ?? '');
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [procDoctorId, setProcDoctorId] = useState(doctors[0]?.id ?? '');
  const [procTitle, setProcTitle] = useState('');
  const [procCost, setProcCost] = useState('2500000');
  const [procNotes, setProcNotes] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const handleSelectTooth = (num: number) => {
    setSelectedTooth(num);
    const rec = teethChart[num];
    setCondition(rec?.condition ?? 'healthy');
    setNotes(rec?.notes ?? '');
    setShowProcedureForm(false);
    setSavedNotice('');
  };

  const handleSaveTooth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    onUpdateTooth(selectedTooth, condition, notes);
    setSavedNotice(`وضعیت دندان ${toPersianDigits(selectedTooth)} ذخیره شد.`);
  };

  const handleSaveProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !procTitle.trim()) return;
    onAddProcedureFromTooth({
      toothNumber: selectedTooth,
      doctorId: procDoctorId || doctors[0]?.id || '',
      procedure: procTitle.trim(),
      notes: procNotes.trim(),
      cost: Number(procCost) || 0,
      newCondition: condition,
    });
    setProcTitle('');
    setProcNotes('');
    setShowProcedureForm(false);
    setSavedNotice(`درمان برای دندان ${toPersianDigits(selectedTooth)} در پرونده ثبت شد.`);
  };

  const renderArchRow = (rightHalf: number[], leftHalf: number[], isUpper: boolean) => (
    <div className="flex items-center justify-start xl:justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 px-1" dir="ltr">
      <div className="flex items-center gap-0.5">
        {rightHalf.map((num) => {
          const rec = teethChart[num];
          const cond = rec?.condition ?? 'healthy';
          const isSel = selectedTooth === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleSelectTooth(num)}
              aria-label={`دندان شماره ${num} وضعیت ${CONDITION_META[cond].label}`}
              className={`group flex flex-col items-center p-0.5 rounded-lg border transition-colors min-w-[29px] sm:min-w-[31px] min-h-[44px] focus-visible:outline-2 focus-visible:outline-teal-600 ${
                isSel
                  ? 'border-teal-600 bg-teal-50/70'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isUpper && (
                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-500 mb-0.5">
                  {num}
                </span>
              )}
              <ToothSvg toothNumber={num} condition={cond} selected={isSel} isUpper={isUpper} />
              {!isUpper && (
                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-500 mt-0.5">
                  {num}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="w-px h-12 bg-slate-200 shrink-0" aria-hidden="true" />

      <div className="flex items-center gap-0.5">
        {leftHalf.map((num) => {
          const rec = teethChart[num];
          const cond = rec?.condition ?? 'healthy';
          const isSel = selectedTooth === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleSelectTooth(num)}
              aria-label={`دندان شماره ${num} وضعیت ${CONDITION_META[cond].label}`}
              className={`group flex flex-col items-center p-0.5 rounded-lg border transition-colors min-w-[29px] sm:min-w-[31px] min-h-[44px] focus-visible:outline-2 focus-visible:outline-teal-600 ${
                isSel
                  ? 'border-teal-600 bg-teal-50/70'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isUpper && (
                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-500 mb-0.5">
                  {num}
                </span>
              )}
              <ToothSvg toothNumber={num} condition={cond} selected={isSel} isUpper={isUpper} />
              {!isUpper && (
                <span className="font-mono tabular-nums text-[10px] font-medium text-slate-500 mt-0.5">
                  {num}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 border-b border-slate-100 pb-3">
        {(Object.keys(CONDITION_META) as ToothCondition[]).map((key) => {
          const item = CONDITION_META[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm border inline-block shrink-0"
                style={{ backgroundColor: item.fill, borderColor: item.stroke }}
              />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Arch Diagram */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>فک بالا (راست به چپ استاندارد FDI)</span>
          <span className="tabular-nums">کلیک روی هر دندان برای ثبت وضعیت</span>
        </div>

        {renderArchRow(UPPER_RIGHT, UPPER_LEFT, true)}

        <div className="border-t border-dashed border-slate-300 my-1" />

        {renderArchRow(LOWER_RIGHT, LOWER_LEFT, false)}

        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>فک پایین</span>
          <span>چپ بیمار ← خط میانی → راست بیمار</span>
        </div>
      </div>

      {/* Selected Tooth Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              پرونده دندان شماره{' '}
              <span className="font-mono tabular-nums text-teal-700">{selectedTooth}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              وضعیت فعلی: {CONDITION_META[currentRecord?.condition ?? 'healthy'].label}
              {currentRecord?.updatedAt && (
                <>
                  {' '}
                  · آخرین بروزرسانی: {formatPersianDate(currentRecord.updatedAt)}
                </>
              )}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowProcedureForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت درمان انجام‌شده روی این دندان</span>
            </button>
          )}
        </div>

        {!canEdit && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>نقش فعلی شما فقط مجوز مشاهده دارد و امکان ویرایش چارت دندانی فعال نیست.</span>
          </div>
        )}

        {savedNotice && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        <form onSubmit={handleSaveTooth} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              وضعیت بالینی دندان
            </label>
            <select
              value={condition}
              disabled={!canEdit}
              onChange={(e) => setCondition(e.target.value as ToothCondition)}
              className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 disabled:bg-slate-100"
            >
              {(Object.keys(CONDITION_META) as ToothCondition[]).map((key) => (
                <option key={key} value={key}>
                  {CONDITION_META[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              یادداشت کلینیکی دندان
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={notes}
                disabled={!canEdit}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: پوسیدگی سطح اکلوزال، نیاز به کامپوزیت یا عصب‌کشی..."
                className="flex-1 min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 disabled:bg-slate-100"
              />
              {canEdit && (
                <button
                  type="submit"
                  className="min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
                >
                  ذخیره وضعیت دندان
                </button>
              )}
            </div>
          </div>
        </form>

        {showProcedureForm && canEdit && (
          <form
            onSubmit={handleSaveProcedure}
            className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">پزشک معالج</label>
              <select
                value={procDoctorId}
                onChange={(e) => setProcDoctorId(e.target.value)}
                className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">عنوان اقدام درمانی</label>
              <input
                type="text"
                required
                value={procTitle}
                onChange={(e) => setProcTitle(e.target.value)}
                placeholder="مثال: ترمیم کامپوزیت"
                className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">تعرفه (تومان)</label>
              <input
                type="number"
                min={0}
                step={50000}
                value={procCost}
                onChange={(e) => setProcCost(e.target.value)}
                className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full min-h-10 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ثبت در سوابق درمان
              </button>
            </div>
            <div className="md:col-span-4">
              <input
                type="text"
                value={procNotes}
                onChange={(e) => setProcNotes(e.target.value)}
                placeholder="شرح کامل درمان (ماده مصرفی، نوع بی‌حسی، توصیه‌های پس از درمان)..."
                className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
