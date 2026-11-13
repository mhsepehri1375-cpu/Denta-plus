import React, { useState } from 'react';
import { Shield, UserPlus, X } from 'lucide-react';
import type { ClinicState, PermissionKey, RoleType, StaffMember } from '../types/clinic';
import { PERMISSION_LABELS, toPersianDigits } from '../utils/clinicLogic';
import { DOCTOR_AVATARS } from '../utils/mediaAssets';

interface StaffRbacViewProps {
  state: ClinicState;
  onTogglePermission: (staffId: string, perm: PermissionKey) => void;
  onToggleActive: (staffId: string) => void;
  onAddStaff: (member: Omit<StaffMember, 'id'>) => void;
}

const PERM_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export const StaffRbacView: React.FC<StaffRbacViewProps> = ({
  state,
  onTogglePermission,
  onToggleActive,
  onAddStaff,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Exclude<RoleType, 'patient'>>('secretary');
  const [roleTitle, setRoleTitle] = useState('منشی شیفت عصر');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const isDoctor = role === 'dentist';
    onAddStaff({
      name: name.trim(),
      role,
      roleTitle: roleTitle.trim() || (isDoctor ? 'دندانپزشک' : 'همکار مطب'),
      specialty: isDoctor ? specialty.trim() || 'دندانپزشک عمومی و زیبایی' : undefined,
      phone: phone.trim(),
      avatarKey: isDoctor ? 'female_dentist' : undefined,
      isDoctor,
      active: true,
      permissions: {
        view_ehr: role !== 'secretary',
        edit_ehr: role !== 'secretary',
        manage_appointments: true,
        manage_billing: role === 'secretary' || role === 'dentist',
        send_sms: role === 'secretary' || role === 'dentist',
        view_reports: role === 'dentist',
        manage_consultations: true,
        manage_staff: false,
      },
    });
    setName('');
    setPhone('');
    setSpecialty('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              مدیریت همکاران و تعیین سطح دسترسی (دستیار و منشی)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            با تغییر تیک دسترسی هر همکار، منوها و مجوزهای پنل آن کاربر به صورت آنی محدود یا فعال می‌شوند.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>افزودن همکار جدید</span>
        </button>
      </div>

      {/* Staff Cards with Permission Checkboxes */}
      <div className="grid grid-cols-1 gap-4">
        {state.staff.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {member.avatarKey ? (
                  <img
                    src={DOCTOR_AVATARS[member.avatarKey]}
                    alt={member.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                    {member.name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-slate-900">{member.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {member.roleTitle} ·{' '}
                    <span className="font-mono tabular-nums">{toPersianDigits(member.phone)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={member.active}
                    onChange={() => onToggleActive(member.id)}
                    className="w-4 h-4 accent-teal-600 rounded"
                  />
                  <span>{member.active ? 'حساب فعال' : 'غیرفعال'}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PERM_KEYS.map((perm) => {
                const checked = Boolean(member.permissions[perm]);
                const isDirectorLock = member.id === 'st-doc-1' && perm === 'manage_staff';
                return (
                  <label
                    key={perm}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-teal-50/50 border-teal-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isDirectorLock}
                      onChange={() => onTogglePermission(member.id, perm)}
                      className="w-4 h-4 accent-teal-600 rounded shrink-0"
                    />
                    <span>{PERMISSION_LABELS[perm]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="افزودن همکار جدید"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">افزودن همکار یا پزشک جدید</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="بستن"
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نام کامل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نقش در کلینیک</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Exclude<RoleType, 'patient'>)}
                  className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="secretary">منشی / پذیرش</option>
                  <option value="assistant">دستیار دندانپزشک</option>
                  <option value="dentist">دندانپزشک / متخصص</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">عنوان شغلی</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              {role === 'dentist' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تخصص پزشکی</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: متخصص ترمیمی و زیبایی"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}
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
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ثبت همکار
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
