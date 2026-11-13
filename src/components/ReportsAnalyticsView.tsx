import React from 'react';
import { BarChart3, Download, TrendingUp, Users } from 'lucide-react';
import type { ClinicState } from '../types/clinic';
import {
  computeMonthlyAnalytics,
  formatCurrencyToman,
  toPersianDigits,
} from '../utils/clinicLogic';

interface ReportsAnalyticsViewProps {
  state: ClinicState;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({ state }) => {
  const analytics = computeMonthlyAnalytics(
    state.appointments,
    state.invoices,
    state.patients
  );

  const activeMonths = analytics.months.filter(
    (m) => m.visitCount > 0 || m.billedAmount > 0
  );
  const maxRevenue = Math.max(
    1,
    ...activeMonths.map((m) => Math.max(m.billedAmount, m.collectedAmount))
  );
  const maxVisits = Math.max(1, ...activeMonths.map((m) => m.visitCount));

  const handleDownloadMonthlyCsv = () => {
    const header = [
      'ماه',
      'درآمد فاکتورشده (تومان)',
      'وصولی نقدی (تومان)',
      'تعداد مراجعین',
      'بیماران جدید',
    ];
    const rows = activeMonths.map((m) => [
      m.monthLabel,
      String(m.billedAmount),
      String(m.collectedAmount),
      String(m.visitCount),
      String(m.newPatientsCount),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-clinic-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            گزارش‌های تحلیلی و عملکرد ماهانه مطب
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تحلیل درآمد، نرخ وصول، تعداد مراجعین، عملکرد پزشکان و خدمات پرطرفدار به تفکیک ماه شمسی
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadMonthlyCsv}
          className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap self-start"
        >
          <Download className="w-4 h-4" />
          <span>دریافت گزارش ماهانه (CSV)</span>
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">جمع کل درآمد فاکتورشده</div>
          <div className="text-xl font-bold text-slate-900 mt-2 tabular-nums">
            {formatCurrencyToman(analytics.totalBilled)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">جمع وصولی قطعی</div>
          <div className="text-xl font-bold text-emerald-700 mt-2 tabular-nums">
            {formatCurrencyToman(analytics.totalCollected)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">مطالبات در انتظار تسویه</div>
          <div className="text-xl font-bold text-amber-700 mt-2 tabular-nums">
            {formatCurrencyToman(analytics.totalOutstanding)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">مراجعین ثبت‌شده (تکمیل‌شده)</div>
          <div className="text-xl font-bold text-slate-900 mt-2 tabular-nums">
            {toPersianDigits(analytics.totalVisits)} نوبت ({toPersianDigits(analytics.completedVisits)} تکمیل)
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Financial Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">عملکرد مالی ماهانه</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                فاکتورشده
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
                وصولی
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {activeMonths.map((m) => {
              const billedPct =
                m.billedAmount > 0 ? Math.max(4, Math.round((m.billedAmount / maxRevenue) * 100)) : 0;
              const collectedPct =
                m.collectedAmount > 0
                  ? Math.max(4, Math.round((m.collectedAmount / maxRevenue) * 100))
                  : 0;
              return (
                <div key={m.monthKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{m.monthLabel}</span>
                    <span className="text-slate-500 tabular-nums">
                      وصول: {formatCurrencyToman(m.collectedAmount)} از{' '}
                      {formatCurrencyToman(m.billedAmount)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-300 rounded-full transition-all"
                        style={{ width: `${billedPct}%` }}
                      />
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all"
                        style={{ width: `${collectedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Patient Visits Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">تعداد مراجعین و پذیرش ماهانه</h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(analytics.onlineBookingsCount)} رزرو آنلاین
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 items-end h-52 border-b border-slate-100 pb-3">
            {activeMonths.map((m) => {
              const hPct =
                m.visitCount > 0 ? Math.max(14, Math.round((m.visitCount / maxVisits) * 100)) : 0;
              return (
                <div key={m.monthKey} className="flex flex-col items-center justify-end h-full gap-2">
                  <div className="text-xs font-bold text-slate-800 tabular-nums">
                    {toPersianDigits(m.visitCount)} ویزیت
                  </div>
                  <div
                    className="w-12 bg-teal-600/90 rounded-t-lg transition-all"
                    style={{ height: `${hPct}%` }}
                    title={`${m.monthLabel}: ${m.visitCount} نوبت`}
                  />
                  <div className="text-[11px] text-slate-500 text-center">{m.monthLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Doctor Performance & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">عملکرد به تفکیک دندانپزشک</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-3 px-4">نام پزشک</th>
                  <th className="py-3 px-4">کل نوبت‌ها</th>
                  <th className="py-3 px-4">تکمیل‌شده</th>
                  <th className="py-3 px-4">درآمد ایجادشده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.byDoctor.map((row) => (
                  <tr key={row.doctorId}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.doctorName}</td>
                    <td className="py-3 px-4 tabular-nums">{toPersianDigits(row.appointmentsCount)}</td>
                    <td className="py-3 px-4 tabular-nums">{toPersianDigits(row.completedCount)}</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-teal-700">
                      {formatCurrencyToman(row.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">خدمات درمانی پرتقاضا</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {analytics.topServices.map((srv) => (
              <div key={srv.title} className="px-5 py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{srv.title}</div>
                  <div className="text-slate-500 mt-0.5 tabular-nums">
                    {toPersianDigits(srv.count)} مورد انجام‌شده
                  </div>
                </div>
                <div className="font-mono tabular-nums font-semibold text-slate-800">
                  {formatCurrencyToman(srv.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
