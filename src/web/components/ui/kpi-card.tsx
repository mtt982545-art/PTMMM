interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'green' | 'blue' | 'yellow' | 'emerald';
}

export default function KpiCard({ title, value, subtitle, icon, trend, color = 'emerald' }: KpiCardProps) {
  const colorClasses = {
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    emerald: 'bg-emerald-500/20 text-emerald-400'
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-1 text-[#FFD700]">{value}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
      {trend && <div className="text-xs text-green-400 mt-1">{trend}</div>}
    </div>
  );
}