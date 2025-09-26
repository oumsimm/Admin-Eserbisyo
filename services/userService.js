/ services/userService.js (Enhanced)
import qrService from './qrService';

class UserService {
  // ... existing methods ...

  /**
   * Create new user with automatic QR generation
   */
  async createUser(userData) {
    try {
      // Create user in your database/Firebase
      const user = await this.createUserInDatabase(userData);
      
      // Generate QR code for new user
      const qrResult = await qrService.generateUserQR(user);
      
      if (!qrResult.success) {
        console.warn('Failed to generate initial QR code:', qrResult.error);
      }

      return {
        success: true,
        user,
        qrGenerated: qrResult.success
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user profile with automatic QR regeneration
   */
  async updateUserProfile(userId, updates) {
    try {
      // Check if profile-relevant fields changed
      const qrRelevantFields = ['name', 'firstName', 'lastName', 'address', 'age', 'mobile', 'phone'];
      const hasQRRelevantChanges = Object.keys(updates).some(key => qrRelevantFields.includes(key));

      // Update user in database
      const result = await this.updateUserInDatabase(userId, updates);
      
      if (result.success && hasQRRelevantChanges) {
        // Invalidate old QR codes
        await qrService.invalidateOldQRCodes(userId);
        
        // Generate new QR with updated info
        const updatedUser = await this.getUserById(userId);
        const qrResult = await qrService.generateUserQR(updatedUser);
        
        if (!qrResult.success) {
          console.warn('Failed to regenerate QR after profile update:', qrResult.error);
        }

        return {
          ...result,
          qrRegenerated: qrResult.success
        };
      }

      return result;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Placeholder methods - replace with your actual implementations
  async createUserInDatabase(userData) {
    // Your user creation logic here
    return userData;
  }

  async updateUserInDatabase(userId, updates) {
    // Your user update logic here
    return { success: true };
  }

  async getUserById(userId) {
    // Your user retrieval logic here
    return { id: userId };
  }
}

export default new UserService();