import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.role);
      toast.success('Account created! Welcome 🎉');
      navigate('/events');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'viewer', label: '👁️ Viewer', desc: 'Browse public content' },
    { value: 'member', label: '🎓 Member', desc: 'Access club events' },
    { value: 'photographer', label: '📷 Photographer', desc: 'Upload and manage media' },
    { value: 'admin', label: '⚡ Admin', desc: 'Full platform control' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>Join EventSnap</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Create your account and start capturing memories</p>
        </div>

        <div className="card">
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="input" placeholder="coolphotographer"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input" placeholder="you@college.edu"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="input" placeholder="Min 6 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>

            {/* Role selector */}
            <div className="form-group">
              <label className="form-label">I am a...</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {roles.map(r => (
                  <button type="button" key={r.value} onClick={() => setForm({ ...form, role: r.value })} style={{
                    padding: '12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid',
                    borderColor: form.role === r.value ? 'var(--accent)' : 'var(--border)',
                    background: form.role === r.value ? 'rgba(124,92,191,0.1)' : 'var(--bg3)',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px', fontSize: 15 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--text2)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
