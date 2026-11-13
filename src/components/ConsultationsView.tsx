import React, { useState } from 'react';
import { CalendarPlus, MessageCircle, Send } from 'lucide-react';
import type { ClinicState, ConsultationThread, StaffMember } from '../types/clinic';
import { toPersianDigits } from '../utils/clinicLogic';

interface ConsultationsViewProps {
  state: ClinicState;
  currentStaff: StaffMember | null;
  onReplyThread: (threadId: string, senderName: string, text: string) => void;
  onConvertToAppointment: (thread: ConsultationThread) => void;
}

const QUICK_REPLIES = [
  'سلام وقت بخیر. برای بررسی دقیق‌تر، تهیه گرافی OPG پیش از ویزیت توصیه می‌شود.',
  'بله امکان انجام این درمان در یک جلسه وجود دارد. می‌توانید از بخش رزرو آنلاین نوبت بگیرید.',
  'در صورت درد شدید شبانه، لطفاً جهت معاینه اورژانسی در اولین زمان به کلینیک مراجعه نمایید.',
];

export const ConsultationsView: React.FC<ConsultationsViewProps> = ({
  state,
  currentStaff,
  onReplyThread,
  onConvertToAppointment,
}) => {
  const [selectedId, setSelectedId] = useState<string>(state.consultations[0]?.id ?? '');
  const [replyText, setReplyText] = useState('');

  const activeThread =
    state.consultations.find((c) => c.id === selectedId) ?? state.consultations[0] ?? null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    onReplyThread(activeThread.id, currentStaff?.name ?? 'پزشک کلینیک', replyText.trim());
    setReplyText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Threads List */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">گفتگوهای مشاوره پیش از درمان</h3>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {toPersianDigits(state.consultations.length)}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {state.consultations.map((thread) => {
            const isSelected = activeThread?.id === thread.id;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={`w-full text-right p-4 transition-colors space-y-1 ${
                  isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{thread.patientName}</span>
                  <span
                    className={`text-[11px] font-medium ${
                      thread.status === 'open'
                        ? 'text-amber-700'
                        : thread.status === 'converted'
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {thread.status === 'open'
                      ? 'منتظر پاسخ'
                      : thread.status === 'converted'
                      ? 'تبدیل به نوبت'
                      : 'بسته‌شده'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-1">{thread.subject}</p>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {thread.doctorName} · {toPersianDigits(thread.updatedAt)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[520px]">
        {!activeThread ? (
          <div className="p-10 text-center text-sm text-slate-500 m-auto">
            گفتگویی برای نمایش انتخاب نشده است.
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeThread.patientName}</h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {toPersianDigits(activeThread.patientPhone)} · موضوع: {activeThread.subject}
                </p>
              </div>
              {activeThread.status !== 'converted' && (
                <button
                  type="button"
                  onClick={() => onConvertToAppointment(activeThread)}
                  className="min-h-9 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>تبدیل مشاوره به نوبت حضوری</span>
                </button>
              )}
            </div>

            <div className="flex-1 p-5 space-y-3 bg-slate-50/50 overflow-y-auto max-h-[380px]">
              {activeThread.messages.map((msg) => {
                const isDoctor = msg.sender === 'doctor';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isDoctor ? 'mr-auto items-end' : 'ml-auto items-start'
                    }`}
                  >
                    <div className="text-[11px] text-slate-500 mb-1 tabular-nums">
                      {msg.senderName} · {toPersianDigits(msg.createdAt)}
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed border ${
                        isDoctor
                          ? 'bg-teal-600 text-white border-teal-600 rounded-tl-sm'
                          : 'bg-white text-slate-800 border-slate-200 rounded-tr-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md px-2.5 py-1 transition-colors text-right"
                  >
                    پاسخ آماده {toPersianDigits(i + 1)}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ تخصصی پزشک یا مشاور را بنویسید..."
                  className="flex-1 min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                />
                <button
                  type="submit"
                  className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال پاسخ</span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
