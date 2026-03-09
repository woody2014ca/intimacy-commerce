'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
  ? 'http://localhost:4000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
const USER_TOKEN_KEY = 'user_token';

type Product = { id: string; sku: string; name: string; description?: string | null; imageUrl?: string | null; retailPrice: string; inventory: number };

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem(USER_TOKEN_KEY));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/catalog/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data || null))
      .catch(() => setError('加载商品失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = async () => {
    if (!token || !product) return;
    setAddStatus('loading');
    setAddError('');
    try {
      const res = await fetch(`${API}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') localStorage.removeItem(USER_TOKEN_KEY);
        setToken(null);
        setAddError('请重新登录');
        setAddStatus('err');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '加入失败');
      setAddStatus('ok');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '加入购物车失败');
      setAddStatus('err');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}>亲密关系教育电商</Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>首页</Link>
            <Link href="/catalog" style={{ color: '#475569', textDecoration: 'none' }}>全部商品</Link>
            <Link href="/cart" style={{ color: '#475569', textDecoration: 'none' }}>购物车</Link>
            <Link href="/admin" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>管理后台</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {loading && <p style={{ color: '#64748b' }}>加载中…</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {!loading && !product && !error && <p style={{ color: '#64748b' }}>商品不存在。</p>}
        {product && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ aspectRatio: '1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#94a3b8' }}>暂无图片</span>
              )}
            </div>
            <div style={{ padding: 32 }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#64748b' }}>SKU: {product.sku}</p>
              <h1 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{product.name}</h1>
              <p style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#2563eb' }}>¥{product.retailPrice}</p>
              {product.description && <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>{product.description}</p>}
              <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>库存：{product.inventory}</p>
              {!token ? (
                <p style={{ margin: 0, fontSize: 14 }}>
                  <Link href={`/login?redirect=${encodeURIComponent(`/catalog/${id}`)}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>登录</Link>
                  {' 后即可加入购物车'}
                </p>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={addStatus === 'loading' || product.inventory < 1}
                    style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {addStatus === 'loading' ? '加入中…' : addStatus === 'ok' ? '已加入购物车' : '加入购物车'}
                  </button>
                  {addStatus === 'ok' && <span style={{ marginLeft: 12 }}><Link href="/cart" style={{ color: '#2563eb' }}>去购物车</Link></span>}
                  {addStatus === 'err' && addError && <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: 14 }}>{addError}</p>}
                </div>
              )}
              <div style={{ marginTop: 24 }}>
                <Link href="/catalog" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← 返回商品列表</Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
