import React, { useState } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function MediaCard({ media, onUpdate, onClick }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(media.liked);
  const [likeCount, setLikeCount] = useState(media.like_count || 0);
  const [favourited, setFavourited] = useState(media.favourited);

  async function toggleLike(e) {
    e.stopPropagation();
    if (!user) { toast.error('Please login to like'); return; }
    try {
      const { data } = await API.post(`/media/${media.id}/like`);
      setLiked(data.liked);
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
    } catch {}
  }

  async function toggleFav(e) {
    e.stopPropagation();
    if (!user) { toast.error('Please login'); return; }
    try {
      const { data } = await API.post(`/media/${media.id}/favourite`);
      setFavourited(data.favourited);
      toast.success(data.favourited ? 'Added to favourites' : 'Removed from favourites');
    } catch {}
  }

  async function handleDownload(e) {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/media/download/${media.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventsnap_${media.original_name || media.filename}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started with watermark!');
    } catch { toast.error('Download failed'); }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm('Delete this photo?')) return;
    try {
      await API.delete(`/media/${media.id}`);
      toast.success('Deleted');
      onUpdate && onUpdate();
    } catch { toast.error('Failed to delete'); }
  }

  const src = `/media/${media.filename}`;

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg3)', border: '1px solid var(--border)', transition: 'all 0.2s' }}
      onClick={() => onClick && onClick(media)}
      onMouseEnter={e => e.currentTarget.querySelector('.media-overlay').style.opacity = 1}
      onMouseLeave={e => e.currentTarget.querySelector('.media-overlay').style.opacity = 0}
    >
      {media.file_type === 'photo' ? (
        <img src={src} alt={media.caption || 'photo'} loading="lazy"
          style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
      ) : (
        <video src={src} style={{ width: '100%', display: 'block' }} controls onClick={e => e.stopPropagation()} />
      )}

      {/* Overlay */}
      <div className="media-overlay" style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
        opacity: 0, transition: 'opacity 0.2s',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12
      }}>
        {/* Caption & tags */}
        {(media.caption || (media.tags?.length > 0)) && (
          <div style={{ marginBottom: 8 }}>
            {media.caption && <div style={{ fontSize: 12, color: 'white', marginBottom: 4, fontWeight: 500 }}>{media.caption}</div>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {media.tags?.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(124,92,191,0.7)', borderRadius: 99, color: 'white' }}>#{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={toggleLike} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 99, border: 'none',
            background: liked ? 'rgba(232,93,117,0.8)' : 'rgba(0,0,0,0.5)',
            color: 'white', fontSize: 12, cursor: 'pointer'
          }}>
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <button onClick={toggleFav} style={{ padding: '5px 8px', borderRadius: 99, border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 14, cursor: 'pointer' }}>
            {favourited ? '⭐' : '☆'}
          </button>
          <button onClick={handleDownload} style={{ padding: '5px 8px', borderRadius: 99, border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 14, cursor: 'pointer' }}>⬇️</button>
          {user && (user.id === media.uploader_id || user.role === 'admin') && (
            <button onClick={handleDelete} style={{ padding: '5px 8px', borderRadius: 99, border: 'none', background: 'rgba(232,93,117,0.6)', color: 'white', fontSize: 14, cursor: 'pointer', marginLeft: 'auto' }}>🗑️</button>
          )}
        </div>
      </div>

      {/* Comment count badge */}
      {media.comment_count > 0 && (
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: 'white' }}>
          💬 {media.comment_count}
        </div>
      )}
    </div>
  );
}
