'use client';

import { useState, useEffect } from 'react';

function getApiUrl() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:4000';
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

type DashboardData = { orderCount?: number; userCount?: number; productCount?: number; gmv?: string } | null;
type UserRow = { id: string; phone: string | null; email: string | null; inviteCode: string; reviewStatus: string; createdAt: string; role: { code: string; name: string } | null };
type CategoryRow = { id: string; name: string; slug: string };
type ProductRow = {
  id: string; sku: string; name: string; description?: string | null; imageUrl?: string | null;
  retailPrice: string; supplierPrice: string; inventory: number; isActive: boolean;
  categoryId?: string | null; category?: { id: string; name: string } | null;
};
type OrderRow = { id: string; orderNo: string; user?: { phone?: string; email?: string }; payAmount?: string; status: string };
type CommissionRow = { id: string; user?: { phone?: string; email?: string }; order?: { orderNo: string }; level: number; amount: string; status: string };
type WithdrawalRow = { id: string; user?: { phone?: string; email?: string }; amount: string; fee: string; status: string; createdAt: string };

const layout = {
  sidebarWidth: 200,
  headerHeight: 56,
  navBg: '#1a1a2e',
  navText: '#eaeaea',
  navHover: '#16213e',
  contentBg: '#f4f5f7',
  cardBg: '#fff',
  cardBorder: '#e0e0e0',
  primary: '#2563eb',
  danger: '#dc2626',
};

export default function AdminPage() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') setToken(localStorage.getItem('admin_token'));
  }, []);

  const [section, setSection] = useState<'dashboard' | 'users' | 'products' | 'orders' | 'commissions' | 'withdrawals'>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [productForm, setProductForm] = useState<{
    id?: string; sku: string; name: string; description?: string; imageUrl?: string;
    supplierPrice: string; retailPrice: string; inventory: number; isActive: boolean; categoryId?: string;
  } | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetail('');
    setLoading(true);
    const url = `${getApiUrl()}/auth/login`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message || data.error;
        setErrorDetail(`请求: ${url}，状态: ${res.status}`);
        throw new Error(msg === 'Unauthorized' ? '手机号/邮箱或密码错误' : (msg || '登录失败'));
      }
      const t = data.accessToken;
      if (!t) throw new Error('登录失败：未返回 token');
      setToken(t);
      if (typeof window !== 'undefined') localStorage.setItem('admin_token', t);
      setErrorDetail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败';
      setError(msg);
      if (msg === 'Failed to fetch' || (err instanceof TypeError && (err as Error).message?.includes('fetch'))) {
        setErrorDetail('无法连接 API，请确认终端里已显示 API running at http://localhost:4000');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardWithToken = async (t: string) => {
    setError('');
    setErrorDetail('');
    setDashboardLoading(true);
    const url = `${getApiUrl()}/admin/dashboard`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        setError((data && typeof data.message === 'string') ? data.message : '登录已过期或无效，请重新登录');
        setErrorDetail('仪表盘接口返回 401');
        return;
      }
      if (!res.ok) throw new Error(data.message || '获取失败');
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取仪表盘失败');
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (token) await loadDashboardWithToken(token);
  };

  const loadUsersWithToken = async (t: string) => {
    setError('');
    setUsersLoading(true);
    const url = `${getApiUrl()}/admin/users`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        setError('登录已过期，请重新登录');
        return;
      }
      if (!res.ok) throw new Error(data.message || '获取用户列表失败');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUsers = () => {
    if (token) loadUsersWithToken(token);
  };

  const loadProductsWithToken = async (t: string) => {
    setError('');
    setProductsLoading(true);
    const api = getApiUrl();
    try {
      const [prodsRes, catsRes] = await Promise.all([
        fetch(`${api}/admin/products`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${api}/admin/categories`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (prodsRes.status === 401 || catsRes.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        setError('登录已过期，请重新登录');
        return;
      }
      const [prods, cats] = await Promise.all([prodsRes.json().catch(() => []), catsRes.json().catch(() => [])]);
      setProducts(Array.isArray(prods) ? prods : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      setError('获取商品列表失败');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadProducts = () => {
    if (token) loadProductsWithToken(token);
  };

  const saveProduct = async () => {
    if (!token || !productForm) return;
    const api = getApiUrl();
    const isEdit = !!productForm.id;
    setProductSaving(true);
    setError('');
    try {
      const url = isEdit ? `${api}/admin/products/${productForm.id}` : `${api}/admin/products`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sku: productForm.sku,
          name: productForm.name,
          description: productForm.description || undefined,
          imageUrl: productForm.imageUrl || undefined,
          supplierPrice: Number(productForm.supplierPrice),
          retailPrice: Number(productForm.retailPrice),
          inventory: Number(productForm.inventory) || 0,
          isActive: productForm.isActive,
          categoryId: productForm.categoryId || undefined,
        }),
      });
      if (res.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        setError('登录已过期');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || '保存失败');
      setProductForm(null);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setProductSaving(false);
    }
  };

  const toggleProductActive = async (p: ProductRow) => {
    if (!token) return;
    const api = getApiUrl();
    setError('');
    try {
      const res = await fetch(`${api}/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (res.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
        setError('登录已过期');
        return;
      }
      if (!res.ok) throw new Error('操作失败');
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const logout = () => {
    setToken(null);
    setDashboard(null);
    setUsers(null);
    setProducts(null);
    setProductForm(null);
    setError('');
    if (typeof window !== 'undefined') localStorage.removeItem('admin_token');
  };

  useEffect(() => {
    if (section === 'users' && token && users === null && !usersLoading) loadUsers();
  }, [section, token]);
  useEffect(() => {
    if (section === 'products' && token && products === null && !productsLoading) loadProducts();
  }, [section, token]);
  useEffect(() => {
    if (section === 'orders' && token && orders === null && !ordersLoading) loadOrders();
  }, [section, token]);
  useEffect(() => {
    if (section === 'commissions' && token && commissions === null && !commissionsLoading) loadCommissions();
  }, [section, token]);
  useEffect(() => {
    if (section === 'withdrawals' && token && withdrawals === null && !withdrawalsLoading) loadWithdrawals();
  }, [section, token]);

  const loadOrders = () => {
    if (!token) return;
    setError('');
    setOrdersLoading(true);
    fetch(`${getApiUrl()}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? (data as OrderRow[]) : []))
      .catch(() => setError('获取订单失败'))
      .finally(() => setOrdersLoading(false));
  };
  const loadCommissions = () => {
    if (!token) return;
    setError('');
    setCommissionsLoading(true);
    fetch(`${getApiUrl()}/admin/commissions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setCommissions(Array.isArray(data) ? (data as CommissionRow[]) : []))
      .catch(() => setError('获取佣金列表失败'))
      .finally(() => setCommissionsLoading(false));
  };
  const loadWithdrawals = () => {
    if (!token) return;
    setError('');
    setWithdrawalsLoading(true);
    fetch(`${getApiUrl()}/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setWithdrawals(Array.isArray(data) ? (data as WithdrawalRow[]) : []))
      .catch(() => setError('获取提现列表失败'))
      .finally(() => setWithdrawalsLoading(false));
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('更新失败');
      loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    }
  };
  const reviewWithdrawal = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('操作失败');
      loadWithdrawals();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  if (!mounted) return <main style={{ padding: 24 }}>加载中...</main>;

  if (!token) {
    return (
      <main style={{ padding: 24, maxWidth: 400, margin: '0 auto' }}>
        <h1>管理后台登录</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          使用 seed 打印的超级管理员账号登录（手机号 18800000000 或邮箱 superadmin@example.com，密码为控制台打印的初始密码）。
        </p>
        <p style={{ color: '#999', fontSize: 12 }}>接口地址: {typeof window !== 'undefined' ? getApiUrl() : 'http://localhost:4000'}</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <input
            type="text"
            placeholder="手机号或邮箱"
            value={phoneOrEmail}
            onChange={(e) => setPhoneOrEmail(e.target.value)}
            required
            style={{ padding: 8, fontSize: 16 }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: 8, fontSize: 16, flex: 1, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} title={showPassword ? '隐藏密码' : '显示密码'} style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 18 }} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
          {errorDetail && <p style={{ color: '#666', fontSize: 12, margin: 0 }}>{errorDetail}</p>}
          <button type="submit" disabled={loading} style={{ padding: 10, fontSize: 16 }}>{loading ? '登录中…' : '登录'}</button>
        </form>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: layout.contentBg }}>
      <aside style={{ width: layout.sidebarWidth, background: layout.navBg, color: layout.navText, paddingTop: 16 }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8 }}>
          <strong style={{ fontSize: 18 }}>管理后台</strong>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            type="button"
            onClick={() => setSection('dashboard')}
            style={{
              textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'dashboard' ? layout.navHover : 'transparent',
              color: layout.navText, cursor: 'pointer', fontSize: 15,
            }}
          >
            仪表盘
          </button>
          <button
            type="button"
            onClick={() => setSection('users')}
            style={{
              textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'users' ? layout.navHover : 'transparent',
              color: layout.navText, cursor: 'pointer', fontSize: 15,
            }}
          >
            用户管理
          </button>
          <button
            type="button"
            onClick={() => setSection('products')}
            style={{
              textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'products' ? layout.navHover : 'transparent',
              color: layout.navText, cursor: 'pointer', fontSize: 15,
            }}
          >
            商品管理
          </button>
          <button type="button" onClick={() => setSection('orders')} style={{ textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'orders' ? layout.navHover : 'transparent', color: layout.navText, cursor: 'pointer', fontSize: 15 }}>
            订单管理
          </button>
          <button type="button" onClick={() => setSection('commissions')} style={{ textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'commissions' ? layout.navHover : 'transparent', color: layout.navText, cursor: 'pointer', fontSize: 15 }}>
            佣金管理
          </button>
          <button type="button" onClick={() => setSection('withdrawals')} style={{ textAlign: 'left', padding: '12px 16px', border: 'none', background: section === 'withdrawals' ? layout.navHover : 'transparent', color: layout.navText, cursor: 'pointer', fontSize: 15 }}>
            提现管理
          </button>
          <button
            type="button"
            onClick={logout}
            style={{ textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 15, marginTop: 8 }}
          >
            退出登录
          </button>
        </nav>
      </aside>

      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {error && <p style={{ color: layout.danger, marginBottom: 16 }}>{error}</p>}
        {errorDetail && <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>{errorDetail}</p>}

        {section === 'dashboard' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>仪表盘</h1>
              <button
                type="button"
                onClick={loadDashboard}
                disabled={dashboardLoading}
                style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                {dashboardLoading ? '加载中…' : '加载 / 刷新仪表盘'}
              </button>
            </div>
            {dashboard ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>订单数</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.orderCount ?? 0}</div>
                </div>
                <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>用户数</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.userCount ?? 0}</div>
                </div>
                <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>商品数</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.productCount ?? 0}</div>
                </div>
                <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>GMV（已支付）</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>¥{dashboard.gmv ?? '0'}</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>点击上方「加载 / 刷新仪表盘」获取数据。</p>
            )}
          </>
        )}

        {section === 'users' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>用户管理</h1>
              <button
                type="button"
                onClick={loadUsers}
                disabled={usersLoading}
                style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                {usersLoading ? '加载中…' : '刷新用户列表'}
              </button>
            </div>
            {users && users.length > 0 ? (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${layout.cardBorder}` }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>手机/邮箱</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>角色</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>审核状态</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>邀请码</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${layout.cardBorder}` }}>
                        <td style={{ padding: 12 }}>{u.phone || u.email || '-'}</td>
                        <td style={{ padding: 12 }}>{u.role?.name ?? u.role?.code ?? '-'}</td>
                        <td style={{ padding: 12 }}>{u.reviewStatus}</td>
                        <td style={{ padding: 12 }}>{u.inviteCode}</td>
                        <td style={{ padding: 12 }}>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ padding: 12, margin: 0, color: '#64748b', fontSize: 12 }}>共 {users.length} 条（最多显示 100 条）</p>
              </div>
            ) : users && users.length === 0 ? (
              <p style={{ color: '#64748b' }}>暂无用户。</p>
            ) : (
              <p style={{ color: '#64748b' }}>点击「刷新用户列表」加载数据。</p>
            )}
          </>
        )}

        {section === 'products' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>商品管理</h1>
              <button
                type="button"
                onClick={loadProducts}
                disabled={productsLoading}
                style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                {productsLoading ? '加载中…' : '刷新列表'}
              </button>
              <button
                type="button"
                onClick={() => setProductForm({
                  sku: '', name: '', description: '', imageUrl: '', supplierPrice: '0', retailPrice: '0', inventory: 0, isActive: true, categoryId: '',
                })}
                style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                新增商品
              </button>
            </div>

            {productForm && (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>{productForm.id ? '编辑商品' : '新增商品'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>SKU *</span>
                    <input
                      value={productForm.sku}
                      onChange={(e) => setProductForm((f) => f ? { ...f, sku: e.target.value } : null)}
                      placeholder="唯一货号"
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                      disabled={!!productForm.id}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>名称 *</span>
                    <input
                      value={productForm.name}
                      onChange={(e) => setProductForm((f) => f ? { ...f, name: e.target.value } : null)}
                      placeholder="商品名称"
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>零售价 *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.retailPrice}
                      onChange={(e) => setProductForm((f) => f ? { ...f, retailPrice: e.target.value } : null)}
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>供货价 *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.supplierPrice}
                      onChange={(e) => setProductForm((f) => f ? { ...f, supplierPrice: e.target.value } : null)}
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>库存</span>
                    <input
                      type="number"
                      min="0"
                      value={productForm.inventory}
                      onChange={(e) => setProductForm((f) => f ? { ...f, inventory: parseInt(e.target.value, 10) || 0 } : null)}
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>分类</span>
                    <select
                      value={productForm.categoryId || ''}
                      onChange={(e) => setProductForm((f) => f ? { ...f, categoryId: e.target.value || undefined } : null)}
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    >
                      <option value="">无</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) => setProductForm((f) => f ? { ...f, isActive: e.target.checked } : null)}
                    />
                    <span style={{ fontSize: 14 }}>上架</span>
                  </label>
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>描述</span>
                    <textarea
                      value={productForm.description || ''}
                      onChange={(e) => setProductForm((f) => f ? { ...f, description: e.target.value } : null)}
                      rows={2}
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>图片 URL</span>
                    <input
                      value={productForm.imageUrl || ''}
                      onChange={(e) => setProductForm((f) => f ? { ...f, imageUrl: e.target.value } : null)}
                      placeholder="https://..."
                      style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                  </label>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button type="button" onClick={saveProduct} disabled={productSaving || !productForm.sku.trim() || !productForm.name.trim()} style={{ padding: '8px 20px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{productSaving ? '保存中…' : '保存'}</button>
                  <button type="button" onClick={() => setProductForm(null)} style={{ padding: '8px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>取消</button>
                </div>
              </div>
            )}

            {products && products.length > 0 ? (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${layout.cardBorder}` }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>名称</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>SKU</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>零售价</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>库存</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>状态</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${layout.cardBorder}` }}>
                        <td style={{ padding: 12 }}>{p.name}</td>
                        <td style={{ padding: 12 }}>{p.sku}</td>
                        <td style={{ padding: 12 }}>¥{p.retailPrice}</td>
                        <td style={{ padding: 12 }}>{p.inventory}</td>
                        <td style={{ padding: 12 }}>{p.isActive ? '上架' : '下架'}</td>
                        <td style={{ padding: 12 }}>
                          <button type="button" onClick={() => setProductForm({ id: p.id, sku: p.sku, name: p.name, description: p.description ?? '', imageUrl: p.imageUrl ?? '', supplierPrice: p.supplierPrice, retailPrice: p.retailPrice, inventory: p.inventory, isActive: p.isActive, categoryId: p.categoryId ?? '' })} style={{ marginRight: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>编辑</button>
                          <button type="button" onClick={() => toggleProductActive(p)} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>{p.isActive ? '下架' : '上架'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ padding: 12, margin: 0, color: '#64748b', fontSize: 12 }}>共 {products.length} 条</p>
              </div>
            ) : products && products.length === 0 ? (
              <p style={{ color: '#64748b' }}>暂无商品，点击「新增商品」添加。</p>
            ) : (
              <p style={{ color: '#64748b' }}>点击「刷新列表」加载数据。</p>
            )}
          </>
        )}

        {section === 'orders' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>订单管理</h1>
              <button type="button" onClick={loadOrders} disabled={ordersLoading} style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>{ordersLoading ? '加载中…' : '刷新列表'}</button>
            </div>
            {ordersLoading && <p style={{ color: '#64748b' }}>加载中…</p>}
            {orders && orders.length > 0 && (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${layout.cardBorder}` }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>订单号</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>用户</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>金额</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>状态</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${layout.cardBorder}` }}>
                        <td style={{ padding: 12 }}>{o.orderNo}</td>
                        <td style={{ padding: 12 }}>{o.user ? (o.user.phone || o.user.email || '-') : '-'}</td>
                        <td style={{ padding: 12 }}>¥{o.payAmount ?? '0'}</td>
                        <td style={{ padding: 12 }}>{o.status}</td>
                        <td style={{ padding: 12 }}>
                          {o.status === 'PAID' && <button type="button" onClick={() => updateOrderStatus(o.id, 'COMPLETED')} style={{ marginRight: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>标记完成</button>}
                          {o.status === 'CREATED' && <span style={{ color: '#64748b' }}>待支付</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ padding: 12, margin: 0, color: '#64748b', fontSize: 12 }}>共 {orders.length} 条</p>
              </div>
            )}
            {orders && orders.length === 0 && !ordersLoading && <p style={{ color: '#64748b' }}>暂无订单。</p>}
            {!orders && !ordersLoading && <p style={{ color: '#64748b' }}>点击「刷新列表」加载数据。</p>}
          </>
        )}

        {section === 'commissions' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>佣金管理</h1>
              <button type="button" onClick={loadCommissions} disabled={commissionsLoading} style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>{commissionsLoading ? '加载中…' : '刷新列表'}</button>
            </div>
            {commissionsLoading && <p style={{ color: '#64748b' }}>加载中…</p>}
            {commissions && commissions.length > 0 && (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${layout.cardBorder}` }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>用户</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>订单号</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>级别</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>金额</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${layout.cardBorder}` }}>
                        <td style={{ padding: 12 }}>{c.user ? (c.user.phone || c.user.email || '-') : '-'}</td>
                        <td style={{ padding: 12 }}>{c.order?.orderNo ?? '-'}</td>
                        <td style={{ padding: 12 }}>L{c.level}</td>
                        <td style={{ padding: 12 }}>¥{c.amount}</td>
                        <td style={{ padding: 12 }}>{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ padding: 12, margin: 0, color: '#64748b', fontSize: 12 }}>共 {commissions.length} 条</p>
              </div>
            )}
            {commissions && commissions.length === 0 && !commissionsLoading && <p style={{ color: '#64748b' }}>暂无佣金记录。</p>}
            {!commissions && !commissionsLoading && <p style={{ color: '#64748b' }}>点击「刷新列表」加载数据。</p>}
          </>
        )}

        {section === 'withdrawals' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24 }}>提现管理</h1>
              <button type="button" onClick={loadWithdrawals} disabled={withdrawalsLoading} style={{ padding: '8px 16px', background: layout.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>{withdrawalsLoading ? '加载中…' : '刷新列表'}</button>
            </div>
            {withdrawalsLoading && <p style={{ color: '#64748b' }}>加载中…</p>}
            {withdrawals && withdrawals.length > 0 && (
              <div style={{ background: layout.cardBg, border: `1px solid ${layout.cardBorder}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${layout.cardBorder}` }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>用户</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>金额</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>手续费</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>状态</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>申请时间</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} style={{ borderBottom: `1px solid ${layout.cardBorder}` }}>
                        <td style={{ padding: 12 }}>{w.user ? (w.user.phone || w.user.email || '-') : '-'}</td>
                        <td style={{ padding: 12 }}>¥{w.amount}</td>
                        <td style={{ padding: 12 }}>¥{w.fee ?? '0'}</td>
                        <td style={{ padding: 12 }}>{w.status}</td>
                        <td style={{ padding: 12 }}>{w.createdAt ? new Date(w.createdAt).toLocaleString() : '-'}</td>
                        <td style={{ padding: 12 }}>
                          {w.status === 'PENDING' && (
                            <>
                              <button type="button" onClick={() => reviewWithdrawal(w.id, 'APPROVED')} style={{ marginRight: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>通过</button>
                              <button type="button" onClick={() => reviewWithdrawal(w.id, 'REJECTED')} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>拒绝</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ padding: 12, margin: 0, color: '#64748b', fontSize: 12 }}>共 {withdrawals.length} 条</p>
              </div>
            )}
            {withdrawals && withdrawals.length === 0 && !withdrawalsLoading && <p style={{ color: '#64748b' }}>暂无提现申请。</p>}
            {!withdrawals && !withdrawalsLoading && <p style={{ color: '#64748b' }}>点击「刷新列表」加载数据。</p>}
          </>
        )}
      </div>
    </div>
  );
}
