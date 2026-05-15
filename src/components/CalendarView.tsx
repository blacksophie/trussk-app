import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  CalendarDays,
  Trash2,
} from 'lucide-react';

import { Candidate, Interview } from '../types';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface CalendarViewProps {
  candidates?: Candidate[];
  interviews?: Interview[];
  userId?: string;
  jobId?: string;
  onScheduleInterview?: (data: Omit<Interview, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteInterview?: (id: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  candidates = [],
  interviews = [],
  userId = '',
  jobId,
  onScheduleInterview,
  onDeleteInterview,
}) => {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const openModal = (day?: number) => {
    if (day !== undefined) {
      const m = String(currentMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      setModalDefaultDate(`${currentYear}-${m}-${d}`);
    } else {
      setModalDefaultDate(undefined);
    }
    setShowModal(true);
  };

  const getInterviewsForDay = (day: number) =>
    interviews.filter(iv => {
      const [y, m, d] = iv.date.split('-').map(Number);
      return y === currentYear && m - 1 === currentMonth && d === day;
    });

  // First day of month weekday offset
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const gridCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const selectedDayInterviews = getInterviewsForDay(selectedDay);
  const selectedDayOfWeek = new Date(currentYear, currentMonth, selectedDay).getDay();
  const selectedDayLabel = `${DAY_NAMES[selectedDayOfWeek]}, ${MONTH_NAMES[currentMonth]} ${selectedDay}`;

  return (
    <>
      <div className="w-full h-full flex flex-col bg-[#fafafa] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Calendar</h1>
            <p className="text-sm text-gray-400 mt-0.5">Schedule and manage candidate interviews</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-30 text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-200 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Calendar Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS.map(day => (
                  <div key={day} className="py-3 text-center">
                    <span className="text-xs font-medium text-gray-400">{day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-gray-50">
                {gridCells.map((day, i) => {
                  const dayInterviews = day !== null ? getInterviewsForDay(day) : [];
                  const hasEvent = dayInterviews.length > 0;
                  const isSelected = day === selectedDay;
                  const isToday =
                    day !== null &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear() &&
                    day === today.getDate();

                  return (
                    <div
                      key={i}
                      onClick={() => day !== null && setSelectedDay(day)}
                      className={`min-h-22 p-2.5 flex flex-col gap-1.5 transition-all ${
                        day !== null ? 'cursor-pointer hover:bg-gray-50' : ''
                      } ${isSelected && day !== null ? 'bg-brand/3 ring-2 ring-inset ring-brand/20' : ''}`}
                    >
                      {day !== null && (
                        <>
                          <span
                            className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                              isToday
                                ? 'bg-brand text-white'
                                : isSelected
                                ? 'text-brand'
                                : 'text-gray-700'
                            }`}
                          >
                            {day}
                          </span>

                          {hasEvent && (
                            <div className="flex flex-col gap-1">
                              {dayInterviews.map(ev => (
                                <div
                                  key={ev.id}
                                  className="px-2 py-1 rounded-md bg-brand/10 border border-brand/15"
                                >
                                  <p className="text-[10px] font-semibold text-brand truncate leading-tight">
                                    {ev.candidateName.split(' ')[0]}
                                  </p>
                                  <p className="text-[9px] text-brand/60 truncate leading-tight">{ev.time}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agenda Panel */}
          <div className="w-full md:w-80 lg:w-96 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-white overflow-y-auto">
            <div className="px-5 py-5 border-b border-gray-50">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Selected Day</p>
              <h2 className="text-sm font-semibold text-gray-900">{selectedDayLabel}</h2>
            </div>

            <div className="px-5 py-4 space-y-3">
              {selectedDayInterviews.length > 0 ? (
                selectedDayInterviews.map(ev => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand/20 transition-all"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm overflow-hidden shrink-0">
                            {ev.candidateAvatarUrl ? (
                              <img src={ev.candidateAvatarUrl} alt={ev.candidateName} className="w-full h-full object-cover" />
                            ) : (
                              ev.candidateInitials
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{ev.candidateName}</p>
                            <p className="text-xs text-gray-400">{ev.type}</p>
                          </div>
                        </div>
                        {onDeleteInterview && ev.id && (
                          <button
                            onClick={() => onDeleteInterview(ev.id!)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 pb-3 border-b border-gray-50 mb-3">
                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                          <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center shrink-0">
                            <Clock className="w-3 h-3 text-gray-400" />
                          </div>
                          <span>{ev.time} &middot; {ev.duration}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                          <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center shrink-0">
                            {ev.locationType === 'Video' ? (
                              <Video className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Phone className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <span>{ev.locationType === 'Video' ? 'Video call' : 'Phone call'}</span>
                        </div>
                      </div>

                      {ev.locationType === 'Video' && ev.meetingUrl ? (
                        <a
                          href={ev.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90 transition-all text-center"
                        >
                          Join Interview
                        </a>
                      ) : ev.locationType === 'Video' ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed"
                        >
                          No meeting link
                        </button>
                      ) : (
                        <div className="w-full py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold text-center">
                          {ev.candidateName.split(' ')[0]}'s phone
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="mt-6 flex flex-col items-center text-center px-4 py-10 rounded-xl border-2 border-dashed border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <CalendarDays className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No interviews scheduled</p>
                  <p className="text-xs text-gray-400 mb-4">Nothing on the books for this day.</p>
                  <button
                    onClick={() => openModal(selectedDay)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule Interview
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && onScheduleInterview && (
        <ScheduleInterviewModal
          candidates={candidates}
          defaultDate={modalDefaultDate}
          userId={userId}
          jobId={jobId}
          onSchedule={onScheduleInterview}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
