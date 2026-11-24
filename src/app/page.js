import V3Experience from '@/components/V3Experience';
import { demoPosts } from '@/data/posts';

export default function HomePage() {
  return <V3Experience posts={demoPosts} />;
}
