// Phone utility functions for WhatsApp integration and formatting

// Country codes data from the original HTML form with flags
export const countries = [
  { code: '504', name: 'Honduras', flag: '🇭🇳' },
  { code: '1', name: 'USA/Canadá', flag: '🇺🇸' },
  { code: '52', name: 'México', flag: '🇲🇽' },
  { code: '502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '507', name: 'Panamá', flag: '🇵🇦' },
  { code: '34', name: 'España', flag: '🇪🇸' },
  { code: '54', name: 'Argentina', flag: '🇦🇷' },
  { code: '57', name: 'Colombia', flag: '🇨🇴' },
];

// Helper function to create WhatsApp URL
export const createWhatsAppUrl = (phoneNumber: string, countryCode?: string | null) => {
  if (!phoneNumber) return '#';
  
  // Clean phone number - remove spaces, dashes, parentheses
  let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // If we have a separate country code, combine them
  if (countryCode) {
    cleanPhone = countryCode + cleanPhone;
  } else {
    // Handle old combined format if it exists
    if (cleanPhone.startsWith('+')) {
      // Already has country code
      cleanPhone = cleanPhone.substring(1);
    }
  }
  
  return `https://wa.me/${cleanPhone}`;
};

// Helper function to format phone display
export const formatPhoneDisplay = (phoneNumber: string, countryCode?: string | null) => {
  if (!phoneNumber) return '';
  
  // Check if phone number already starts with a country code
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (countryCode) {
    // If we have a separate country code, use it
    return `+${countryCode} ${phoneNumber}`;
  }
  
  // If no separate country code, check if phone number already has one
  if (cleanPhone.startsWith('+')) {
    return phoneNumber; // Already has country code
  }
  
  // Check if it starts with known country codes (without +)
  const knownCountryCodes = ['1', '504', '502', '506', '503', '505', '507', '52', '34', '54', '57'];
  const startsWithCountryCode = knownCountryCodes.some(code => cleanPhone.startsWith(code));
  
  if (startsWithCountryCode && cleanPhone.length >= 10) {
    // Likely already has country code, add + for display
    return `+${cleanPhone}`;
  }
  
  // If no country code found, return as-is (don't assume Honduras)
  return phoneNumber;
};

// Helper function to parse phone number and extract country code
export const parsePhoneNumber = (phoneNumber: string | null | undefined, countryCode?: string | null) => {
  // If we have separate country code, use it and return the phone number as-is
  if (countryCode) {
    return { countryCode, number: phoneNumber || '' };
  }
  
  // Fallback for old combined format
  if (!phoneNumber) return { countryCode: '504', number: '' };
  
  // Remove any existing + and split by first space
  const cleaned = phoneNumber.replace(/^\+/, '');
  const parts = cleaned.split(' ');
  
  if (parts.length >= 2) {
    const potentialCode = parts[0];
    // Check if the first part is a valid country code
    const country = countries.find(c => c.code === potentialCode);
    if (country) {
      return {
        countryCode: potentialCode,
        number: parts.slice(1).join(' ')
      };
    }
  }
  
  // Default to Honduras if no valid country code found
  return { countryCode: '504', number: phoneNumber };
};
