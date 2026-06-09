import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tagged, setTagged] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [tab, setTab] = useState('tagged');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', username: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [me, tag, up] = await Promise.all([
        API.get('/auth/me'),
        API.get('/media/user/tagged'),
        API.get('/media/user/my-uploads')
      ]);
      setProfile(me.data);
      setEditForm({ bio: me.data.bio || '', username: me.data.username });
      setTagged(tag.data);
      setUploads(up.data);
    } catch {}
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      await API.put('/auth/me', editForm);
      toast.success('Profile updated!');
      setEditing(false);
      loadData();
    } catch { toast.error('Failed to update'); }
  }

  const roleColors = { admin: '#ff7961', photographer: 'var(--accent3)', member: '#48c78e', viewer: 'var(--text2)' };
  const roleEmojis = { admin: '⚡', photographer: '📷', member: '🎓', viewer: '👁️' };

  if (!profile) return <div className="loading-center"><div className="spinner" /></div>;

  const totalLikes = uploads.reduce((sum, m) => sum + (m.like_count || 0), 0);

  return (
    <div className="container" style={{ padding: '48px 24px', maxWidth: 900 }}>
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 32 }}>
            {profile.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} placeholder="Username" />
                <textarea className="input" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us about yourself..." />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26 }}>@{profile.username}</h2>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: `${roleColors[profile.role]}18`, color: roleColors[profile.role], fontSize: 13, fontWeight: 600 }}>
                    {roleEmojis[profile.role]} {profile.role}
                  </span>
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 12 }}>{profile.email}</div>
                {profile.bio && <p style={{ color: 'var(--text2)', marginBottom: 12 }}>{profile.bio}</p>}
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, padding: '16px 24px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
            {[
              { label: 'Uploads', val: uploads.length },
              { label: 'Total Likes', val: totalLikes },
              { label: 'Tagged In', val: tagged.length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { id: 'tagged', label: `🏷️ Tagged In (${tagged.length})` },
          { id: 'uploads', label: `📸 My Uploads (${uploads.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? 'white' : 'var(--text2)',
            transition: 'all 0.15s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {tab === 'tagged' && (
        tagged.length === 0 ? (
          <div className="empty-state"><div className="icon">🏷️</div><h3>Not tagged yet</h3><p>Ask your friends to tag you in photos!</p></div>
        ) : (
          <div className="media-grid">
            {tagged.map(m => (
              <div key={m.id} className="media-grid-item">
                <MediaCard media={m} onClick={setSelected} onUpdate={loadData} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'uploads' && (
        uploads.length === 0 ? (
          <div className="empty-state"><div className="icon">📸</div><h3>No uploads yet</h3><p>Start uploading photos to events!</p></div>
        ) : (
          <div className="media-grid">
            {uploads.map(m => (
              <div key={m.id} className="media-grid-item">
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 0' }}>📁 {m.event_name}</div>
                </div>
                <MediaCard media={m} onClick={setSelected} onUpdate={loadData} />
              </div>
            ))}
          </div>
        )
      )}

      {selected && <MediaLightbox media={selected} onClose={() => setSelected(null)} onUpdate={loadData} />}
    </div>
  );
}
