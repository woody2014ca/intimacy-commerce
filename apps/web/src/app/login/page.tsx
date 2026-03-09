'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
  ? 'http://localhost:4000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

const USER_TOKEN_KEY = 'user_token';

export default function LoginPage() {
  const router = useRouter();

  const [redirect, setRedirect] = useState('/');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const r = params.get('redirect') || '/';
    setRedirect(r);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail: phoneOrEmail.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message || data.error;
        throw new Error(msg === 'Unauthorized' ? '手机号/邮箱或密码错误' : (msg || '登录失败'));
      }
      const token = data.accessToken;
      if (!token) throw new Error('登录失败：未返回 token');
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_TOKEN_KEY, token);
      }
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>用户登录</h1>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>登录后可加入购物车、下单</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>手机号或邮箱</span>
            <input
              type="text"
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              placeholder="请输入手机号或邮箱"
              required
              style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>密码</span>
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
          {error && <p style={{ margin: 0, color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <p style={{ marginTop: 24, marginBottom: 0, fontSize: 14, color: '#64748b' }}>
          还没有账号？<Link href="/register" style={{ color: '#2563eb', textDecoration: 'none' }}>注册</Link>
          {' · '}
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>返回首页</Link>
        </p>
      </div>
    </div>
  );
}
