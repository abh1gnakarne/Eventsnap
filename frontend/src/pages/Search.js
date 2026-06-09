import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searched, setSearched] = useState(false);

  const suggestedTags = ['sports', 'nature', 'portrait', 'crowd', 'event', 'outdoor', 'candid', 'celebration', 'campus', 'music'];

  async function doSearch(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await API.get('/media/search/all', { params: { q } });
      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  async function searchByTag(tag) {
    setQuery(tag);
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await API.get('/media/search/all', { params: { tag } });
      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 40, marginBottom: 8 }}>
          🔍 Search
        </h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Find photos by event name, tag, caption, or photographer</p>

        <form onSubmit={e => { e.preventDefault(); doSearch(); }} style={{ display: 'flex', gap: 12 }}>
          <input type="text" className="input" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="mountains, sports, freshers night..."
            style={{ flex: 1, fontSize: 16, padding: '12px 16px' }} autoFocus />
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>Search</button>
        </form>
      </div>

      {/* Suggested tags */}
      {!searched && (
        <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, textAlign: 'center' }}>Popular tags</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {suggestedTags.map(t => (
              <button key={t} onClick={() => searchByTag(t)} style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 13,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,191,0.1)'; e.currentTarget.style.color = '#a07ad4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
              >#{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : searched && results.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No results for "{query}"</h3>
          <p>Try different keywords or browse by tag</p>
        </div>
      ) : results.length > 0 && (
        <div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
            Found <strong style={{ color: 'var(--text)' }}>{results.length}</strong> results for "{query}"
          </div>
          <div className="media-grid">
            {results.map(m => (
              <div key={m.id} className="media-grid-item">
                <MediaCard media={m} onClick={setSelected} onUpdate={() => doSearch()} />
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && <MediaLightbox media={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
