import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';

export default function Favourites() {
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadFavs(); }, []);

  async function loadFavs() {
    try {
      const { data } = await API.get('/media/user/favourites');
      setFavs(data);
    } catch {} finally { setLoading(false); }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36 }}>⭐ Favourites</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>{favs.length} saved photos</p>
      </div>

      {favs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⭐</div>
          <h3>No favourites yet</h3>
          <p>Star photos you love while browsing events!</p>
        </div>
      ) : (
        <div className="media-grid">
          {favs.map(m => (
            <div key={m.id} className="media-grid-item">
              <MediaCard media={{ ...m, favourited: true }} onClick={setSelected} onUpdate={loadFavs} />
            </div>
          ))}
        </div>
      )}

      {selected && <MediaLightbox media={selected} onClose={() => setSelected(null)} onUpdate={loadFavs} />}
    </div>
  );
}
