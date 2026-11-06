'use client';

import { useEffect, useState } from 'react';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';
import { createClient } from '@/lib/supabase/client';

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabase) { setStatus('login'); return; }
    let active = true;
    async function checkAccess() {
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (!active) return;
      if (!signedInUser) { setStatus('login'); return; }
      const { data: adminRow, error } = await supabase.from('admin_users').select('user_id').eq('user_id', signedInUser.id).maybeSingle();
      if (!active) return;
      setUser(signedInUser);
      setStatus(error || !adminRow ? 'denied' : 'allowed');
    }
    checkAccess();
    return () => { active = false; };
  }, [supabase]);

  if (status === 'checking') return <main className="admin-shell"><section className="admin-panel"><p className="eyebrow">ПРОВЕРКА ДОСТУПА</p><h1>Загружаем админку…</h1></section></main>;
  if (status === 'login') return <main className="admin-shell"><AdminLogin /></main>;
  if (status === 'denied') return <main className="admin-shell"><section className="admin-panel"><p className="eyebrow">ДОСТУП НЕ НАСТРОЕН</p><h1>Аккаунт не назначен администратором</h1><p>Добавьте этот User ID в <code>admin_users</code> в Supabase: <code>{user?.id}</code></p></section></main>;
  return <AdminDashboard email={user?.email || ''} />;
}
