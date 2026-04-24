/**
 * Lightweight donut chart built with raw SVG.
 */
import { Box, Stack, Typography } from '@mui/material';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

export default function DonutChart({ data, size = 180, thickness = 28, centerLabel }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  const innerR = radius - thickness;
  const cx = radius;
  const cy = radius;

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: size }}>
        <Typography variant="body2" color="text.secondary">Không có dữ liệu</Typography>
      </Box>
    );
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const start = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += d.value;
    const end = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const xi1 = cx + innerR * Math.cos(end);
    const yi1 = cy + innerR * Math.sin(end);
    const xi2 = cx + innerR * Math.cos(start);
    const yi2 = cy + innerR * Math.sin(start);
    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${xi1} ${yi1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2} ${yi2}`,
      'Z',
    ].join(' ');
    return { ...d, path };
  });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
      <svg width={size} height={size}>
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color}>
            <title>{`${s.label}: ${s.value}`}</title>
          </path>
        ))}
        {centerLabel && (
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="20" fontWeight={700} fill="#1e293b">
            {centerLabel}
          </text>
        )}
      </svg>
      <Stack spacing={0.5}>
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 12, height: 12, bgcolor: d.color, borderRadius: 0.5 }} />
              <Typography variant="caption">
                <strong>{d.label}:</strong> {d.value} ({pct}%)
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
