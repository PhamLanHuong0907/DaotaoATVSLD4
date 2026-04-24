import { useEffect } from 'react';
import { Box, Divider, IconButton, Stack, ToggleButton, Tooltip } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, StrikethroughS,
  FormatListBulleted, FormatListNumbered, FormatQuote, Code,
  FormatAlignLeft, FormatAlignCenter, FormatAlignRight, FormatAlignJustify,
  Link as LinkIcon, LinkOff, Image as ImageIcon, Undo, Redo, Title,
  HorizontalRule, FormatClear,
} from '@mui/icons-material';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('URL ảnh', 'https://');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        p: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
        rowGap: 0.5,
        bgcolor: 'grey.50',
      }}
    >
      <Tooltip title="Hoàn tác">
        <span><IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo fontSize="small" /></IconButton></span>
      </Tooltip>
      <Tooltip title="Làm lại">
        <span><IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo fontSize="small" /></IconButton></span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Tiêu đề 1">
        <ToggleButton value="h1" size="small" selected={editor.isActive('heading', { level: 1 })} onClick={() => setHeading(1)} sx={{ border: 0, px: 0.75 }}>
          <Title fontSize="small" /> <Box component="span" sx={{ ml: 0.25, fontSize: 11, fontWeight: 700 }}>1</Box>
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Tiêu đề 2">
        <ToggleButton value="h2" size="small" selected={editor.isActive('heading', { level: 2 })} onClick={() => setHeading(2)} sx={{ border: 0, px: 0.75 }}>
          <Title fontSize="small" /> <Box component="span" sx={{ ml: 0.25, fontSize: 11, fontWeight: 700 }}>2</Box>
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Tiêu đề 3">
        <ToggleButton value="h3" size="small" selected={editor.isActive('heading', { level: 3 })} onClick={() => setHeading(3)} sx={{ border: 0, px: 0.75 }}>
          <Title fontSize="small" /> <Box component="span" sx={{ ml: 0.25, fontSize: 11, fontWeight: 700 }}>3</Box>
        </ToggleButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Đậm">
        <ToggleButton value="bold" size="small" selected={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} sx={{ border: 0 }}>
          <FormatBold fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Nghiêng">
        <ToggleButton value="italic" size="small" selected={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} sx={{ border: 0 }}>
          <FormatItalic fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Gạch chân">
        <ToggleButton value="underline" size="small" selected={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} sx={{ border: 0 }}>
          <FormatUnderlined fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Gạch ngang">
        <ToggleButton value="strike" size="small" selected={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} sx={{ border: 0 }}>
          <StrikethroughS fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Xoá định dạng">
        <IconButton size="small" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <FormatClear fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Danh sách ●">
        <ToggleButton value="ul" size="small" selected={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} sx={{ border: 0 }}>
          <FormatListBulleted fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Danh sách 1.">
        <ToggleButton value="ol" size="small" selected={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} sx={{ border: 0 }}>
          <FormatListNumbered fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Trích dẫn">
        <ToggleButton value="quote" size="small" selected={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} sx={{ border: 0 }}>
          <FormatQuote fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Mã nguồn">
        <ToggleButton value="code" size="small" selected={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} sx={{ border: 0 }}>
          <Code fontSize="small" />
        </ToggleButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Căn trái">
        <ToggleButton value="left" size="small" selected={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} sx={{ border: 0 }}>
          <FormatAlignLeft fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Căn giữa">
        <ToggleButton value="center" size="small" selected={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} sx={{ border: 0 }}>
          <FormatAlignCenter fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Căn phải">
        <ToggleButton value="right" size="small" selected={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} sx={{ border: 0 }}>
          <FormatAlignRight fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Căn đều">
        <ToggleButton value="justify" size="small" selected={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} sx={{ border: 0 }}>
          <FormatAlignJustify fontSize="small" />
        </ToggleButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Chèn liên kết">
        <IconButton size="small" onClick={setLink} color={editor.isActive('link') ? 'primary' : 'default'}>
          <LinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Bỏ liên kết">
        <span><IconButton size="small" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')}>
          <LinkOff fontSize="small" />
        </IconButton></span>
      </Tooltip>
      <Tooltip title="Chèn ảnh (URL)">
        <IconButton size="small" onClick={addImage}>
          <ImageIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Đường kẻ ngang">
        <IconButton size="small" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <HorizontalRule fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 200, disabled }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Nhập nội dung...' }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
        '&:focus-within': { borderColor: 'primary.main' },
      }}
    >
      <Toolbar editor={editor} />
      <Box
        sx={{
          px: 1.5,
          py: 1,
          minHeight,
          maxHeight: 500,
          overflowY: 'auto',
          '& .tiptap': { outline: 'none', minHeight: minHeight - 16 },
          '& .tiptap p': { m: 0, mb: 1, lineHeight: 1.7 },
          '& .tiptap h1': { fontSize: '1.75rem', fontWeight: 700, mt: 1.5, mb: 1 },
          '& .tiptap h2': { fontSize: '1.4rem', fontWeight: 700, mt: 1.5, mb: 1 },
          '& .tiptap h3': { fontSize: '1.2rem', fontWeight: 700, mt: 1.25, mb: 0.75 },
          '& .tiptap ul, & .tiptap ol': { pl: 3, mb: 1 },
          '& .tiptap li p': { mb: 0 },
          '& .tiptap blockquote': {
            borderLeft: '3px solid', borderColor: 'primary.light',
            pl: 2, ml: 0, color: 'text.secondary', fontStyle: 'italic',
          },
          '& .tiptap code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.9em' },
          '& .tiptap pre': {
            bgcolor: 'grey.900', color: 'grey.100', p: 1.5, borderRadius: 1,
            overflowX: 'auto', fontSize: '0.85em',
          },
          '& .tiptap img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
          '& .tiptap a': { color: 'primary.main', textDecoration: 'underline' },
          '& .tiptap hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 1.5 },
          '& .tiptap p.is-editor-empty:first-child::before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
