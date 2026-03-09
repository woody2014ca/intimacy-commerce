'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? 'http://localhost:4000' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
const USER_TOKEN_KEY = 'user_token';

type Tab = 'profile' | 'referral' | 'commission' | 'points' | 'coupons' | 'orders' | 'withdrawals';

export default function MePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<{ inviteCode?: string; phone?: string; email?: string } | null>(null);
  const [referral, setReferral] = useState<{ inviteCode?: string; level1Count?: number; level2Count?: number; relations?: unknown[] } | null>(null);
  const [commission, setCommission] = useState<unknown[] | null>(null);
  const [points, setPoints] = useState<{ balance: number; ledger: { delta: number; balance: number; reason: string; createdAt: string }[] } | null>(null);
  const [coupons, setCoupons] = useState<unknown[] | null>(null);
  const [orders, setOrders] = useState<unknown[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<{ list: { id: string; amount: string; fee: string; status: string; createdAt: string }[]; availableBalance: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = typeof window !== 'undefined' ? localStorage.getItem(USER_TOKEN_KEY) : null;
    setToken(t);
  }, []);

  useEffect(() => {
    if (!mounted || !token) {
      if (mounted && !token) router.replace('/login?redirect=/me');
      return;
    }
    const h = { Authorization: `Bearer ${token}` };
    if (tab === 'profile') {
      setLoading(true);
      fetch(`${API}/user/profile`, { headers: h }).then((r) => r.json()).then(setProfile).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'referral') {
      setLoading(true);
      fetch(`${API}/referral`, { headers: h }).then((r) => r.json()).then(setReferral).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'commission') {
      setLoading(true);
      fetch(`${API}/commission`, { headers: h }).then((r) => r.json()).then((d) => setCommission(Array.isArray(d) ? d : [])).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'points') {
      setLoading(true);
      fetch(`${API}/user/points`, { headers: h }).then((r) => r.json()).then(setPoints).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'coupons') {
      setLoading(true);
      fetch(`${API}/user/coupons`, { headers: h }).then((r) => r.json()).then((d) => setCoupons(Array.isArray(d) ? d : [])).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'orders') {
      setLoading(true);
      fetch(`${API}/order`, { headers: h }).then((r) => r.json()).then((d) => setOrders(Array.isArray(d) ? d : [])).catch(() => setError('加载失败')).finally(() => setLoading(false));
    } else if (tab === 'withdrawals') {
      setLoading(true);
      fetch(`${API}/user/withdrawals`, { headers: h }).then((r) => r.json()).then(setWithdrawals).catch(() => setError('加载失败')).finally(() => setLoading(false));
    }
  }, [mounted, token, tab, router]);

  const claimCoupon = async () => {
    if (!token || !couponCode.trim()) return;
    setClaiming(true);
    setError('');
    try {
      const res = await fetch(`${API}/user/coupons/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '领取失败');
      setCouponCode('');
      setTab('coupons');
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '领取失败');
    } finally {
      setClaiming(false);
    }
  };

  const createWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!token || Number.isNaN(amt) || amt <= 0) return;
    setWithdrawing(true);
    setError('');
    try {
      const res = await fetch(`${API}/user/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '申请失败');
      setWithdrawAmount('');
      setWithdrawals((prev) => prev ? { ...prev, list: [data, ...prev.list], availableBalance: prev.availableBalance - amt } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '申请失败');
    } finally {
      setWithdrawing(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(USER_TOKEN_KEY);
    router.replace('/');
  };

  if (!mounted || !token) return <main style={{ padding: 24 }}>跳转登录…</main>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: '个人资料' },
    { key: 'referral', label: '推荐' },
    { key: 'commission', label: '佣金' },
    { key: 'points', label: '积分' },
    { key: 'coupons', label: '优惠券' },
    { key: 'orders', label: '我的订单' },
    { key: 'withdrawals', label: '提现' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}>亲密关系教育电商</Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>首页</Link>
            <Link href="/catalog" style={{ color: '#475569', textDecoration: 'none' }}>商品</Link>
            <Link href="/cart" style={{ color: '#475569', textDecoration: 'none' }}>购物车</Link>
            <button type="button" onClick={logout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>退出</button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>个人中心</h1>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{ padding: '8px 16px', border: 'none', background: tab === t.key ? '#2563eb' : '#e2e8f0', color: tab === t.key ? '#fff' : '#475569', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>{t.label}</button>
          ))}
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}
        {loading && <p style={{ color: '#64748b' }}>加载中…</p>}

        {tab === 'profile' && profile && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <p><strong>手机/邮箱：</strong>{profile.phone || profile.email || '-'}</p>
            <p><strong>邀请码：</strong>{profile.inviteCode || '-'}</p>
            <p style={{ color: '#64748b', fontSize: 14 }}>分享邀请码或邀请链接给好友，好友注册填写即建立推荐关系（最多两级）。</p>
          </div>
        )}

        {tab === 'referral' && referral && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <p><strong>我的邀请码：</strong>{referral.inviteCode || '-'}</p>
            <p>一级推荐：{referral.level1Count ?? 0} 人 · 二级推荐：{referral.level2Count ?? 0} 人</p>
            {referral.relations && referral.relations.length > 0 && (
              <p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>最近 {referral.relations.length} 条推荐关系</p>
            )}
          </div>
        )}

        {tab === 'commission' && commission && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {commission.length === 0 ? <p style={{ padding: 24, color: '#64748b' }}>暂无佣金记录。订单完成后按两级推荐结算。</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#f8fafc' }}><th style={{ textAlign: 'left', padding: 12 }}>订单号</th><th style={{ textAlign: 'left', padding: 12 }}>级别</th><th style={{ textAlign: 'left', padding: 12 }}>金额</th><th style={{ textAlign: 'left', padding: 12 }}>状态</th></tr></thead>
                <tbody>
                  {commission.map((c: { id: string; order?: { orderNo: string }; level: number; amount: string; status: string }) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: 12 }}>{c.order?.orderNo ?? '-'}</td><td style={{ padding: 12 }}>L{c.level}</td><td style={{ padding: 12 }}>¥{c.amount}</td><td style={{ padding: 12 }}>{c.status}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'points' && points && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <p><strong>当前积分：</strong>{points.balance}</p>
            {points.ledger && points.ledger.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 14, color: '#64748b' }}>最近明细</p>
                <ul style={{ margin: 0, paddingLeft: 20 }}>{points.ledger.slice(0, 20).map((l, i) => <li key={i}>{l.delta > 0 ? '+' : ''}{l.delta} {l.reason}（余额 {l.balance}） {new Date(l.createdAt).toLocaleString()}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {tab === 'coupons' && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="输入券码领取" style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 8, width: 200 }} />
              <button type="button" onClick={claimCoupon} disabled={claiming} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{claiming ? '领取中…' : '领取'}</button>
            </div>
            {coupons && coupons.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{coupons.map((cc: { id: string; coupon?: { name: string; code: string } }) => <li key={cc.id}>{cc.coupon?.name ?? cc.coupon?.code ?? cc.id}</li>)}</ul>
            ) : <p style={{ color: '#64748b' }}>暂无已领取的优惠券。</p>}
          </div>
        )}

        {tab === 'orders' && orders && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {orders.length === 0 ? <p style={{ padding: 24, color: '#64748b' }}>暂无订单。</p> : (
              <ul style={{ margin: 0, padding: 24, listStyle: 'none' }}>
                {orders.map((o: { id: string; orderNo: string; status: string; payAmount?: string; createdAt?: string }) => (
                  <li key={o.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>订单号 {o.orderNo} · ¥{o.payAmount ?? '0'} · {o.status} · {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'withdrawals' && withdrawals && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <p><strong>可提现余额：</strong>¥{withdrawals.availableBalance.toFixed(2)}</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="提现金额" style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 8, width: 120 }} />
              <button type="button" onClick={createWithdrawal} disabled={withdrawing} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{withdrawing ? '提交中…' : '申请提现'}</button>
            </div>
            <p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>提现记录：</p>
            {withdrawals.list && withdrawals.list.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{withdrawals.list.map((w) => <li key={w.id}>¥{w.amount} 手续费 ¥{w.fee ?? '0'} {w.status} {new Date(w.createdAt).toLocaleString()}</li>)}</ul>
            ) : <p style={{ color: '#64748b', fontSize: 14 }}>暂无记录。</p>}
          </div>
        )}
      </main>
    </div>
  );
}
