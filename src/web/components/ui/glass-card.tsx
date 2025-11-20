interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export default function GlassCard({ children, className = '', padding = 'md' }: GlassCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 ${paddingClasses[padding]} ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255, 215, 0, 0.2)'
      }}
    >
      {children}
    </div>
  );
}