// Input Validation Utilities
// Provides secure input validation and sanitization

export const ValidationRules = {
  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  
  // Password validation
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  },
  
  // Phone validation
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number'
  },
  
  // Name validation
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    message: 'Name must be 2-50 characters and contain only letters, spaces, hyphens, apostrophes, and periods'
  },
  
  // Event title validation
  eventTitle: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-'\.\,\!\?]+$/,
    message: 'Event title must be 3-100 characters and contain only letters, numbers, and basic punctuation'
  },
  
  // Description validation
  description: {
    maxLength: 1000,
    message: 'Description must be less than 1000 characters'
  },
  
  // Location validation
  location: {
    minLength: 3,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-'\.\,\#]+$/,
    message: 'Location must be 3-200 characters and contain only letters, numbers, and basic punctuation'
  }
};

export const sanitizeInput = (input, type = 'text') => {
  if (typeof input !== 'string') return '';
  
  // Basic XSS prevention
  let sanitized = input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
  
  // Type-specific sanitization
  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase();
      break;
    case 'name':
      sanitized = sanitized.replace(/[^a-zA-Z\s\-'\.]/g, '');
      break;
    case 'phone':
      sanitized = sanitized.replace(/[^\d\+\-\(\)\s]/g, '');
      break;
    case 'text':
    default:
      // Remove excessive whitespace
      sanitized = sanitized.replace(/\s+/g, ' ');
      break;
  }
  
  return sanitized;
};

export const validateInput = (input, rule) => {
  if (!input || typeof input !== 'string') {
    return { isValid: false, message: 'Input is required' };
  }
  
  const sanitized = sanitizeInput(input, rule.type || 'text');
  
  // Check minimum length
  if (rule.minLength && sanitized.length < rule.minLength) {
    return { 
      isValid: false, 
      message: `Must be at least ${rule.minLength} characters` 
    };
  }
  
  // Check maximum length
  if (rule.maxLength && sanitized.length > rule.maxLength) {
    return { 
      isValid: false, 
      message: `Must be less than ${rule.maxLength} characters` 
    };
  }
  
  // Check pattern
  if (rule.pattern && !rule.pattern.test(sanitized)) {
    return { 
      isValid: false, 
      message: rule.message || 'Invalid format' 
    };
  }
  
  return { isValid: true, sanitized };
};

export const validateForm = (formData, rules) => {
  const errors = {};
  const sanitizedData = {};
  
  for (const [field, value] of Object.entries(formData)) {
    const rule = rules[field];
    if (!rule) continue;
    
    const validation = validateInput(value, rule);
    if (!validation.isValid) {
      errors[field] = validation.message;
    } else {
      sanitizedData[field] = validation.sanitized;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};

// Common validation rules for forms
export const FormValidationRules = {
  login: {
    email: ValidationRules.email,
    password: { minLength: 6, message: 'Password must be at least 6 characters' }
  },
  
  signup: {
    name: ValidationRules.name,
    email: ValidationRules.email,
    password: ValidationRules.password,
    phone: ValidationRules.phone
  },
  
  event: {
    title: ValidationRules.eventTitle,
    description: ValidationRules.description,
    location: ValidationRules.location,
    maxParticipants: {
      pattern: /^\d+$/,
      message: 'Must be a valid number'
    },
    points: {
      pattern: /^\d+$/,
      message: 'Must be a valid number'
    }
  },
  
  profile: {
    name: ValidationRules.name,
    email: ValidationRules.email,
    phone: ValidationRules.phone,
    bio: {
      maxLength: 500,
      message: 'Bio must be less than 500 characters'
    }
  }
};
