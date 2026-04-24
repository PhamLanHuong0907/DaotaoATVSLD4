import { Box, Typography } from '@mui/material';

export interface AreaLinePoint {
  label: string;
  value: number;
}

interface Props {
  data: AreaLinePoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
  emptyText?: string;
}

export default function AreaLineChart({
  data, color = '#1565c0', height = 240, valueSuffix = '', emptyText = 'Không có dữ liệu',
}: Props) {
  if (!data.length) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
      </Box>
    );
  }

  const W = 600;
  const H = height;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padL + i * step,
    y: padT + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${padL + (data.length - 1) * step},${padT + innerH} L${padL},${padT + innerH} Z`;

  // Y gridlines (4 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + innerH - f * innerH,
    v: Math.round(max * f),
  }));

  return (
    <Box sx={{ width: '100%' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMin meet">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#e2e8f0" strokeDasharray="3,3" />
            <text x={padL - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="#64748b">{t.v}{valueSuffix}</text>
          </g>
        ))}
        <path d={areaPath} fill={color} fillOpacity={0.15} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{p.label}</text>
          </g>
        ))}
      </svg>
    </Box>
  );
}
