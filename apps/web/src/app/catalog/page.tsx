'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost'
  ? 'http://localhost:4000'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

type Product = { id: string; sku: string; name: string; description?: string | null; imageUrl?: string | null; retailPrice: string; inventory: number };

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/catalog/products`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setError('加载商品失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}>亲密关系教育电商</Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>首页</Link>
            <Link href="/catalog" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>全部商品</Link>
            <Link href="/cart" style={{ color: '#475569', textDecoration: 'none' }}>购物车</Link>
            <Link href="/login" style={{ color: '#475569', textDecoration: 'none' }}>登录</Link>
            <Link href="/me" style={{ color: '#475569', textDecoration: 'none' }}>个人中心</Link>
            <Link href="/admin" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>管理后台</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>全部商品</h1>
        {loading && <p style={{ color: '#64748b' }}>加载中…</p>}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {!loading && !error && products.length === 0 && <p style={{ color: '#64748b' }}>暂无商品。</p>}
        {!loading && products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/catalog/${p.id}`}
                style={{
                  background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0',
                  textDecoration: 'none', color: 'inherit', display: 'block',
                }}
              >
                <div style={{ aspectRatio: '4/3', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#94a3b8' }}>暂无图片</span>}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{p.name}</h3>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2563eb' }}>¥{p.retailPrice}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>库存 {p.inventory}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
