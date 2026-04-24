import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Tab,  Paper, Stack, Button, IconButton, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import {
  occupationApi, certTypeApi,
  type Occupation, type OccupationInput,
  type CertificateType, type CertificateTypeInput,
} from '@/api/catalogApi';

type TabKey = 'occupation' | 'cert';

export default function CatalogsPage() {
  const [tab, setTab] = useState<TabKey>('occupation');

  return (
    <>
      <PageHeader title="Danh mục" subtitle="Quản lý nghề và loại chứng chỉ" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="occupation" label="Nghề" />
        <Tab value="cert" label="Loại chứng chỉ" />
      </Tabs>
      {tab === 'occupation' ? <OccupationSection /> : <CertTypeSection />}
    </>
  );
}

// ---- Occupation ----

function OccupationSection() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { data = [] } = useQuery({
    queryKey: ['occupations', 'all'],
    queryFn: () => occupationApi.list(false),
  });
  const [editing, setEditing] = useState<Occupation | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => occupationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupations'] });
      enqueueSnackbar('Đã xoá', { variant: 'success' });
    },
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setOpen(true); }}>
          Thêm nghề
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Mã</TableCell>
            <TableCell>Tên nghề</TableCell>
            <TableCell>Mô tả</TableCell>
            <TableCell>Bậc thợ</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.code}</TableCell>
              <TableCell>{o.name}</TableCell>
              <TableCell>{o.description}</TableCell>
              <TableCell>{o.skill_levels.join(', ') || '—'}</TableCell>
              <TableCell>
                <Chip size="small" label={o.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  color={o.is_active ? 'success' : 'default'} />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => { setEditing(o); setOpen(true); }}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error"
                  onClick={() => { if (confirm(`Xoá "${o.name}"?`)) del.mutate(o.id); }}>
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!data.length && (
            <TableRow><TableCell colSpan={6} align="center">Chưa có dữ liệu</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <OccupationDialog
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
      />
    </Paper>
  );
}

function OccupationDialog({
  open, editing, onClose,
}: { open: boolean; editing: Occupation | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<OccupationInput>({
    code: '', name: '', description: '', skill_levels: [], is_active: true,
  });
  const [skillText, setSkillText] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code, name: editing.name,
        description: editing.description || '',
        skill_levels: editing.skill_levels,
        is_active: editing.is_active,
      });
      setSkillText(editing.skill_levels.join(','));
    } else {
      setForm({ code: '', name: '', description: '', skill_levels: [], is_active: true });
      setSkillText('');
    }
  }, [editing, open]);

  const save = useMutation({
    mutationFn: () => {
      const payload: OccupationInput = {
        ...form,
        skill_levels: skillText.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
      };
      return editing
        ? occupationApi.update(editing.id, payload)
        : occupationApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupations'] });
      enqueueSnackbar('Đã lưu', { variant: 'success' });
      onClose();
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Sửa nghề' : 'Thêm nghề'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Mã nghề" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
          <TextField label="Tên nghề" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
          <TextField label="Mô tả" value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
          <TextField label="Bậc thợ (cách nhau bởi ,)" value={skillText}
            onChange={(e) => setSkillText(e.target.value)} helperText="Ví dụ: 1,2,3,4,5" fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- CertificateType ----

function CertTypeSection() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { data = [] } = useQuery({
    queryKey: ['cert-types', 'all'],
    queryFn: () => certTypeApi.list(false),
  });
  const [editing, setEditing] = useState<CertificateType | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => certTypeApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cert-types'] });
      enqueueSnackbar('Đã xoá', { variant: 'success' });
    },
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setOpen(true); }}>
          Thêm loại chứng chỉ
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Mã</TableCell>
            <TableCell>Tên chứng chỉ</TableCell>
            <TableCell>Cơ quan cấp</TableCell>
            <TableCell>Hạn (tháng)</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.code}</TableCell>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.issuing_authority || '—'}</TableCell>
              <TableCell>{c.validity_months}</TableCell>
              <TableCell>
                <Chip size="small" label={c.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  color={c.is_active ? 'success' : 'default'} />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error"
                  onClick={() => { if (confirm(`Xoá "${c.name}"?`)) del.mutate(c.id); }}>
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!data.length && (
            <TableRow><TableCell colSpan={6} align="center">Chưa có dữ liệu</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <CertTypeDialog open={open} editing={editing} onClose={() => setOpen(false)} />
    </Paper>
  );
}

function CertTypeDialog({
  open, editing, onClose,
}: { open: boolean; editing: CertificateType | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<CertificateTypeInput>({
    code: '', name: '', description: '', validity_months: 12, issuing_authority: '', is_active: true,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code, name: editing.name,
        description: editing.description || '',
        validity_months: editing.validity_months,
        issuing_authority: editing.issuing_authority || '',
        is_active: editing.is_active,
      });
    } else {
      setForm({
        code: '', name: '', description: '',
        validity_months: 12, issuing_authority: '', is_active: true,
      });
    }
  }, [editing, open]);

  const save = useMutation({
    mutationFn: () => editing
      ? certTypeApi.update(editing.id, form)
      : certTypeApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cert-types'] });
      enqueueSnackbar('Đã lưu', { variant: 'success' });
      onClose();
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Sửa loại chứng chỉ' : 'Thêm loại chứng chỉ'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Mã" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
          <TextField label="Tên chứng chỉ" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
          <TextField label="Cơ quan cấp" value={form.issuing_authority || ''}
            onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })} fullWidth />
          <TextField label="Thời hạn (tháng)" type="number" value={form.validity_months ?? 12}
            onChange={(e) => setForm({ ...form, validity_months: parseInt(e.target.value, 10) || 0 })} fullWidth />
          <TextField label="Mô tả" value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
