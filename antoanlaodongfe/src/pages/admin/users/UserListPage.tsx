import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, AlertTitle,
} from '@mui/material';
import {
  FileUpload, LockReset, FileDownload, Add, Edit, Save,
  AdminPanelSettings, ToggleOn, ToggleOff, Help, CheckCircle, Cancel,
} from '@mui/icons-material';
import { authApi } from '@/api/authApi';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { userApi, type UserResponse, type UserListFilters, type UserRequest } from '@/api/userApi';
import { departmentApi } from '@/api/departmentApi';
import type { UserRole } from '@/types/enums';

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  training_officer: 'Cán bộ đào tạo',
  worker: 'Người lao động',
  manager: 'Cán bộ quản lý',
};

const roleOptions = [
  { value: '', label: 'Tất cả' },
  ...Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l })),
];

const roleColors: Record<string, 'error' | 'primary' | 'success' | 'info'> = {
  admin: 'error',
  training_officer: 'primary',
  manager: 'info',
  worker: 'success',
};

interface RoleInfo {
  value: UserRole;
  label: string;
  description: string;
  permissions: { allowed: string[]; denied: string[] };
}

const ROLE_CATALOG: RoleInfo[] = [
  {
    value: 'admin' as UserRole,
    label: 'Quản trị viên',
    description: 'Toàn quyền hệ thống. Quản lý người dùng, phòng ban, cấu hình, webhook, audit log.',
    permissions: {
      allowed: [
        'Tạo / sửa / xoá người dùng và phân quyền',
        'Quản lý phòng ban (cây tổ chức)',
        'Cấu hình hệ thống, logo, chứng chỉ',
        'Webhooks và tích hợp bên ngoài',
        'Xem nhật ký hệ thống (audit log)',
        'Đặt lại mật khẩu cho mọi user',
        'Tất cả quyền của Cán bộ đào tạo',
      ],
      denied: [],
    },
  },
  {
    value: 'training_officer' as UserRole,
    label: 'Cán bộ đào tạo',
    description: 'Quản lý nội dung đào tạo, kỳ thi, phòng thi, chấm điểm và phê duyệt.',
    permissions: {
      allowed: [
        'Quản lý tài liệu, khoá học, ngân hàng câu hỏi',
        'Tạo mẫu đề thi, sinh đề, in đề PDF',
        'Quản lý kỳ thi và phòng thi',
        'Chấm bài thi tay nghề (thực hành)',
        'Phê duyệt nội dung trong "Hộp duyệt"',
        'Xem báo cáo thống kê',
      ],
      denied: [
        'Tạo / xoá người dùng và phân quyền',
        'Cấu hình hệ thống, webhook',
        'Audit log',
      ],
    },
  },
  {
    value: 'manager' as UserRole,
    label: 'Cán bộ quản lý',
    description: 'Xem báo cáo, theo dõi tiến độ học tập và kết quả thi của phòng ban.',
    permissions: {
      allowed: [
        'Xem báo cáo, dashboard, thống kê theo phòng ban',
        'Xem danh sách người lao động',
        'Xem lịch thi và kết quả thi',
      ],
      denied: [
        'Quản lý nội dung đào tạo',
        'Quản lý kỳ thi / phòng thi',
        'Tạo người dùng',
      ],
    },
  },
  {
    value: 'worker' as UserRole,
    label: 'Người lao động',
    description: 'Học tập, luyện tập và tham gia kỳ thi do hệ thống giao.',
    permissions: {
      allowed: [
        'Học khoá học và xem tài liệu được giao',
        'Tham gia kỳ thi online theo lịch',
        'Luyện tập với câu hỏi ngẫu nhiên',
        'Hỏi đáp trên diễn đàn, hỏi trợ lý AI',
        'Xem chứng chỉ và thành tích cá nhân',
      ],
      denied: [
        'Tạo nội dung đào tạo',
        'Quản lý người dùng / phòng ban',
        'Mọi chức năng quản trị',
      ],
    },
  },
];

const blankUser: UserRequest & { id?: string } = {
  username: '',
  password: '',
  full_name: '',
  employee_id: '',
  role: 'worker' as UserRole,
  department_id: undefined,
  occupation: '',
  skill_level: 1,
  phone: '',
  email: '',
};

export default function UserListPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 15;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });
  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['users', { role, departmentId, page, page_size: pageSize }],
    queryFn: () => userApi.list({
      role: (role || undefined) as UserRole | undefined,
      department_id: departmentId || undefined,
      page,
      page_size: pageSize,
    } as UserListFilters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); enqueueSnackbar('Đã vô hiệu hoá người dùng', { variant: 'success' }); },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      authApi.adminResetPassword(id, password),
    onSuccess: () => {
      enqueueSnackbar('Đã đặt lại mật khẩu', { variant: 'success' });
      setResetTarget(null);
      setNewPwd('');
      setConfirmPwd('');
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleResetSubmit = () => {
    if (!resetTarget) return;
    if (newPwd.length < 6) {
      enqueueSnackbar('Mật khẩu phải dài ít nhất 6 ký tự', { variant: 'warning' });
      return;
    }
    if (newPwd !== confirmPwd) {
      enqueueSnackbar('Mật khẩu xác nhận không khớp', { variant: 'warning' });
      return;
    }
    resetMutation.mutate({ id: resetTarget.id, password: newPwd });
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => userApi.importXlsx(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setImportResult(res);
      enqueueSnackbar(`Đã nhập ${res.created} người dùng (${res.skipped} bị bỏ qua)`, { variant: 'success' });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = '';
  };

  // ---- Create / Edit user ----
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [form, setForm] = useState<UserRequest>(blankUser);

  const openCreate = () => {
    setEditing(null);
    setForm(blankUser);
    setOpenForm(true);
  };

  const openEdit = (u: UserResponse) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: '', // not shown in edit
      full_name: u.full_name,
      employee_id: u.employee_id,
      role: u.role,
      department_id: u.department_id || undefined,
      occupation: u.occupation || '',
      skill_level: u.skill_level || 1,
      phone: u.phone || '',
      email: u.email || '',
    });
    setOpenForm(true);
  };

  const createUserMutation = useMutation({
    mutationFn: () => userApi.create(form),
    onSuccess: () => {
      enqueueSnackbar('Đã tạo người dùng', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpenForm(false);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const updateUserMutation = useMutation({
    mutationFn: () =>
      userApi.update(editing!.id, {
        full_name: form.full_name,
        role: form.role,
        department_id: form.department_id,
        occupation: form.occupation,
        skill_level: form.skill_level,
        phone: form.phone,
        email: form.email,
      }),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật người dùng', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleSubmitForm = () => {
    if (editing) updateUserMutation.mutate();
    else createUserMutation.mutate();
  };

  // ---- Quick role change ----
  const [roleTarget, setRoleTarget] = useState<UserResponse | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('worker' as UserRole);

  const changeRoleMutation = useMutation({
    mutationFn: () => userApi.changeRole(roleTarget!.id, newRole),
    onSuccess: () => {
      enqueueSnackbar(`Đã đổi vai trò thành "${roleLabels[newRole]}"`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
      setRoleTarget(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const openRoleDialog = (u: UserResponse) => {
    setRoleTarget(u);
    setNewRole(u.role);
  };

  // ---- Activate (deactivate is the existing delete) ----
  const activateMutation = useMutation({
    mutationFn: (id: string) => userApi.activate(id),
    onSuccess: () => {
      enqueueSnackbar('Đã kích hoạt người dùng', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  // ---- Permission reference dialog ----
  const [showPermissionRef, setShowPermissionRef] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await userApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-nhap-nguoi-dung.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý người dùng"
        subtitle="Danh sách người dùng và phân quyền trong hệ thống"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              startIcon={<Help />}
              onClick={() => setShowPermissionRef(true)}
            >
              Bảng phân quyền
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
            >
              Tải template
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              Nhập từ Excel
            </Button>
            <Button
              variant="contained" startIcon={<Add />}
              onClick={openCreate}
            >
              Tạo người dùng
            </Button>
          </Stack>
        }
      />
      <input
        type="file" accept=".xlsx,.xlsm" hidden ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select size="small" label="Vai trò" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
          {roleOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Phòng ban" value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Tất cả phòng ban</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.code} — {d.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : !data?.items.length ? (
        <EmptyState message="Chưa có người dùng nào" />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Họ tên</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã NV</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vai trò</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Bậc</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>SĐT</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((u: UserResponse) => {
                  const dept = u.department_id ? deptMap[u.department_id] : null;
                  return (
                    <TableRow key={u.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{u.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.username}</Typography>
                      </TableCell>
                      <TableCell>{u.employee_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={roleLabels[u.role] || u.role}
                          size="small"
                          color={roleColors[u.role] || 'default'}
                          variant="filled"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        {dept ? (
                          <Box>
                            <Typography variant="body2">{dept.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{dept.code}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">— chưa gán —</Typography>
                        )}
                      </TableCell>
                      <TableCell>{u.occupation || '—'}</TableCell>
                      <TableCell align="center">{u.skill_level || '—'}</TableCell>
                      <TableCell>{u.phone || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip label={u.is_active ? 'Hoạt động' : 'Vô hiệu'} size="small" color={u.is_active ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Đổi vai trò / phân quyền">
                          <IconButton size="small" color="primary" onClick={() => openRoleDialog(u)}>
                            <AdminPanelSettings fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sửa thông tin">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Đặt lại mật khẩu">
                          <IconButton size="small" color="warning" onClick={() => setResetTarget({ id: u.id, name: u.full_name })}>
                            <LockReset fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {u.is_active ? (
                          <Tooltip title="Vô hiệu hoá tài khoản">
                            <IconButton size="small" color="error" onClick={() => setDeleteId(u.id)}>
                              <ToggleOff fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Kích hoạt lại">
                            <IconButton size="small" color="success" onClick={() => activateMutation.mutate(u.id)}>
                              <ToggleOn fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleteId} title="Vô hiệu hoá người dùng" message="Vô hiệu hoá tài khoản này?" confirmText="Vô hiệu hoá" confirmColor="error" onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Sửa người dùng' : 'Tạo người dùng mới'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Tên đăng nhập" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editing}
                helperText={editing ? 'Không thể đổi sau khi tạo' : ''}
              />
              {!editing && (
                <TextField
                  fullWidth type="password" label="Mật khẩu ban đầu" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Họ và tên" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <TextField
                fullWidth label="Mã nhân viên" value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                disabled={!!editing}
                helperText={editing ? 'Không thể đổi sau khi tạo' : ''}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select fullWidth label="Vai trò" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                {Object.entries(roleLabels).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
              <TextField
                select fullWidth label="Phòng ban" value={form.department_id || ''}
                onChange={(e) => setForm({ ...form, department_id: e.target.value || undefined })}
              >
                <MenuItem value="">— Chưa gán —</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.code} — {d.name}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Nghề / chức danh" value={form.occupation || ''}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
              <TextField
                select fullWidth label="Bậc tay nghề" value={form.skill_level || 1}
                onChange={(e) => setForm({ ...form, skill_level: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <MenuItem key={n} value={n}>Bậc {n}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth label="Số điện thoại" value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <TextField
                fullWidth type="email" label="Email" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Hủy</Button>
          <Button
            variant="contained" startIcon={<Save />}
            onClick={handleSubmitForm}
            disabled={
              !form.username || !form.full_name || !form.employee_id ||
              (!editing && !form.password) ||
              createUserMutation.isPending || updateUserMutation.isPending
            }
          >
            {editing ? 'Cập nhật' : 'Tạo người dùng'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Đặt lại mật khẩu</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Đặt lại mật khẩu cho: <strong>{resetTarget?.name}</strong>
          </Typography>
          <TextField
            fullWidth type="password" label="Mật khẩu mới" value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)} sx={{ mb: 2 }} autoFocus
          />
          <TextField
            fullWidth type="password" label="Xác nhận mật khẩu" value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTarget(null)}>Hủy</Button>
          <Button
            variant="contained" color="warning" startIcon={<LockReset />}
            onClick={handleResetSubmit} disabled={resetMutation.isPending}
          >
            Đặt lại
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick role-change dialog */}
      <Dialog open={!!roleTarget} onClose={() => setRoleTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <AdminPanelSettings color="primary" />
            Phân quyền: {roleTarget?.full_name}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vai trò hiện tại:{' '}
            <Chip
              size="small"
              label={roleLabels[roleTarget?.role || '']}
              color={roleColors[roleTarget?.role || '']}
            />
          </Typography>

          <TextField
            select fullWidth label="Vai trò mới" value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            sx={{ mb: 2 }}
          >
            {ROLE_CATALOG.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Show permissions of the selected role */}
          {(() => {
            const info = ROLE_CATALOG.find((r) => r.value === newRole);
            if (!info) return null;
            return (
              <Alert severity="info" sx={{ mb: 1 }}>
                <AlertTitle>{info.label}</AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>{info.description}</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mt: 1 }}>
                  Quyền được cấp:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {info.permissions.allowed.map((p, i) => (
                    <Typography key={i} component="li" variant="caption" sx={{ display: 'list-item' }}>
                      {p}
                    </Typography>
                  ))}
                </Box>
                {info.permissions.denied.length > 0 && (
                  <>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mt: 1 }}>
                      KHÔNG có quyền:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {info.permissions.denied.map((p, i) => (
                        <Typography key={i} component="li" variant="caption" sx={{ display: 'list-item' }}>
                          {p}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
              </Alert>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleTarget(null)}>Hủy</Button>
          <Button
            variant="contained" color="primary" startIcon={<Save />}
            disabled={newRole === roleTarget?.role || changeRoleMutation.isPending}
            onClick={() => changeRoleMutation.mutate()}
          >
            Áp dụng vai trò
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission reference dialog */}
      <Dialog open={showPermissionRef} onClose={() => setShowPermissionRef(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Help color="primary" />
            Bảng phân quyền — Mô tả các vai trò
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {ROLE_CATALOG.map((r) => (
              <Paper key={r.value} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip
                    label={r.label} color={roleColors[r.value]}
                    icon={<AdminPanelSettings />} sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {r.description}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="success.main" sx={{ display: 'block', mb: 0.5 }}>
                      ✓ Quyền được cấp
                    </Typography>
                    <Stack spacing={0.5}>
                      {r.permissions.allowed.map((p, i) => (
                        <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start">
                          <CheckCircle fontSize="inherit" color="success" sx={{ mt: 0.4 }} />
                          <Typography variant="caption">{p}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                  {r.permissions.denied.length > 0 && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" fontWeight={600} color="error.main" sx={{ display: 'block', mb: 0.5 }}>
                        ✗ KHÔNG có quyền
                      </Typography>
                      <Stack spacing={0.5}>
                        {r.permissions.denied.map((p, i) => (
                          <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start">
                            <Cancel fontSize="inherit" color="error" sx={{ mt: 0.4 }} />
                            <Typography variant="caption">{p}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionRef(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!importResult} onClose={() => setImportResult(null)} fullWidth maxWidth="sm">
        <DialogTitle>Kết quả nhập</DialogTitle>
        <DialogContent>
          {importResult && (
            <>
              <Alert severity={importResult.created > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                <AlertTitle>
                  Thành công: {importResult.created} · Bị bỏ qua: {importResult.skipped}
                </AlertTitle>
              </Alert>
              {importResult.errors.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Chi tiết lỗi:</Typography>
                  <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" component="div">
                        {err}
                      </Typography>
                    ))}
                  </Box>
                </>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Cột bắt buộc: username, password, full_name, employee_id. Cột tuỳ chọn: role, department_id, occupation, skill_level, phone, email.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportResult(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
