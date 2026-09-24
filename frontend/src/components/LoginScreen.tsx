import React, { useState } from 'react';
import { signIn } from '../services/supabase/auth';
import type { AppUser } from '../services/supabase/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-deep)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 60%), linear-gradient(to bottom, #050914, #080e1e)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)'
    }}>
      <div className="login-card" style={{
        background: 'var(--bg-card)',
        padding: '2rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: '400px',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon-wrapper" style={{ fontSize: '2rem', margin: '0 auto 1rem auto', width: '60px', height: '60px' }}>
            🧭
            <div className="brand-pulse-ring"></div>
          </div>
          <h2 style={{ margin: 0, color: 'var(--cyan-bright)', fontWeight: 700, letterSpacing: '0.08em', fontSize: '1.2rem', textShadow: '0 0 12px rgba(56, 189, 248, 0.35)' }}>
            ANTARCTIC NAVIGATION AI
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
            SYSTEM AUTHENTICATION REQUIRED
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-crit-bg)',
            border: '1px solid var(--status-crit)',
            color: 'var(--status-crit)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OPERATOR EMAIL OR DEMO ID</label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. navigator@demo.local"
              style={{
                background: 'rgba(10, 18, 36, 0.85)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PASSCODE</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'rgba(10, 18, 36, 0.85)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: 'var(--cyan-deep)',
              color: 'var(--text-primary)',
              border: '1px solid var(--cyan-bright)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.25)'
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '8px' }}>DEMO ACCOUNTS (OFFLINE MODE):</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)' }}>
            <li><span style={{color:'var(--cyan-bright)'}}>command@demo.local</span> <span style={{opacity:0.5}}>[COMMAND_CENTER]</span></li>
            <li><span style={{color:'var(--cyan-bright)'}}>captain@demo.local</span> <span style={{opacity:0.5}}>[CAPTAIN]</span></li>
            <li><span style={{color:'var(--cyan-bright)'}}>navigator@demo.local</span> <span style={{opacity:0.5}}>[NAVIGATOR]</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
