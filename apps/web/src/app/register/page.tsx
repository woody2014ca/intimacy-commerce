'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
  ? 'http://localhost:4000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

const USER_TOKEN_KEY = 'user_token';

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setError('请填写手机号或邮箱');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          password,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || '注册失败');
      const token = data.accessToken;
      if (token && typeof window !== 'undefined') {
        localStorage.setItem(USER_TOKEN_KEY, token);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>用户注册</h1>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>至少填写手机号或邮箱其一</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>手机号</span>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="选填" style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>邮箱</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="选填" style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>密码 *</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                style={{ padding: 10, paddingRight: 44, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, width: '100%' }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>邀请码</span>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="选填" style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16 }} />
          </label>
          {error && <p style={{ margin: 0, color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            {loading ? '注册中…' : '注册'}
          </button>
        </form>
        <p style={{ marginTop: 24, marginBottom: 0, fontSize: 14, color: '#64748b' }}>
          已有账号？<Link href="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>登录</Link>
          {' · '}
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>返回首页</Link>
        </p>
      </div>
    </div>
  );
}
