import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/events');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📸</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Log in to access your events and photos</p>
        </div>

        <div className="card">
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px', fontSize: 15 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--text2)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent)' }}>Sign up</Link>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(124,92,191,0.08)', border: '1px solid rgba(124,92,191,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
          💡 Register a new account to get started
        </div>
      </div>
    </div>
  );
}
