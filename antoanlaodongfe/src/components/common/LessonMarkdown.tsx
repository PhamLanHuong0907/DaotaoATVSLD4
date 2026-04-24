import RichContent from './RichContent';

interface Props {
  children: string;
}

export default function LessonMarkdown({ children }: Props) {
  return <RichContent>{children}</RichContent>;
}
