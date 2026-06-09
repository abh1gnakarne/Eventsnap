import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';
import UploadModal from '../components/UploadModal';
import toast from 'react-hot-toast';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTag, setActiveTag] = useState('');

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => { loadMedia(); }, [search, activeTag]);

  async function loadData() {
    try {
      const [ev, med] = await Promise.all([
        API.get(`/events/${id}`),
        API.get(`/media/event/${id}`)
      ]);
      setEvent(ev.data);
      setMedia(med.data);
    } catch (err) {
      if (err.response?.status === 403) toast.error('Private event');
      else toast.error('Event not found');
      navigate('/events');
    } finally { setLoading(false); }
  }

  async function loadMedia() {
    try {
      const { data } = await API.get(`/media/event/${id}`, { params: { search: search || undefined, tag: activeTag || undefined } });
      setMedia(data);
    } catch {}
  }

  async function deleteEvent() {
    if (!window.confirm('Delete this entire event and all its photos?')) return;
    try {
      await API.delete(`/events/${id}`);
      toast.success('Event deleted');
      navigate('/events');
    } catch { toast.error('Failed'); }
  }

  // Collect all unique tags
  const allTags = [...new Set(media.flatMap(m => m.tags || []))].slice(0, 20);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!event) return null;

  const canUpload = user && (user.role === 'admin' || user.role === 'photographer' || user.role === 'member');
  const canDelete = user && (user.id === event.created_by || user.role === 'admin');

  return (
    <div>
      {/* Event header */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', background: 'var(--bg3)' }}>
        {event.cover_image ? (
          <>
            <img src={`/media/${event.cover_image}`} alt={event.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4)' }} />
          </>
        ) : (
          <div style={{ height: '100%', background: 'linear-gradient(135deg, #12121a, #1a1a26)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,15,1) 0%, rgba(10,10,15,0.3) 60%, transparent 100%)' }} />
        <div className="container" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className="badge badge-purple">{event.category}</span>
                {!event.is_public && <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text2)' }}>🔒 Private</span>}
              </div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', marginBottom: 8 }}>{event.name}</h1>
              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
                {event.date && <span>📅 {event.date}</span>}
                {event.location && <span>📍 {event.location}</span>}
                <span>👤 {event.creator_name}</span>
                <span>🖼️ {media.length} photos</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canUpload && <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload</button>}
              {canDelete && <button className="btn btn-danger" onClick={deleteEvent}>🗑️ Delete</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {event.description && (
          <p style={{ color: 'var(--text2)', maxWidth: 640, marginBottom: 28, fontSize: 15 }}>{event.description}</p>
        )}

        {/* Search & filter */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
          <input type="text" className="input" placeholder="🔍 Search in this event..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 240px', maxWidth: 340 }} />
          <span style={{ fontSize: 14, color: 'var(--text3)' }}>{media.length} items</span>
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <button onClick={() => setActiveTag('')} style={{
              padding: '4px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
              border: '1px solid', borderColor: !activeTag ? 'var(--accent)' : 'var(--border)',
              background: !activeTag ? 'rgba(124,92,191,0.15)' : 'transparent',
              color: !activeTag ? '#a07ad4' : 'var(--text2)'
            }}>All</button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag === activeTag ? '' : tag)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: '1px solid', borderColor: activeTag === tag ? 'var(--accent)' : 'var(--border)',
                background: activeTag === tag ? 'rgba(124,92,191,0.15)' : 'transparent',
                color: activeTag === tag ? '#a07ad4' : 'var(--text2)'
              }}>#{tag}</button>
            ))}
          </div>
        )}

        {/* Masonry gallery */}
        {media.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📸</div>
            <h3>{search || activeTag ? 'No results found' : 'No media yet'}</h3>
            <p>{canUpload ? 'Upload some photos to get started!' : 'Check back later for photos'}</p>
            {canUpload && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowUpload(true)}>+ Upload Photos</button>}
          </div>
        ) : (
          <div className="media-grid">
            {media.map(m => (
              <div key={m.id} className="media-grid-item">
                <MediaCard media={m} onClick={setSelectedMedia} onUpdate={loadMedia} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMedia && (
        <MediaLightbox media={selectedMedia} onClose={() => setSelectedMedia(null)} onUpdate={loadMedia} />
      )}
      {showUpload && (
        <UploadModal eventId={id} eventName={event.name} onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); loadMedia(); }} />
      )}
    </div>
  );
}
