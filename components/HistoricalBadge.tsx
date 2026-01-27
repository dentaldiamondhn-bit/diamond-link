interface HistoricalBadgeProps {
  isHistorical: boolean;
  isBypassed: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export function HistoricalBadge({ 
  isHistorical, 
  isBypassed, 
  size = 'sm', 
  className = '',
  showIcon = true 
}: HistoricalBadgeProps) {
  if (!isHistorical || isBypassed) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const baseClasses = 'inline-flex items-center rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800';
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${className}`}>
      {showIcon && <i className="fas fa-history mr-1"></i>}
      Histórico
    </span>
  );
}

export default HistoricalBadge;
