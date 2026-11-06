import StyleGate from '@/components/StyleGate';
import { demoPosts } from '@/data/posts';

export default function HomePage() {
  return <StyleGate posts={demoPosts} />;
}
