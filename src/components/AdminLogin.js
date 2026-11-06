'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogin() {
  const supabase = createClient();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (!supabase) return <div className="admin-panel"><p className="eyebrow">НАСТРОЙКА</p><h1>Подключите Supabase</h1><p>Создайте проект и перенесите URL и anon key в локальный <code>.env.local</code>, ориентируясь на <code>.env.example</code>. Секреты нельзя публиковать в репозитории.</p></div>;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) setError('Не удалось войти. Проверьте почту и пароль.'); else window.location.reload();
  }
  return <form className="admin-panel login-panel" onSubmit={submit}><p className="eyebrow">ЗАКРЫТЫЙ ДОСТУП</p><h1>Войти в админку</h1><label>Почта<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{error&&<p className="form-error">{error}</p>}<button className="admin-submit" disabled={busy}>{busy?'Проверяем…':'Войти'}</button><p className="admin-hint">Доступ предоставляется только пользователям, добавленным администратором в таблицу <code>admin_users</code>.</p></form>;
}
