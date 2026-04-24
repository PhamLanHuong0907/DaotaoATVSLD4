/**
 * Render markdown text using react-markdown with consistent MUI styling.
 * Used by AI tutor chat, exam explanations, and any AI-generated content.
 */
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';

interface Props {
  children: string;
  /** Compact mode reduces vertical spacing for chat bubbles */
  compact?: boolean;
}

export default function MarkdownContent({ children, compact = false }: Props) {
  return (
    <Box
      sx={{
        '& p': {
          m: 0,
          mb: compact ? 1 : 1.5,
          fontSize: compact ? '0.9rem' : '1rem',
          lineHeight: 1.7,
          '&:last-child': { mb: 0 },
        },
        '& h1': { mt: 2, mb: 1, fontSize: '1.25rem', fontWeight: 700 },
        '& h2': { mt: 2, mb: 1, fontSize: '1.15rem', fontWeight: 700 },
        '& h3': { mt: 1.5, mb: 0.5, fontSize: '1.05rem', fontWeight: 700 },
        '& h4, & h5, & h6': { mt: 1.5, mb: 0.5, fontSize: '0.95rem', fontWeight: 700 },
        '& ul, & ol': { m: 0, pl: 3, mb: compact ? 1 : 1.5 },
        '& li': {
          fontSize: compact ? '0.9rem' : '1rem',
          lineHeight: 1.7,
          mb: 0.25,
        },
        '& li > p': { mb: 0.25 },
        '& code': {
          bgcolor: 'action.hover',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: '0.85em',
          fontFamily: 'monospace',
        },
        '& pre': {
          bgcolor: 'action.hover',
          p: 1.5,
          borderRadius: 1,
          overflow: 'auto',
          mb: 1.5,
          '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.85em' },
        },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          pl: 1.5,
          ml: 0,
          my: 1,
          color: 'text.secondary',
        },
        '& strong': { fontWeight: 700 },
        '& em': { fontStyle: 'italic' },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 1.5,
          fontSize: compact ? '0.85rem' : '0.95rem',
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.5,
        },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
        '& hr': {
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'divider',
          my: 1.5,
        },
        '& img': { maxWidth: '100%', borderRadius: 1 },
      }}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </Box>
  );
}
