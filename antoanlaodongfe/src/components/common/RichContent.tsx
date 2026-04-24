import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

interface Props {
  children: string;
}

function looksLikeHtml(s: string): boolean {
  return /<\/?(p|div|span|h[1-6]|ul|ol|li|strong|em|u|s|a|img|blockquote|pre|code|br|hr|table|thead|tbody|tr|td|th)(\s[^>]*)?>/i.test(s);
}

export default function RichContent({ children }: Props) {
  const sx = {
    '& p': { m: 0, mb: 1, lineHeight: 1.8 },
    '& h1, & h2, & h3, & h4': { mt: 2, mb: 1, fontWeight: 700 },
    '& h1': { fontSize: '1.75rem' },
    '& h2': { fontSize: '1.4rem' },
    '& h3': { fontSize: '1.2rem' },
    '& ul, & ol': { pl: 3, mb: 1 },
    '& li': { mb: 0.5 },
    '& a': { color: 'primary.main', textDecoration: 'underline' },
    '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
    '& blockquote': {
      borderLeft: '3px solid', borderColor: 'primary.light',
      pl: 2, ml: 0, color: 'text.secondary', fontStyle: 'italic',
    },
    '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.9em' },
    '& pre': {
      bgcolor: 'grey.900', color: 'grey.100', p: 1.5, borderRadius: 1,
      overflowX: 'auto', fontSize: '0.85em',
    },
    '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 1.5 },
    '& table': {
      borderCollapse: 'collapse', my: 1.5, width: '100%',
      display: 'block', overflowX: 'auto',
    },
    '& th, & td': {
      border: '1px solid', borderColor: 'divider',
      px: 1.5, py: 1, textAlign: 'left', verticalAlign: 'top',
    },
    '& th': { bgcolor: 'grey.100', fontWeight: 600 },
    '& tr:nth-of-type(even) td': { bgcolor: 'grey.50' },
  } as const;

  if (looksLikeHtml(children)) {
    const clean = DOMPurify.sanitize(children, { USE_PROFILES: { html: true } });
    return <Box sx={sx} dangerouslySetInnerHTML={{ __html: clean }} />;
  }

  return (
    <Box sx={sx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}
