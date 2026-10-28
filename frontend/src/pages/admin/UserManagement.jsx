import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiArray, apiObject, usersAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';
import { EditStageToolbar, ResizableFrame, resetStageSizes } from '../../components/admin/EditStageTools';

const roleLabelsKo = { learner: '선수', instructor: '코치', hr_manager: '팀 매니저', admin: '관리자' };
const roleLabelsEn = { learner: 'Athlete', instructor: 'Coach', hr_manager: 'Team Manager', admin: 'Admin' };
const ROLE_OPTIONS = Object.entries(roleLabelsEn).map(([value, label]) => ({ value, label }));
// hr_manager may only manage athletes and coaches (backend canManageRole).
const HR_MANAGEABLE_ROLES = ['learner', 'instructor'];

const statusLabelsKo = { active: '활성', inactive: '비활성', pending: '대기' };
const statusLabelsEn = { active: 'Active', inactive: 'Inactive', pending: 'Pending' };
const STATUS_OPTIONS = ['active', 'inactive', 'pending'];

const emptyForm = {
  name_ko: '',
  name_en: '',
  email: '',
  password: '',
  role: 'learner',
  status: 'active',
  department: '',
  phone: '',
};

const formatDate = (value, isKorean) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(isKorean ? 'ko-KR' : 'en-US');
};

const errorMessage = (error, fallback) => (
  error?.response?.data?.error
  || error?.response?.data?.errors?.[0]?.msg
  || error?.response?.data?.detail
  || fallback
);

const UserManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editStage, setEditStage] = useState(false);
  const stageScope = 'admin_users';

  const canCreate = isAdmin() || currentUser?.role === 'hr_manager';
  const assignableRoles = isAdmin() ? ROLE_OPTIONS : ROLE_OPTIONS.filter((role) => HR_MANAGEABLE_ROLES.includes(role.value));
  const canManageUser = (user) => isAdmin() || HR_MANAGEABLE_ROLES.includes(user?.role);

  const roleLabel = (role) => (isKorean ? roleLabelsKo[role] : roleLabelsEn[role]) || role || '-';
  const statusLabel = (status) => (isKorean ? statusLabelsKo[status] : statusLabelsEn[status]) || status || (isKorean ? '알 수 없음' : 'Unknown');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll({
        search: searchTerm.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        limit: 200,
      });
      setUsers(apiArray(response.data, 'users'));
    } catch (error) {
      setUsers([]);
      showError(errorMessage(error, isKorean ? '사용자를 불러오지 못했습니다.' : 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm, showError, isKorean]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...emptyForm, role: assignableRoles[0]?.value || 'learner' });
    setDialogOpen(true);
  };

  const fillForm = (user) => ({
    ...emptyForm,
    name_ko: user.name_ko || '',
    name_en: user.name_en || '',
    email: user.email || '',
    role: user.role || 'learner',
    status: user.status || 'active',
    department: user.department || '',
    phone: user.phone || '',
  });

  const openEdit = async (user) => {
    setEditingUser(user);
    setForm(fillForm(user));
    setDialogOpen(true);
    // The list endpoint omits some fields (e.g. phone); load the full record.
    try {
      const response = await usersAPI.getById(user.id);
      const detail = apiObject(response.data, 'user');
      if (detail.id) setForm(fillForm({ ...user, ...detail }));
    } catch {
      // Keep the list data if the detail request fails.
    }
  };

  const saveUser = async () => {
    const nameKo = form.name_ko.trim();
    const email = form.email.trim();
    if (!nameKo || !email) {
      showError(isKorean ? '이름과 이메일을 입력해 주세요.' : 'Name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(isKorean ? '올바른 이메일 형식이 아닙니다.' : 'Enter a valid email address.');
      return;
    }
    if (!editingUser && form.password && form.password.length < 8) {
      showError(isKorean ? '비밀번호는 최소 8자 이상이어야 합니다.' : 'Password must be at least 8 characters.');
      return;
    }

    const payload = {
      name_ko: nameKo,
      name_en: form.name_en.trim() || null,
      email,
      phone: form.phone.trim() || null,
      role: form.role,
      status: form.status,
      department: form.department.trim() || null,
    };

    setSaving(true);
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, payload);
        showSuccess(isKorean ? '사용자가 수정되었습니다.' : 'User updated.');
      } else {
        if (form.password) payload.password = form.password;
        const response = await usersAPI.create(payload);
        const temporaryPassword = response.data?.temporaryPassword;
        showSuccess(temporaryPassword
          ? (isKorean ? `사용자가 생성되었습니다. 임시 비밀번호: ${temporaryPassword}` : `User created. Temporary password: ${temporaryPassword}`)
          : (isKorean ? '사용자가 생성되었습니다.' : 'User created.'));
      }

      setDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      showError(errorMessage(error, isKorean ? '사용자를 저장하지 못했습니다.' : 'Unable to save user.'));
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (user) => {
    const name = user.name_ko || user.name_en || user.email;
    if (!window.confirm(isKorean ? `'${name}' 사용자를 비활성화하시겠습니까?` : `Deactivate '${name}'?`)) return;
    try {
      await usersAPI.delete(user.id);
      showSuccess(isKorean ? '사용자가 비활성화되었습니다.' : 'User deactivated.');
      await fetchUsers();
    } catch (error) {
      showError(errorMessage(error, isKorean ? '사용자를 비활성화하지 못했습니다.' : 'Unable to deactivate user.'));
    }
  };

  const resetFrames = () => {
    resetStageSizes(stageScope);
    window.location.reload();
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>{isKorean ? '사용자 관리' : 'User Management'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isKorean ? '사용자 계정, 역할, 최근 로그인 시간과 IP를 확인합니다.' : 'Manage user accounts, roles, last login time, and login IP.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isSuperAdmin() && <EditStageToolbar enabled={editStage} onToggle={() => setEditStage((value) => !value)} onReset={resetFrames} />}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers}>{isKorean ? '새로고침' : 'Refresh'}</Button>
          {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{isKorean ? '사용자 추가' : 'Add User'}</Button>}
        </Box>
      </Box>

      <ResizableFrame scope={stageScope} id="user_table" enabled={editStage} minHeight={360} minWidth={280}>
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField fullWidth size="small" label={isKorean ? '검색' : 'Search'} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{isKorean ? '역할' : 'Role'}</InputLabel>
              <Select label={isKorean ? '역할' : 'Role'} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <MenuItem value="all">{isKorean ? '전체 역할' : 'All roles'}</MenuItem>
                {ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role.value} value={role.value}>{roleLabel(role.value)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{isKorean ? '이름' : 'Name'}</TableCell>
                    <TableCell>{isKorean ? '이메일' : 'Email'}</TableCell>
                    <TableCell>{isKorean ? '역할' : 'Role'}</TableCell>
                    <TableCell>{isKorean ? '상태' : 'Status'}</TableCell>
                    <TableCell>{isKorean ? '부서/종목' : 'Department'}</TableCell>
                    <TableCell>{isKorean ? '최근 로그인' : 'Last login'}</TableCell>
                    <TableCell>{isKorean ? '로그인 IP' : 'Login IP'}</TableCell>
                    <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{(isKorean ? user.name_ko || user.name_en : user.name_en || user.name_ko) || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell><Chip size="small" label={roleLabel(user.role)} /></TableCell>
                      <TableCell><Chip size="small" color={user.status === 'active' ? 'success' : 'default'} label={statusLabel(user.status)} /></TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(user.last_login_at, isKorean)}</TableCell>
                      <TableCell>{user.last_login_ip || '-'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {canManageUser(user) && <Button size="small" onClick={() => openEdit(user)}>{isKorean ? '수정' : 'Edit'}</Button>}
                        {isAdmin() && user.id !== currentUser?.id && user.status !== 'inactive' && (
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deactivateUser(user)}>{isKorean ? '비활성화' : 'Deactivate'}</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        {isKorean ? '등록된 사용자가 없습니다.' : 'No users are available.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </ResizableFrame>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editingUser ? (isKorean ? '사용자 수정' : 'Edit User') : (isKorean ? '사용자 추가' : 'Add User')}</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label={isKorean ? '한글 이름' : 'Korean name'} value={form.name_ko} onChange={(event) => setForm({ ...form, name_ko: event.target.value })} required />
          <TextField label={isKorean ? '영문 이름' : 'English name'} value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} />
          <TextField label={isKorean ? '이메일' : 'Email'} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          {!editingUser && (
            <TextField
              label={isKorean ? '비밀번호' : 'Password'}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              helperText={isKorean ? '비워 두면 임시 비밀번호가 발급됩니다. (8자 이상)' : 'Leave blank to issue a temporary password. (min. 8 characters)'}
            />
          )}
          <FormControl>
            <InputLabel>{isKorean ? '역할' : 'Role'}</InputLabel>
            <Select label={isKorean ? '역할' : 'Role'} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {(assignableRoles.some((role) => role.value === form.role) ? assignableRoles : [...assignableRoles, { value: form.role }]).map((role) => (
                <MenuItem key={role.value} value={role.value}>{roleLabel(role.value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{isKorean ? '상태' : 'Status'}</InputLabel>
            <Select label={isKorean ? '상태' : 'Status'} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {(STATUS_OPTIONS.includes(form.status) ? STATUS_OPTIONS : [...STATUS_OPTIONS, form.status]).map((status) => (
                <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label={isKorean ? '부서 / 종목' : 'Department / sport'} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          <TextField label={isKorean ? '전화번호' : 'Phone'} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={saveUser} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
