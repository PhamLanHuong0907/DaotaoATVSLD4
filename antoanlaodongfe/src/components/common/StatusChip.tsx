import { Chip } from '@mui/material';
import type { ApprovalStatus } from '@/types/enums';
import { approvalStatusLabels } from '@/utils/vietnameseLabels';

const statusColorMap: Record<ApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'error',
};

interface StatusChipProps {
  status: ApprovalStatus;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return (
    <Chip
      label={approvalStatusLabels[status]}
      color={statusColorMap[status]}
      size={size}
      variant="filled"
    />
  );
}
