import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const categories = ['all', 'general', 'sports', 'cultural', 'workshop', 'trip', 'party', 'photoshoot', 'competition'];
const catColors = { general: 'badge-purple', sports: 'badge-blue', cultural: 'badge-pink', workshop: 'badge-green', trip: 'badge-purple', party: 'badge-pink' };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get('category') || 'all');
  const { user } = useAuth();

  useEffect(() => { loadEvents(); }, [search, category, sort]);

  async function loadEvents() {
    setLoading(true);
    try {
      const { data } = await API.get('/events', { params: { search, category: category === 'all' ? undefined : category, sort } });
      setEvents(data);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  }

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36 }}>Events</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>{events.length} events found</p>
        </div>
        {user && (user.role === 'admin' || user.role === 'photographer' || user.role === 'member') && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Event</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <input type="text" className="input" placeholder="🔍 Search events..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 250px', maxWidth: 340 }} />
        <select className="input" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 160 }}>
          <option value="created_at">Latest first</option>
          <option value="name">Name A-Z</option>
          <option value="date">By date</option>
        </select>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '6px 16px', borderRadius: 99, border: '1px solid',
            borderColor: category === c ? 'var(--accent)' : 'var(--border)',
            background: category === c ? 'rgba(124,92,191,0.15)' : 'transparent',
            color: category === c ? '#a07ad4' : 'var(--text2)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            textTransform: 'capitalize'
          }}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No events found</h3>
          <p>Try adjusting your filters or create a new event</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {events.map(ev => <EventCard key={ev.id} event={ev} catColors={catColors} />)}
        </div>
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadEvents(); }} />}
    </div>
  );
}

function EventCard({ event, catColors }) {
  return (
    <Link to={`/events/${event.id}`}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(124,92,191,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <div style={{ height: 200, background: 'var(--bg3)', position: 'relative', overflow: 'hidden' }}>
          {event.cover_image ? (
            <img src={`/media/${event.cover_image}`} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 48 }}>🎪</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>No cover image</span>
            </div>
          )}
          {!event.is_public && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.8)', padding: '3px 10px', borderRadius: 99, fontSize: 11 }}>🔒 Private</div>}
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>{event.name}</h3>
            <span className={`badge ${catColors[event.category] || 'badge-purple'}`} style={{ flexShrink: 0 }}>{event.category}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description || 'No description provided'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
            <span>📅 {event.date || 'Date TBD'}</span>
            <span>🖼️ {event.media_count || 0} media</span>
          </div>
          {event.creator_name && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>by @{event.creator_name}</div>}
        </div>
      </div>
    </Link>
  );
}

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'general', date: '', location: '', is_public: 'true' });
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (cover) fd.append('cover', cover);
      await API.post('/events', fd);
      toast.success('Event created!');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>Create Event</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Freshers Photoshoot 2024" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this event about?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="College auditorium" />
              </div>
              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select className="input" value={form.is_public} onChange={e => setForm({ ...form, is_public: e.target.value })}>
                  <option value="true">🌐 Public</option>
                  <option value="false">🔒 Private</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Cover Image</label>
              <input type="file" accept="image/*" className="input" onChange={e => setCover(e.target.files[0])} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Event'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
