import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef();
  const menuRef = useRef();

  useEffect(() => {
    if (!user) return;
    loadNotifs();
    const token = localStorage.getItem('token');
    const socket = io('/', { auth: { token } });
    socket.on('notifications', (n) => {
      setUnread(n.filter(x => !x.is_read).length);
    });
    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadNotifs() {
    try {
      const { data } = await API.get('/notifications');
      setNotifs(data);
      setUnread(data.filter(n => !n.is_read).length);
    } catch {}
  }

  async function markAllRead() {
    await API.put('/notifications/read');
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
  }

  const isActive = (path) => location.pathname === path;
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/search', label: 'Search' },
    { to: '/face-search', label: '🤳 Face Search', requireAuth: true },
  ];
  const notifIcons = { like: '❤️', comment: '💬', tag: '🏷️', upload: '📸' };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 64, gap: 24 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c5cbf, #e85d75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif'
          }}>E</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
            Event<span style={{ color: 'var(--accent)' }}>Snap</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap' }}>
          {navLinks.map(l => {
            if (l.requireAuth && !user) return null;
            return (
              <Link key={l.to} to={l.to} style={{
                padding: '6px 13px',
                borderRadius: 8, fontSize: 14, fontWeight: 500,
                color: isActive(l.to) ? 'var(--text)' : 'var(--text2)',
                background: isActive(l.to) ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}>{l.label}</Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {user ? (
            <>
              {/* Notifications */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button className="btn-icon" onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) loadNotifs(); }} style={{ position: 'relative' }}>
                  🔔
                  {unread > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent2)', color: 'white', borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{unread}</span>
                  )}
                </button>
                {showNotifs && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 320, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>Notifications</span>
                      {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No notifications yet</div>
                      ) : notifs.map(n => (
                        <div key={n.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', background: n.is_read ? 'transparent' : 'rgba(124,92,191,0.06)', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 18 }}>{notifIcons[n.type] || '📣'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: 'var(--text)' }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{new Date(n.created_at).toLocaleDateString()}</div>
                          </div>
                          {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>{user.username?.[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 14, color: 'var(--text2)' }}>{user.username}</span>
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 190, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                    {[
                      { to: '/profile', label: '👤 Profile' },
                      { to: '/my-photos', label: '🖼️ My Photos' },
                      { to: '/favourites', label: '⭐ Favourites' },
                      { to: '/face-search', label: '🤳 Face Search' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 14, color: 'var(--text2)', borderBottom: '1px solid var(--border)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.target.style.background = 'var(--hover)'; e.target.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text2)'; }}
                      >{item.label}</Link>
                    ))}
                    <button onClick={() => { logout(); navigate('/'); setShowMenu(false); }} style={{ width: '100%', padding: '11px 16px', textAlign: 'left', fontSize: 14, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
