import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ events: 0, photos: 0, users: 0 });

  useEffect(() => {
    API.get('/events?sort=created_at').then(r => setEvents(r.data.slice(0, 6)));
  }, []);

  const categories = ['Photography', 'Cultural Fest', 'Sports', 'Workshop', 'Trip', 'Party'];

  return (
    <div>
      {/* Hero */}
      <div style={{
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px',
      }}>
        {/* Background grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(124,92,191,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)'
        }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,191,0.15), transparent 70%)', zIndex: 0, filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,93,117,0.12), transparent 70%)', zIndex: 0, filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(124,92,191,0.12)', border: '1px solid rgba(124,92,191,0.25)', borderRadius: 99, fontSize: 13, color: '#a07ad4', marginBottom: 32, fontWeight: 500 }}>
            📸 Your club's visual story, all in one place
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24 }}>
            Every moment,<br />
            <span style={{ background: 'linear-gradient(135deg, #7c5cbf, #e85d75)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>beautifully kept.</span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text2)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Upload, organize, and rediscover memories from every club event. Smart tagging, facial search, and real-time sharing.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 28px' }}>
              Browse Events →
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ fontSize: 16, padding: '14px 28px' }}>
              Join the club
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 64 }}>
            {[
              { label: 'Events', val: events.length + '+' },
              { label: 'Photos', val: '1K+' },
              { label: 'Members', val: '500+' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text)' }}>{s.val}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features strip */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '48px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              { icon: '🤖', title: 'Smart AI Tagging', desc: 'Auto-tags every photo by content' },
              { icon: '🔒', title: 'Role-Based Access', desc: 'Admin, Photographer, Member, Viewer' },
              { icon: '⚡', title: 'Real-time Notifs', desc: 'Instant likes, tags and comments' },
              { icon: '💧', title: 'Auto Watermark', desc: 'Downloads include event branding' },
              { icon: '🔍', title: 'Advanced Search', desc: 'Find by tag, event, date, or name' },
              { icon: '☁️', title: 'Cloud Ready', desc: 'Scalable storage architecture' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="container" style={{ padding: '72px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Fresh & Recent</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Latest Events</h2>
            </div>
            <Link to="/events" className="btn btn-secondary btn-sm">View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '72px 0' }}>
        <div className="container">
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>Browse by Category</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map(cat => (
              <Link key={cat} to={`/events?category=${cat.toLowerCase()}`} style={{
                padding: '12px 24px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                fontSize: 14, fontWeight: 600,
                color: 'var(--text2)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,191,0.15)'; e.currentTarget.style.color = '#a07ad4'; e.currentTarget.style.borderColor = 'rgba(124,92,191,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        <div className="container">
          Built with ❤️ for clubs and photographers · EventSnap 2024
        </div>
      </footer>
    </div>
  );
}

function EventCard({ event }) {
  const catColors = { general: 'badge-purple', sports: 'badge-blue', cultural: 'badge-pink', workshop: 'badge-green', trip: 'badge-purple', party: 'badge-pink' };
  return (
    <Link to={`/events/${event.id}`} style={{ display: 'block' }}>
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(124,92,191,0.3)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Cover */}
        <div style={{ height: 180, background: 'var(--bg3)', position: 'relative', overflow: 'hidden' }}>
          {event.cover_image ? (
            <img src={`/media/${event.cover_image}`} alt={event.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📸</div>
          )}
          {!event.is_public && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>🔒 Private</div>
          )}
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{event.name}</h3>
            <span className={`badge ${catColors[event.category] || 'badge-purple'}`}>{event.category}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description || 'No description'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
            <span>📅 {event.date || 'TBD'}</span>
            <span>🖼️ {event.media_count || 0} photos</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
