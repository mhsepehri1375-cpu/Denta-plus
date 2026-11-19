import React, { useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Download,
  PieChart,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ClinicState, ReportPeriodType } from '../types/clinic';
import {
  computeAccountingReport,
  formatCompactToman,
  formatCurrencyToman,
  formatPersianDate,
  toPersianDigits,
} from '../utils/clinicLogic';

interface ReportsAnalyticsViewProps {
  state: ClinicState;
}

const PERIOD_OPTIONS: { id: ReportPeriodType; label: string }[] = [
  { id: 'daily', label: 'روزانه' },
  { id: 'weekly', label: 'هفتگی' },
  { id: 'monthly', label: 'ماهانه' },
  { id: 'quarterly', label: 'فصلی' },
  { id: 'yearly', label: 'سالانه' },
  { id: 'custom', label: 'بازه انتخابی' },
];

const DONUT_COLORS = [
  '#0D9488',
  '#E11D48',
  '#D97706',
  '#4F46E5',
  '#0284C7',
  '#64748B',
  '#059669',
];

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({ state }) => {
  const [period, setPeriod] = useState<ReportPeriodType>('monthly');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-11-30');
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);

  const report = computeAccountingReport(
    state.appointments,
    state.invoices,
    state.expenses,
    period,
    period === 'custom' ? { startDate, endDate } : undefined
  );

  const buckets = report.buckets;
  const maxMoney = Math.max(
    1,
    ...buckets.map((b) => Math.max(b.collectedAmount, b.expensesAmount, b.billedAmount, Math.abs(b.netProfit)))
  );
  const maxVisits = Math.max(1, ...buckets.map((b) => b.visitCount));

  const handleDownloadCsv = () => {
    const header = [
      'دوره',
      'درآمد فاکتورشده (تومان)',
      'وصولی نقدی (تومان)',
      'خریدهای مطب (تومان)',
      'هزینه‌های تنخواه (تومان)',
      'کل هزینه‌ها (تومان)',
      'سود خالص نقدی (تومان)',
      'تعداد مراجعین',
    ];
    const rows = buckets.map((b) => [
      b.label,
      String(b.billedAmount),
      String(b.collectedAmount),
      String(b.clinicPurchasesAmount),
      String(b.pettyCashAmount),
      String(b.expensesAmount),
      String(b.netProfit),
      String(b.visitCount),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Combo Bar + Profit Line Chart geometry
  const chartW = 680;
  const chartH = 260;
  const padL = 56;
  const padR = 20;
  const padT = 24;
  const padB = 42;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const stepW = buckets.length > 0 ? innerW / buckets.length : innerW;

  const yPos = (val: number) => {
    const clamped = Math.max(0, val);
    return padT + innerH - (clamped / maxMoney) * innerH;
  };

  const profitPoints = buckets
    .map((b, i) => {
      const cx = padL + i * stepW + stepW / 2;
      const cy = yPos(Math.max(0, b.netProfit));
      return `${cx},${cy}`;
    })
    .join(' ');

  // SVG Donut Geometry
  const donutRadius = 62;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativeShare = 0;

  // Visits SVG Area Chart geometry
  const vW = 540;
  const vH = 210;
  const vPadL = 36;
  const vPadR = 20;
  const vPadT = 22;
  const vPadB = 38;
  const vInnerW = vW - vPadL - vPadR;
  const vInnerH = vH - vPadT - vPadB;
  const vStep = buckets.length > 1 ? vInnerW / (buckets.length - 1) : vInnerW / 2;

  const visitLinePts = buckets.map((b, i) => {
    const x = buckets.length === 1 ? vPadL + vInnerW / 2 : vPadL + i * vStep;
    const y = vPadT + vInnerH - (b.visitCount / maxVisits) * vInnerH;
    return { x, y, count: b.visitCount, label: b.label };
  });

  const visitAreaPath =
    visitLinePts.length > 1
      ? `M ${visitLinePts[0].x},${vPadT + vInnerH} ` +
        visitLinePts.map((p) => `L ${p.x},${p.y}`).join(' ') +
        ` L ${visitLinePts[visitLinePts.length - 1].x},${vPadT + vInnerH} Z`
      : '';

  return (
    <div className="space-y-6">
      {/* Report Header & Period Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              گزارش‌دهی حرفه‌ای حسابداری، سود و زیان و عملکرد مطب
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تحلیل گرافیکی درآمد، وصولی، خریدها، تنخواه، سود خالص و روند مراجعین در بازه‌های زمانی مختلف
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ گزارش</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل (CSV)</span>
            </button>
          </div>
        </div>

        {/* Period Granularity Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div
            className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto"
            role="tablist"
            aria-label="بازه گزارش حسابداری"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={period === opt.id}
                onClick={() => {
                  setPeriod(opt.id);
                  setHoveredBucketIdx(null);
                }}
                className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  period === opt.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <CalendarRange className="w-4 h-4 text-teal-600 shrink-0" />
              <label className="text-slate-600">از:</label>
              <input
                type="date"
                aria-label="تاریخ شروع گزارش"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-9 px-2.5 py-1 font-mono bg-slate-50 border border-slate-300 rounded-lg"
              />
              <label className="text-slate-600">تا:</label>
              <input
                type="date"
                aria-label="تاریخ پایان گزارش"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-9 px-2.5 py-1 font-mono bg-slate-50 border border-slate-300 rounded-lg"
              />
              <span className="text-slate-500 tabular-nums">
                ({formatPersianDate(startDate)} تا {formatPersianDate(endDate)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5 Executive P&L KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">درآمد فاکتورشده</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 tabular-nums">
            {formatCurrencyToman(report.totalBilled)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            نرخ وصول {toPersianDigits(report.collectionRate)}٪
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">وصولی قطعی نقدی</div>
          <div className="text-lg font-bold text-emerald-700 mt-1.5 tabular-nums">
            {formatCurrencyToman(report.totalCollected)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            مطالبات: {formatCurrencyToman(report.totalOutstanding)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">کل خریدها و هزینه‌ها</div>
          <div className="text-lg font-bold text-rose-700 mt-1.5 tabular-nums">
            {formatCurrencyToman(report.totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            شامل {formatCurrencyToman(report.totalPettyCashExpenses)} تنخواه
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">سود خالص نقدی (P&amp;L)</div>
          <div
            className={`text-lg font-bold mt-1.5 tabular-nums ${
              report.netProfit >= 0 ? 'text-teal-700' : 'text-red-700'
            }`}
          >
            {formatCurrencyToman(report.netProfit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            حاشیه سود: {toPersianDigits(report.profitMarginPercent)}٪
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">مراجعین و نوبت‌ها</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 tabular-nums">
            {toPersianDigits(report.totalVisits)} نوبت
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {toPersianDigits(report.completedVisits)} تکمیل · {toPersianDigits(report.onlineBookingsCount)} آنلاین
          </div>
        </div>
      </div>

      {/* Primary Graphical Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* SVG Combo Financial Chart: Revenue vs Expenses + Net Profit Line */}
        <div className="xl:col-span-8 min-w-0 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                نمودار مقایسه‌ای وصولی، هزینه‌ها و سود خالص
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
                وصولی
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                خرید و تنخواه
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-900 inline-block" />
                روند سود خالص
              </span>
            </div>
          </div>

          {buckets.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-slate-500">
              تراکنشی در بازه زمانی انتخاب‌شده یافت نشد.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto" dir="ltr">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full min-w-[460px] h-64"
                  role="img"
                  aria-label="نمودار درآمد، هزینه و سود خالص"
                >
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padT + innerH - ratio * innerH;
                    const val = maxMoney * ratio;
                    return (
                      <g key={ratio}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        />
                        <text
                          x={padL - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 text-[10px]"
                        >
                          {formatCompactToman(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars per bucket */}
                  {buckets.map((b, i) => {
                    const cx = padL + i * stepW + stepW / 2;
                    const barW = Math.min(22, Math.max(8, stepW * 0.24));
                    const colH = (b.collectedAmount / maxMoney) * innerH;
                    const expH = (b.expensesAmount / maxMoney) * innerH;
                    const isHover = hoveredBucketIdx === i;

                    return (
                      <g
                        key={b.key}
                        onMouseEnter={() => setHoveredBucketIdx(i)}
                        onMouseLeave={() => setHoveredBucketIdx(null)}
                        className="cursor-pointer"
                      >
                        {isHover && (
                          <rect
                            x={padL + i * stepW + 2}
                            y={padT}
                            width={stepW - 4}
                            height={innerH}
                            fill="#F1F5F9"
                            rx={6}
                          />
                        )}
                        <rect
                          x={cx - barW - 2}
                          y={padT + innerH - colH}
                          width={barW}
                          height={Math.max(0, colH)}
                          rx={4}
                          fill="#0D9488"
                        />
                        <rect
                          x={cx + 2}
                          y={padT + innerH - expH}
                          width={barW}
                          height={Math.max(0, expH)}
                          rx={4}
                          fill="#F43F5E"
                        />
                        <text
                          x={cx}
                          y={chartH - 14}
                          textAnchor="middle"
                          className="fill-slate-600 text-[10px]"
                        >
                          {b.label.length > 14 ? `${b.label.slice(0, 13)}…` : b.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Net Profit Line */}
                  {buckets.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      points={profitPoints}
                    />
                  )}
                  {buckets.map((b, i) => {
                    const cx = padL + i * stepW + stepW / 2;
                    const cy = yPos(Math.max(0, b.netProfit));
                    return (
                      <circle
                        key={`pt-${b.key}`}
                        cx={cx}
                        cy={cy}
                        r={hoveredBucketIdx === i ? 5 : 3.5}
                        fill="#FFFFFF"
                        stroke="#0F172A"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Hover / Active Period Detail Strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                {hoveredBucketIdx !== null && buckets[hoveredBucketIdx] ? (
                  <>
                    <span className="font-bold text-slate-900">
                      جزئیات {buckets[hoveredBucketIdx].label}:
                    </span>
                    <span className="text-emerald-700">
                      وصولی: {formatCurrencyToman(buckets[hoveredBucketIdx].collectedAmount)}
                    </span>
                    <span className="text-rose-700">
                      هزینه‌ها: {formatCurrencyToman(buckets[hoveredBucketIdx].expensesAmount)}
                    </span>
                    <span className="font-bold text-slate-900">
                      سود خالص: {formatCurrencyToman(buckets[hoveredBucketIdx].netProfit)}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">
                    برای مشاهده جزئیات دقیق هر ستون، نشانگر ماوس را روی نمودار قرار دهید.
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* SVG Expense Donut Chart */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ترکیب هزینه‌ها، خریدها و تنخواه
            </h3>
          </div>

          {report.expenseBreakdown.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              هزینه‌ای در این بازه ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <svg
                  viewBox="0 0 180 180"
                  className="w-44 h-44"
                  role="img"
                  aria-label="نمودار دایره‌ای تفکیک هزینه‌ها"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="22"
                  />
                  {report.expenseBreakdown.map((item, idx) => {
                    const frac = report.totalExpenses > 0 ? item.amount / report.totalExpenses : 0;
                    const dash = frac * donutCircumference;
                    const offset = -cumulativeShare * donutCircumference;
                    cumulativeShare += frac;
                    return (
                      <circle
                        key={item.category}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        fill="none"
                        stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                        strokeWidth="22"
                        strokeDasharray={`${dash} ${donutCircumference - dash}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 90 90)"
                      />
                    );
                  })}
                  <text
                    x="90"
                    y="86"
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px]"
                  >
                    کل هزینه‌ها
                  </text>
                  <text
                    x="90"
                    y="104"
                    textAnchor="middle"
                    className="fill-slate-900 text-xs font-bold"
                  >
                    {formatCompactToman(report.totalExpenses)} تومان
                  </text>
                </svg>
              </div>

              <div className="space-y-2 text-xs">
                {report.expenseBreakdown.map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-semibold text-slate-900">
                        {formatCurrencyToman(item.amount)}
                      </span>
                      <span className="text-slate-400">({toPersianDigits(item.sharePercent)}٪)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visits Trend & Periodic P&L Statement Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visits Area Chart */}
        <div className="lg:col-span-5 min-w-0 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">روند مراجعین و نوبت‌های مطب</h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(report.totalVisits)} نوبت
            </span>
          </div>

          {visitLinePts.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-500">
              نوبتی در این بازه ثبت نشده است.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" dir="ltr">
              <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full min-w-[320px] h-52">
                <defs>
                  <linearGradient id="visitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((r) => {
                  const y = vPadT + vInnerH - r * vInnerH;
                  return (
                    <g key={r}>
                      <line x1={vPadL} y1={y} x2={vW - vPadR} y2={y} stroke="#E2E8F0" />
                      <text x={vPadL - 6} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                        {toPersianDigits(Math.round(maxVisits * r))}
                      </text>
                    </g>
                  );
                })}
                {visitAreaPath && <path d={visitAreaPath} fill="url(#visitAreaGrad)" />}
                {visitLinePts.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="2.5"
                    points={visitLinePts.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                )}
                {visitLinePts.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r={4} fill="#0D9488" />
                    <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-slate-700 text-[10px] font-bold">
                      {toPersianDigits(p.count)}
                    </text>
                    <text x={p.x} y={vH - 12} textAnchor="middle" className="fill-slate-500 text-[9px]">
                      {p.label.length > 12 ? `${p.label.slice(0, 11)}…` : p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Periodic P&L Statement Table */}
        <div className="lg:col-span-7 min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                صورت سود و زیان تفکیکی ({PERIOD_OPTIONS.find((p) => p.id === period)?.label})
              </h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {toPersianDigits(buckets.length)} دوره
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-3 px-3.5">دوره</th>
                  <th className="py-3 px-3.5">وصولی</th>
                  <th className="py-3 px-3.5">خرید مطب</th>
                  <th className="py-3 px-3.5">تنخواه</th>
                  <th className="py-3 px-3.5">سود خالص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buckets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      داده‌ای موجود نیست.
                    </td>
                  </tr>
                ) : (
                  buckets.map((b) => (
                    <tr key={b.key} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {b.label}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                        {formatCurrencyToman(b.collectedAmount)}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatCurrencyToman(b.clinicPurchasesAmount)}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-amber-700 whitespace-nowrap">
                        {formatCurrencyToman(b.pettyCashAmount)}
                      </td>
                      <td
                        className={`py-3 px-3.5 font-mono tabular-nums font-bold whitespace-nowrap ${
                          b.netProfit >= 0 ? 'text-teal-700' : 'text-red-700'
                        }`}
                      >
                        {formatCurrencyToman(b.netProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Doctor Performance & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">عملکرد مالی به تفکیک دندانپزشک</h3>
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
                {report.byDoctor.map((row) => (
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
            <h3 className="text-sm font-bold text-slate-900">خدمات درمانی پرتقاضا در این بازه</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {report.topServices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">موردی ثبت نشده است.</div>
            ) : (
              report.topServices.map((srv) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
