import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import API from '../utils/api';
import MediaCard from '../components/MediaCard';
import MediaLightbox from '../components/MediaLightbox';
import toast from 'react-hot-toast';

export default function FaceSearch() {
  const [selfieStatus, setSelfieStatus] = useState(null); // null=loading, {registered}
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null); // null=not run yet
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [filterEvent, setFilterEvent] = useState('');

  useEffect(() => {
    loadSelfieStatus();
    API.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  async function loadSelfieStatus() {
    try {
      const { data } = await API.get('/face/my-selfie');
      setSelfieStatus(data);
    } catch {
      setSelfieStatus({ registered: false });
    }
  }

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const file = accepted[0];
    setSelfiePreview({ file, preview: URL.createObjectURL(file) });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  async function registerFace() {
    if (!selfiePreview?.file) return;
    setUploadingFace(true);
    try {
      const fd = new FormData();
      fd.append('selfie', selfiePreview.file);
      const { data } = await API.post('/face/upload-selfie', fd);
      toast.success(`Face registered! ✅ (${data.face_count} face detected)`);
      setSelfiePreview(null);
      setSelfieStatus({ registered: true, selfie_filename: data.selfie_filename });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register face');
    } finally {
      setUploadingFace(false);
    }
  }

  async function removeFace() {
    if (!window.confirm('Remove your registered face?')) return;
    try {
      await API.delete('/face/my-selfie');
      setSelfieStatus({ registered: false });
      setResults(null);
      toast.success('Face removed');
    } catch {
      toast.error('Failed');
    }
  }

  async function findMyPhotos() {
    setScanning(true);
    setResults(null);
    try {
      const { data } = await API.post('/face/find-my-photos', {
        event_id: filterEvent || undefined,
      });
      setResults(data);
      if (data.total === 0) {
        toast('No matching photos found in ' + data.scanned + ' scanned images', { icon: '🔍' });
      } else {
        toast.success(`Found ${data.total} photo${data.total > 1 ? 's' : ''} with your face!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  const confidenceColor = (conf) => {
    if (conf > 0.7) return '#48c78e';
    if (conf > 0.5) return '#ffc107';
    return '#e85d75';
  };

  return (
    <div className="container" style={{ padding: '48px 24px', maxWidth: 960 }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(124,92,191,0.12)', border: '1px solid rgba(124,92,191,0.25)', borderRadius: 99, fontSize: 12, color: '#a07ad4', marginBottom: 16, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          ✨ AI Feature
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 40, marginBottom: 10 }}>
          🤳 Find My Photos
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 560, lineHeight: 1.7 }}>
          Upload a reference selfie and our AI will scan all event photos to find every picture you appear in — automatically.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>

        {/* Step 1 — Register Face */}
        <div className="card" style={{ borderColor: selfieStatus?.registered ? 'rgba(72,199,142,0.3)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 99, fontFamily: 'Syne, sans-serif', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              background: selfieStatus?.registered ? 'rgba(72,199,142,0.2)' : 'rgba(124,92,191,0.15)',
              color: selfieStatus?.registered ? '#48c78e' : 'var(--accent)'
            }}>
              {selfieStatus?.registered ? '✓' : '1'}
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>Register Your Face</h3>
          </div>

          {selfieStatus?.registered ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'rgba(72,199,142,0.08)', border: '1px solid rgba(72,199,142,0.2)', borderRadius: 10, marginBottom: 16 }}>
                <img
                  src={`/api/face/selfie-image/${selfieStatus.selfie_filename}`}
                  alt="Your selfie"
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(72,199,142,0.4)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div>
                  <div style={{ color: '#48c78e', fontWeight: 700, fontSize: 14 }}>✅ Face Registered</div>
                  {selfieStatus.updated_at && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      Updated {new Date(selfieStatus.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSelfieStatus(prev => ({ ...prev, registered: false }))} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  📷 Update Selfie
                </button>
                <button onClick={removeFace} className="btn btn-danger btn-sm">
                  🗑️ Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              {selfiePreview ? (
                <div>
                  <div style={{ position: 'relative', marginBottom: 14 }}>
                    <img src={selfiePreview.preview} alt="Preview"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                    <button
                      onClick={() => setSelfiePreview(null)}
                      style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 99, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13 }}
                    >✕</button>
                  </div>
                  <button
                    onClick={registerFace}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={uploadingFace}
                  >
                    {uploadingFace ? (
                      <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Detecting face...</>
                    ) : '🧠 Register Face'}
                  </button>
                </div>
              ) : (
                <div {...getRootProps()} style={{
                  border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                  background: isDragActive ? 'rgba(124,92,191,0.06)' : 'var(--bg3)',
                  transition: 'all 0.2s'
                }}>
                  <input {...getInputProps()} />
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🤳</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Drop your selfie here</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>or click to browse</div>
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(124,92,191,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
                    💡 Use a clear front-facing photo with good lighting
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2 — Scan & Find */}
        <div className="card" style={{ borderColor: results !== null ? 'rgba(79,195,247,0.3)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 99, fontFamily: 'Syne, sans-serif', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              background: results !== null ? 'rgba(79,195,247,0.15)' : 'rgba(124,92,191,0.15)',
              color: results !== null ? 'var(--accent3)' : 'var(--accent)'
            }}>
              {results !== null ? '✓' : '2'}
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>Scan Photos</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Event (optional)</label>
            <select className="input" value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
              <option value="">All Events</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>

          <div style={{ padding: '12px 14px', background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.15)', borderRadius: 8, fontSize: 13, color: 'var(--accent3)', marginBottom: 16 }}>
            🤖 Our AI uses LBP (Local Binary Pattern) face descriptors — the same technique used in professional face recognition systems
          </div>

          <button
            onClick={findMyPhotos}
            disabled={!selfieStatus?.registered || scanning}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {scanning ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Scanning all photos...</>
            ) : (
              !selfieStatus?.registered ? '⬅️ Register face first' : '🔍 Find My Photos'
            )}
          </button>

          {results && (
            <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--accent3)' }}>{results.total}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Matches</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28 }}>{results.scanned}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Scanned</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scanning animation */}
      {scanning && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
            <div style={{ width: 80, height: 80, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 8, border: '2px solid var(--border)', borderBottomColor: 'var(--accent2)', borderRadius: '50%', animation: 'spin 1.2s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
          </div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>AI is scanning your photos...</h3>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Detecting and comparing faces across all event photos. This may take a moment.</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
            {['Detecting faces', 'Extracting descriptors', 'Comparing encodings', 'Ranking matches'].map((step, i) => (
              <div key={i} style={{ padding: '5px 12px', background: 'rgba(124,92,191,0.1)', border: '1px solid rgba(124,92,191,0.2)', borderRadius: 99, fontSize: 12, color: 'var(--text2)' }}>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !scanning && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28 }}>
                {results.total > 0 ? `🎉 Found ${results.total} photo${results.total > 1 ? 's' : ''} with you!` : '😕 No matches found'}
              </h2>
              <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 14 }}>
                Scanned {results.scanned} photos{filterEvent ? ` in selected event` : ' across all events'}
              </p>
            </div>
            <button onClick={findMyPhotos} className="btn btn-secondary btn-sm">🔄 Re-scan</button>
          </div>

          {results.total === 0 ? (
            <div className="empty-state" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg2)' }}>
              <div className="icon">🔍</div>
              <h3>No matches found</h3>
              <p style={{ maxWidth: 400, margin: '8px auto' }}>
                Try uploading a clearer, well-lit selfie. Make sure your face is facing forward and is clearly visible.
              </p>
              <button onClick={() => setSelfieStatus(prev => ({ ...prev, registered: false }))} className="btn btn-primary" style={{ marginTop: 16 }}>
                📷 Update Selfie
              </button>
            </div>
          ) : (
            <div className="media-grid">
              {results.matches.map(m => (
                <div key={m.id} className="media-grid-item" style={{ position: 'relative' }}>
                  {/* Confidence badge */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 5,
                    padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: 'rgba(0,0,0,0.8)',
                    color: confidenceColor(m.face_confidence),
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${confidenceColor(m.face_confidence)}40`
                  }}>
                    {m.confidence_label} {Math.round(m.face_confidence * 100)}%
                  </div>
                  <MediaCard media={m} onClick={setSelected} onUpdate={findMyPhotos} />
                  {m.event_name && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 2px 0' }}>
                      📁 {m.event_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works explainer */}
      {!results && !scanning && (
        <div style={{ marginTop: 16, padding: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 20, fontSize: 18 }}>How it works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { icon: '📸', title: 'Upload Selfie', desc: 'Provide a clear front-facing photo of yourself' },
              { icon: '🧠', title: 'AI Encoding', desc: 'OpenCV LBP algorithm creates a unique 512-dim face descriptor' },
              { icon: '🔍', title: 'Scan Events', desc: 'Each event photo is processed to detect and encode faces' },
              { icon: '🎯', title: 'Match & Rank', desc: 'Chi-squared distance finds your photos, ranked by confidence' },
            ].map(step => (
              <div key={step.title} style={{ display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{step.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && <MediaLightbox media={selected} onClose={() => setSelected(null)} onUpdate={findMyPhotos} />}
    </div>
  );
}
