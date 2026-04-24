import { Chip } from '@mui/material';
import type { ResultClassification } from '@/types/enums';
import { classificationLabels } from '@/utils/vietnameseLabels';

const colorMap: Record<ResultClassification, 'success' | 'info' | 'warning' | 'error'> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  fail: 'error',
};

interface ClassificationChipProps {
  classification: ResultClassification | null;
  size?: 'small' | 'medium';
}

export default function ClassificationChip({ classification, size = 'small' }: ClassificationChipProps) {
  if (!classification) return null;
  return (
    <Chip
      label={classificationLabels[classification]}
      color={colorMap[classification]}
      size={size}
      variant="filled"
    />
  );
}
