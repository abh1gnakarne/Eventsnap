import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';

export default function MyPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await API.get('/media/user/my-uploads');
      setPhotos(data);
    } catch {} finally { setLoading(false); }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const totalLikes = photos.reduce((s, m) => s + (m.like_count || 0), 0);
  const totalViews = photos.reduce((s, m) => s + (m.views || 0), 0);

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36 }}>🖼️ My Photos</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>All your uploaded content</p>
        </div>
        <div style={{ display: 'flex', gap: 20, padding: '16px 24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          {[
            { label: 'Uploads', val: photos.length },
            { label: 'Total Likes', val: totalLikes },
            { label: 'Total Views', val: totalViews },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📸</div>
          <h3>No uploads yet</h3>
          <p>Go to an event and start uploading!</p>
        </div>
      ) : (
        <div className="media-grid">
          {photos.map(m => (
            <div key={m.id} className="media-grid-item">
              {m.event_name && <div style={{ fontSize: 11, color: 'var(--text3)', padding: '0 2px 4px' }}>📁 {m.event_name}</div>}
              <MediaCard media={m} onClick={setSelected} onUpdate={load} />
            </div>
          ))}
        </div>
      )}

      {selected && <MediaLightbox media={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}
