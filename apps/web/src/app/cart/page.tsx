'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
  ? 'http://localhost:4000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
const USER_TOKEN_KEY = 'user_token';

type CartItem = { id: string; productId: string; quantity: number; product: { id: string; name: string; retailPrice: string; imageUrl?: string | null } };
type Cart = { id: string; items: CartItem[] };

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = typeof window !== 'undefined' ? localStorage.getItem(USER_TOKEN_KEY) : null;
    setToken(t);
  }, []);

  useEffect(() => {
    if (!mounted || !token) {
      if (mounted && !token) router.replace('/login?redirect=/cart');
      return;
    }
    setLoading(true);
    setError('');
    fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setCart(data))
      .catch(() => setError('加载购物车失败'))
      .finally(() => setLoading(false));
  }, [mounted, token, router]);

  const updateQty = async (productId: string, quantity: number) => {
    if (!token) return;
    setUpdating(productId);
    setError('');
    try {
      const res = await fetch(`${API}/cart/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.status === 401) {
        localStorage.removeItem(USER_TOKEN_KEY);
        router.replace('/login?redirect=/cart');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '更新失败');
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: string) => {
    if (!token) return;
    setUpdating(productId);
    setError('');
    try {
      const res = await fetch(`${API}/cart/items/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(USER_TOKEN_KEY);
        router.replace('/login?redirect=/cart');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '删除失败');
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setUpdating(null);
    }
  };

  if (!mounted || !token) return <main style={{ padding: 24 }}>跳转登录…</main>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}>亲密关系教育电商</Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>首页</Link>
            <Link href="/catalog" style={{ color: '#475569', textDecoration: 'none' }}>商品</Link>
            <Link href="/cart" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>购物车</Link>
            <Link href="/me" style={{ color: '#475569', textDecoration: 'none' }}>个人中心</Link>
            <Link href="/admin" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>管理后台</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>购物车</h1>
        {error && <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}
        {loading && <p style={{ color: '#64748b' }}>加载中…</p>}
        {!loading && cart && cart.items.length === 0 && (
          <p style={{ color: '#64748b' }}>购物车是空的，<Link href="/catalog" style={{ color: '#2563eb' }}>去逛逛</Link>。</p>
        )}
        {!loading && cart && cart.items.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>商品</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>单价</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>数量</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>小计</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => {
                  const price = Number(item.product.retailPrice);
                  const subtotal = price * item.quantity;
                  const isUpdating = updating === item.productId;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12 }}>
                        <Link href={`/catalog/${item.product.id}`} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: 500 }}>{item.product.name}</Link>
                      </td>
                      <td style={{ padding: 12 }}>¥{item.product.retailPrice}</td>
                      <td style={{ padding: 12 }}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v) && v >= 1) updateQty(item.productId, v);
                          }}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (Number.isNaN(v) || v < 1) updateQty(item.productId, 1);
                          }}
                          disabled={isUpdating}
                          style={{ width: 56, padding: 6, border: '1px solid #e2e8f0', borderRadius: 6 }}
                        />
                      </td>
                      <td style={{ padding: 12 }}>¥{subtotal.toFixed(2)}</td>
                      <td style={{ padding: 12 }}>
                        <button type="button" onClick={() => removeItem(item.productId)} disabled={isUpdating} style={{ padding: '4px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none' }}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <strong style={{ fontSize: 18 }}>合计：¥{cart.items.reduce((sum, i) => sum + Number(i.product.retailPrice) * i.quantity, 0).toFixed(2)}</strong>
            </div>
          </div>
        )}
        {!loading && cart && cart.items.length > 0 && (
          <p style={{ marginTop: 24 }}>
            <Link href="/catalog" style={{ color: '#2563eb', textDecoration: 'none' }}>继续购物</Link>
          </p>
        )}
      </main>
    </div>
  );
}
