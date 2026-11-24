import V3Experience from '@/components/V3Experience';
import { demoPosts } from '@/data/posts';

export const metadata = {
  title: 'ONEDOPEA · v3 — 3D-капсулы, One и Dope',
  description: 'Новая версия v3 портфолио ONEDOPEA: вход через 3D-капсулы, 7 каналов Matrix (One) и обновлённая лента проектов Dope.',
};

export default function V3Page() {
  return <V3Experience posts={demoPosts} />;
}
