/**
 * Lightweight horizontal bar chart built with raw SVG.
 * No external chart library required.
 */
import { Box, Typography } from '@mui/material';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarItem[];
  height?: number;
  valueSuffix?: string;
  emptyText?: string;
}

const PALETTE = ['#1565c0', '#7b1fa2', '#f57c00', '#0097a7', '#388e3c', '#5c6bc0', '#c2185b', '#00838f'];

export default function BarChart({ data, height = 240, valueSuffix = '', emptyText = 'Không có dữ liệu' }: Props) {
  if (!data.length) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
      </Box>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const rowHeight = 32;
  const labelWidth = 140;
  const padding = 12;
  const totalH = padding * 2 + data.length * rowHeight;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg width="100%" height={Math.max(totalH, height)} viewBox={`0 0 600 ${totalH}`} preserveAspectRatio="xMinYMin meet">
        {data.map((d, i) => {
          const y = padding + i * rowHeight;
          const barW = ((600 - labelWidth - padding) * d.value) / max;
          const color = d.color || PALETTE[i % PALETTE.length];
          return (
            <g key={d.label + i}>
              <text x={labelWidth - 6} y={y + 18} textAnchor="end" fontSize="12" fill="#475569">
                {d.label.length > 22 ? d.label.slice(0, 20) + '…' : d.label}
              </text>
              <rect x={labelWidth} y={y + 6} width={barW} height={20} rx={4} fill={color} />
              <text x={labelWidth + barW + 6} y={y + 21} fontSize="12" fill="#1e293b" fontWeight={600}>
                {d.value}{valueSuffix}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
