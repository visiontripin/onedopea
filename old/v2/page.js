import V2Experience from '@/components/V2Experience';
import { demoPosts } from '@/data/postsV2';

export const metadata = {
  title: 'ONEDOPEA · v2 — Сохранённая версия сайта',
  description: 'Сохранённая версия v2 портфолио ONEDOPEA с режимами One и Dope.',
};

export default function V2Page() {
  return <V2Experience posts={demoPosts} />;
}
