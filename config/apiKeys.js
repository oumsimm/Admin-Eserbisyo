const API_KEYS = {
  GOOGLE_AI_API_KEY: 'AIzaSyA_ZgsmB8-23SHiNH3Lx8r6TZH9qD6a6Fc',
  validateKeys: function () {
    return !!this.GOOGLE_AI_API_KEY && this.GOOGLE_AI_API_KEY.startsWith('AIza');
  }
};

export default API_KEYS;
