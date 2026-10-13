import { LESSONS } from '@/content/lessons';
import LessonPlayer from '@/components/learn/LessonPlayer';

export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonPlayer id={id} />;
}
