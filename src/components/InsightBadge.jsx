import { Info, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

const TYPES = {
  info:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  Icon: Info },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', Icon: AlertTriangle },
  danger:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   Icon: AlertOctagon },
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  Icon: CheckCircle },
};

export default function InsightBadge({ type = 'info', text }) {
  const { color, bg, border, Icon } = TYPES[type] ?? TYPES.info;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '6px 14px', borderRadius: '9999px',
      background: bg, border: `1px solid ${border}`,
    }}>
      <Icon size={13} color={color} style={{ flexShrink: 0 }} />
      <span style={{
        color,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '12px', fontWeight: 500, lineHeight: 1.4,
      }}>
        {text}
      </span>
    </div>
  );
}
