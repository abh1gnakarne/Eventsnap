import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function UploadModal({ eventId, eventName, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted.map(f => Object.assign(f, { preview: URL.createObjectURL(f) }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'video/*': [] }, multiple: true
  });

  const removeFile = (idx) => setFiles(prev => {
    URL.revokeObjectURL(prev[idx].preview);
    return prev.filter((_, i) => i !== idx);
  });

  async function upload() {
    if (!files.length) { toast.error('Add some files first'); return; }
    setLoading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('event_id', eventId);
      fd.append('caption', caption);
      fd.append('tags', tags);
      fd.append('is_public', String(isPublic));
      files.forEach(f => fd.append('files', f));

      await API.post('/media/upload', fd, {
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100))
      });
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded! 🎉`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>Upload Media</h2>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>to {eventName}</div>
          </div>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <div className="modal-body">
          {/* Dropzone */}
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '40px 20px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            background: isDragActive ? 'rgba(124,92,191,0.06)' : 'var(--bg3)',
            marginBottom: 20
          }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {isDragActive ? 'Drop files here!' : 'Drag & drop photos/videos'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>or click to browse · max 20 files · 50MB each</div>
          </div>

          {/* Preview grid */}
          {files.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 20 }}>
              {files.map((f, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)' }}>
                  {f.type.startsWith('image/') ? (
                    <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎥</div>
                  )}
                  <button onClick={() => removeFile(i)} style={{
                    position: 'absolute', top: 3, right: 3, width: 18, height: 18,
                    borderRadius: 99, background: 'rgba(232,93,117,0.9)', border: 'none',
                    color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Caption</label>
              <input className="input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe these photos..." />
            </div>
            <div className="form-group">
              <label className="form-label">Extra Tags (comma separated)</label>
              <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="sunset, portrait, candid" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: true, l: '🌐 Public' }, { v: false, l: '🔒 Private' }].map(opt => (
                <button key={String(opt.v)} type="button" onClick={() => setIsPublic(opt.v)} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer',
                  borderColor: isPublic === opt.v ? 'var(--accent)' : 'var(--border)',
                  background: isPublic === opt.v ? 'rgba(124,92,191,0.1)' : 'transparent',
                  color: isPublic === opt.v ? '#a07ad4' : 'var(--text2)', fontSize: 14, fontWeight: 500
                }}>{opt.l}</button>
              ))}
            </div>
          </div>

          {/* AI tagging notice */}
          <div style={{ padding: '10px 14px', background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent3)', marginBottom: 16 }}>
            🤖 AI will automatically generate smart tags for your photos
          </div>

          {/* Progress bar */}
          {loading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', width: `${progress}%`, transition: 'width 0.3s', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, textAlign: 'center' }}>Uploading... {progress}%</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={upload} className="btn btn-primary" disabled={loading}>
              {loading ? `Uploading...` : `Upload ${files.length || ''} File${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
