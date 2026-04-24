import { Box } from '@mui/material';

interface Props {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function MiniLineChart({ data, color = '#1565c0', height = 40, width = 120 }: Props) {
  if (!data.length) return <Box sx={{ height, width }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}
