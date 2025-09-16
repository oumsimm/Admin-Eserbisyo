import AsyncStorage from '@react-native-async-storage/async-storage';

class OnboardingService {
  constructor() {
    this.ONBOARDING_KEY = '@e_serbisyo_onboarding_completed';
  }

  // Check if user has completed onboarding
  async hasCompletedOnboarding() {
    try {
      const value = await AsyncStorage.getItem(this.ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false; // Default to showing onboarding if error
    }
  }

  // Mark onboarding as completed
  async setOnboardingCompleted() {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_KEY, 'true');
      console.log('Onboarding marked as completed');
      return { success: true };
    } catch (error) {
      console.error('Error setting onboarding status:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset onboarding status (for testing or re-onboarding)
  async resetOnboarding() {
    try {
      await AsyncStorage.removeItem(this.ONBOARDING_KEY);
      console.log('Onboarding status reset');
      return { success: true };
    } catch (error) {
      console.error('Error resetting onboarding status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get onboarding status for debugging
  async getOnboardingStatus() {
    try {
      const value = await AsyncStorage.getItem(this.ONBOARDING_KEY);
      return {
        success: true,
        completed: value === 'true',
        rawValue: value
      };
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      return {
        success: false,
        completed: false,
        error: error.message
      };
    }
  }
}

const onboardingService = new OnboardingService();
export default onboardingService;
