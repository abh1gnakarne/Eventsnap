import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function MediaLightbox({ media, onClose, onUpdate }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(media.liked);
  const [likeCount, setLikeCount] = useState(media.like_count || 0);
  const [favourited, setFavourited] = useState(media.favourited);
  const [users, setUsers] = useState([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  useEffect(() => {
    loadComments();
    if (user) API.get('/auth/users').then(r => setUsers(r.data));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function loadComments() {
    const { data } = await API.get(`/media/${media.id}/comments`);
    setComments(data);
  }

  async function toggleLike() {
    if (!user) { toast.error('Login required'); return; }
    const { data } = await API.post(`/media/${media.id}/like`);
    setLiked(data.liked);
    setLikeCount(p => data.liked ? p + 1 : p - 1);
  }

  async function toggleFav() {
    if (!user) return;
    const { data } = await API.post(`/media/${media.id}/favourite`);
    setFavourited(data.favourited);
    toast.success(data.favourited ? 'Added to favourites ⭐' : 'Removed from favourites');
  }

  async function postComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await API.post(`/media/${media.id}/comments`, { content: newComment });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch { toast.error('Failed to post comment'); }
  }

  async function deleteComment(commentId) {
    await API.delete(`/media/${media.id}/comments/${commentId}`);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  async function tagUser(userId) {
    try {
      await API.post(`/media/${media.id}/tag`, { tagged_user_id: userId });
      toast.success('User tagged!');
      setShowTagMenu(false);
      setTagSearch('');
    } catch { toast.error('Failed to tag'); }
  }

  async function handleDownload() {
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
      toast.success('Downloaded with watermark 💧');
    } catch {}
  }

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(tagSearch.toLowerCase()) && u.id !== user?.id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ alignItems: 'stretch', padding: 0 }}>
      <div style={{
        display: 'flex', width: '100%', maxWidth: 1100, height: '90vh',
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        overflow: 'hidden', margin: 'auto'
      }}>
        {/* Media side */}
        <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 0 }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32,
            borderRadius: 99, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', zIndex: 10
          }}>✕</button>
          {media.file_type === 'photo' ? (
            <img src={`/media/${media.filename}`} alt={media.caption} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <video src={`/media/${media.filename}`} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 340, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Header info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{media.uploader_name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>@{media.uploader_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(media.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            {media.caption && <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 10 }}>{media.caption}</p>}
            {media.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {media.tags.map(t => <span key={t} className="tag">#{t}</span>)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleLike} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 99, border: '1px solid', cursor: 'pointer',
              borderColor: liked ? 'rgba(232,93,117,0.4)' : 'var(--border)',
              background: liked ? 'rgba(232,93,117,0.1)' : 'transparent',
              color: liked ? 'var(--accent2)' : 'var(--text2)', fontSize: 13, transition: 'all 0.15s'
            }}>
              {liked ? '❤️' : '🤍'} {likeCount}
            </button>
            <button onClick={toggleFav} style={{
              padding: '7px 12px', borderRadius: 99,
              border: '1px solid', borderColor: favourited ? 'rgba(255,200,0,0.4)' : 'var(--border)',
              background: favourited ? 'rgba(255,200,0,0.08)' : 'transparent',
              color: favourited ? '#ffc800' : 'var(--text2)', fontSize: 16, cursor: 'pointer'
            }}>⭐</button>
            <button onClick={handleDownload} style={{ padding: '7px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 16, cursor: 'pointer' }}>⬇️</button>
            {user && (
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button onClick={() => setShowTagMenu(!showTagMenu)} style={{ padding: '7px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
                  🏷️ Tag
                </button>
                {showTagMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', zIndex: 10 }}>
                    <input className="input" placeholder="Search users..." value={tagSearch} onChange={e => setTagSearch(e.target.value)} style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }} />
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {filteredUsers.slice(0, 8).map(u => (
                        <button key={u.id} onClick={() => tagUser(u.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, textAlign: 'left'
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{u.username[0].toUpperCase()}</div>
                          @{u.username}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
              Comments ({comments.length})
            </div>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
                No comments yet. Be first! 💬
              </div>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>{c.username?.[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>@{c.username}</span>
                    <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{c.content}</div>
                </div>
                {user && (user.id === c.user_id || user.role === 'admin') && (
                  <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Comment input */}
          {user && (
            <form onSubmit={postComment} style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input className="input" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, fontSize: 13 }} />
              <button type="submit" className="btn btn-primary btn-sm">Post</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
