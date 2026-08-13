// reCAPTCHA Configuration - Environment-aware key selection
// Uses test keys for localhost and production keys for deployed domains

export const getRecaptchaSiteKey = () => {
  // Check if running on localhost (development)
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Google's official reCAPTCHA v2 test keys - ALWAYS PASS verification
    // These work on localhost only and bypass actual Google verification
    console.log('🔧 [reCAPTCHA] Using TEST mode for localhost development');
    return '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
  }
  
  // Production site key for deployed domains
  console.log('🔐 [reCAPTCHA] Using PRODUCTION mode');
  return '6LdJdWUsAAAAAGBtrqEaZ5aOLvZQiF6xZ6M3kaZ9';
};
