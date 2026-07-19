import React, { useEffect } from 'react';
import { ImageIcon, MapPin, Clock, CalendarDays } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

// Student-facing Events page — read-only listing backed by /api/events
// (server.js). Posters are uploaded by staff in the Admin/Faculty portal
// (see src/admin/resourceConfigs.js -> events -> posterImage field) and
// stored as base64 data URLs on the Event row itself.
function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(value) {
  const target = new Date(value);
  if (isNaN(target.getTime())) return null;
  const diffMs = target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default function EventsTab() {
  const { events, eventsLoading, loadEvents } = useCampus();

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <h4 className="font-mono text-muted" style={{ fontSize: '10px', fontWeight: 'bold' }}>CAMPUS EVENTS</h4>

      {eventsLoading && (
        <p className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11px', padding: '2rem 0' }}>
          Loading events...
        </p>
      )}

      {!eventsLoading && events.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11px', padding: '2rem 0' }}>
          No events posted yet. Check back soon.
        </p>
      )}

      {!eventsLoading && events.length > 0 && (
        <div className="events-grid">
          {events.map((event) => {
            const remaining = daysUntil(event.deadline);
            return (
              <div key={event.id} className="event-poster-card">
                <div className="event-poster-media">
                  {event.posterImage ? (
                    <img src={event.posterImage} alt={`${event.name} poster`} />
                  ) : (
                    <div className="event-poster-placeholder">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <span className="event-poster-type-badge">{event.type}</span>
                </div>
                <div className="event-poster-body">
                  <p className="event-poster-title">{event.name}</p>
                  <div className="event-poster-meta-row">
                    <CalendarDays className="w-3 h-3 text-cyan" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="event-poster-meta-row">
                    <MapPin className="w-3 h-3 text-cyan" />
                    <span>{event.location}</span>
                  </div>
                  <p className="event-poster-desc">{event.description}</p>
                  <span className="event-poster-deadline">
                    <Clock className="w-2.5 h-2.5" style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: '-1px' }} />
                    {remaining === null
                      ? `Register by ${formatDate(event.deadline)}`
                      : remaining > 0
                        ? `${remaining} day${remaining === 1 ? '' : 's'} left to register`
                        : remaining === 0
                          ? 'Registration closes today'
                          : 'Registration closed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
