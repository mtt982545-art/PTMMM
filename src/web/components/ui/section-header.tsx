interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  badge?: string;
}

export default function SectionHeader({ title, subtitle, align = 'center', badge }: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  
  return (
    <div className={`mb-12 ${alignClass}`}>
      {badge && (
        <span className="inline-block px-3 py-1 bg-[#FFD700]/20 text-[#FFD700] text-sm font-medium rounded-full mb-4">
          {badge}
        </span>
      )}
      <h2 className="text-4xl font-bold text-white mb-4">
        {title.split(' ').map((word, index) => (
          <span key={index} className={word.includes('MMM') || word.includes('Mitramulia') ? 'text-[#FFD700]' : ''}>
            {word}{' '}
          </span>
        ))}
      </h2>
      {subtitle && (
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}