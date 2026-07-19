import React, { useEffect } from 'react';
import { CalendarClock, MapPin, User as UserIcon } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

// Class Timetable — freshers-portal requirement: "access to information
// about ... timetables". Read-only, backed by /api/timetable (defaults to
// the active student's own department/year — see server.js), managed by
// staff in the Admin/Faculty portal (see src/admin/resourceConfigs.js).
// Distinct from the AI-generated exam revision plans shown in the
// "Academic OS" tab (StudyPlanWidget/dashboard.activePlans) — this is the
// actual fixed weekly class schedule.
export default function TimetableWidget() {
  const { student, timetable, timetableLoading, loadTimetable } = useCampus();

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const byDay = timetable.reduce((acc, slot) => {
    (acc[slot.day] = acc[slot.day] || []).push(slot);
    return acc;
  }, {});
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = dayOrder.filter((d) => byDay[d]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 className="font-mono text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CalendarClock className="w-3.5 h-3.5 text-cyan" />
          <span>CLASS TIMETABLE{student ? ` — ${student.department}, Year ${student.year}` : ''}</span>
        </h4>
      </div>

      {timetableLoading && (
        <p className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11px', padding: '1.5rem 0' }}>Loading timetable...</p>
      )}

      {!timetableLoading && days.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11px', padding: '1.5rem 0' }}>No timetable published for your department/year yet.</p>
      )}

      {!timetableLoading && days.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {days.map((day) => (
            <div key={day} className="info-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p className="font-display text-white" style={{ fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>{day}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {byDay[day].map((slot) => (
                  <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.5rem 0.65rem' }}>
                    <span className="font-mono text-cyan" style={{ fontSize: '9.5px', fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: '82px' }}>
                      {slot.startTime}&ndash;{slot.endTime}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
                      <span style={{ fontSize: '11.5px', color: '#f1f5f9', fontWeight: 600 }}>{slot.subject}</span>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UserIcon className="w-2.5 h-2.5" /> {slot.faculty}
                        </span>
                        <span className="text-muted" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin className="w-2.5 h-2.5" /> {slot.room}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
