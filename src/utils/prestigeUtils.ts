// Utility to handle missing UI component imports gracefully
export const safelyImportComponent = (componentName: string) => {
  console.warn(`Component ${componentName} is not available, using fallback`);
  return ({ children, ...props }: any) => children || null;
};

// Enhanced CSS classes for the Prestige theme
export const prestigeClasses = {
  gradientPrimary: 'bg-gradient-to-br from-blue-500 to-purple-600',
  gradientSecondary: 'bg-gradient-to-br from-gray-100 to-gray-200',
  gradientAccent: 'bg-gradient-to-br from-yellow-400 to-orange-500',
  shadowGlow: 'shadow-lg shadow-blue-500/20',
  borderGlow: 'border-blue-500/30',
  textGradient: 'bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent',
};

export default prestigeClasses;