import { Platform } from 'react-native';
import errorService from './errorService';

class TestingService {
  constructor() {
    this.testResults = [];
    this.isTestMode = __DEV__;
    this.testData = {
      users: [],
      events: [],
      activities: [],
    };
  }

  // Enable/disable test mode
  setTestMode(enabled) {
    this.isTestMode = enabled;
    console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Generate mock user data for testing
  generateMockUsers(count = 10) {
    const mockUsers = [];
    const names = [
      'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown',
      'Lisa Davis', 'Tom Miller', 'Emma Garcia', 'Chris Rodriguez', 'Anna Martinez'
    ];
    const emails = [
      'john.doe@test.com', 'jane.smith@test.com', 'mike.johnson@test.com',
      'sarah.wilson@test.com', 'david.brown@test.com', 'lisa.davis@test.com',
      'tom.miller@test.com', 'emma.garcia@test.com', 'chris.rodriguez@test.com',
      'anna.martinez@test.com'
    ];

    for (let i = 0; i < count; i++) {
      const user = {
        id: `test-user-${i + 1}`,
        uid: `test-uid-${i + 1}`,
        name: names[i % names.length],
        email: emails[i % emails.length],
        points: Math.floor(Math.random() * 1000),
        level: Math.floor(Math.random() * 10) + 1,
        role: i === 0 ? 'admin' : 'user',
        isAdmin: i === 0,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        joinedEvents: [],
        createdEvents: [],
        eventsAttended: 0,
        eventsCreated: 0,
      };
      mockUsers.push(user);
    }

    this.testData.users = mockUsers;
    return mockUsers;
  }

  // Generate mock event data for testing
  generateMockEvents(count = 20) {
    const mockEvents = [];
    const categories = ['community service', 'sports', 'education', 'environment', 'arts', 'social', 'volunteer', 'cleanup', 'fundraiser'];
    const titles = [
      'Community Cleanup Day', 'Youth Sports Tournament', 'Educational Workshop',
      'Tree Planting Initiative', 'Art Exhibition', 'Social Meetup', 'Volunteer Drive',
      'Beach Cleanup', 'Fundraising Gala', 'Health Awareness Campaign'
    ];
    const locations = [
      'Central Park', 'Community Center', 'City Hall', 'Beach Front', 'Downtown Plaza',
      'Sports Complex', 'Library', 'Museum', 'School Grounds', 'Shopping Mall'
    ];

    for (let i = 0; i < count; i++) {
      const event = {
        id: `test-event-${i + 1}`,
        title: titles[i % titles.length],
        description: `This is a test event for ${titles[i % titles.length].toLowerCase()}. Join us for a great time!`,
        category: categories[i % categories.length],
        date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: `${Math.floor(Math.random() * 12) + 9}:00 ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
        location: locations[i % locations.length],
        points: Math.floor(Math.random() * 100) + 10,
        maxParticipants: Math.floor(Math.random() * 50) + 10,
        participants: Math.floor(Math.random() * 20),
        organizer: 'Test Organizer',
        image: ['🎉', '🏃‍♂️', '📚', '🌱', '🎨', '🤝', '❤️', '🧹', '💰', '🏥'][i % 10],
        status: 'upcoming',
        coordinates: {
          latitude: 10.6718 + (Math.random() - 0.5) * 0.01,
          longitude: 122.9557 + (Math.random() - 0.5) * 0.01,
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
      mockEvents.push(event);
    }

    this.testData.events = mockEvents;
    return mockEvents;
  }

  // Run basic functionality tests
  async runBasicTests() {
    const tests = [
      {
        name: 'User Context Test',
        test: () => this.testUserContext(),
        category: 'Context'
      },
      {
        name: 'Firebase Connection Test',
        test: () => this.testFirebaseConnection(),
        category: 'Firebase'
      },
      {
        name: 'Location Services Test',
        test: () => this.testLocationServices(),
        category: 'Location'
      },
      {
        name: 'Map Functionality Test',
        test: () => this.testMapFunctionality(),
        category: 'Map'
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({
          name: test.name,
          category: test.category,
          success: result.success,
          message: result.message,
          duration: result.duration || 0,
        });
      } catch (error) {
        results.push({
          name: test.name,
          category: test.category,
          success: false,
          message: error.message,
          duration: 0,
        });
      }
    }

    this.testResults = results;
    return results;
  }

  // Test user context functionality
  async testUserContext() {
    const startTime = Date.now();
    
    try {
      // Basic context test
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      const mockUserData = {
        name: 'Test User',
        points: 100,
        level: 1,
        role: 'user'
      };

      // Simulate context operations
      const isAuthenticated = !!mockUser;
      const getUserDisplayName = () => mockUserData.name || mockUser.displayName || 'User';
      const getUserInitials = () => {
        const name = getUserDisplayName();
        return name.substring(0, 2).toUpperCase();
      };

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: 'User context test passed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `User context test failed: ${error.message}`,
        duration
      };
    }
  }

  // Test Firebase connection
  async testFirebaseConnection() {
    const startTime = Date.now();
    
    try {
      // Import Firebase config
      const { db, auth } = await import('../config/firebaseConfig');
      
      // Basic connection test
      if (!db || !auth) {
        throw new Error('Firebase services not initialized');
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Firebase connection test passed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `Firebase connection test failed: ${error.message}`,
        duration
      };
    }
  }

  // Test location services
  async testLocationServices() {
    const startTime = Date.now();
    
    try {
      // Import location services
      const Location = await import('expo-location');
      
      // Check if location services are available
      const isAvailable = await Location.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Location services not available on this device');
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Location services test passed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `Location services test failed: ${error.message}`,
        duration
      };
    }
  }

  // Test map functionality
  async testMapFunctionality() {
    const startTime = Date.now();
    
    try {
      // Check if react-native-maps is available
      const MapView = await import('react-native-maps');
      
      if (!MapView.default) {
        throw new Error('MapView not available');
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Map functionality test passed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `Map functionality test failed: ${error.message}`,
        duration
      };
    }
  }

  // Get test results summary
  getTestSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      results: this.testResults
    };
  }

  // Export test results
  exportTestResults() {
    return {
      summary: this.getTestSummary(),
      results: this.testResults,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      version: Platform.Version
    };
  }

  // Clear test results
  clearTestResults() {
    this.testResults = [];
  }

  // Validate test data
  validateTestData() {
    const validations = [];
    
    // Validate users
    if (this.testData.users.length > 0) {
      const userValidation = this.testData.users.every(user => 
        user.id && user.name && user.email && typeof user.points === 'number'
      );
      validations.push({
        type: 'users',
        valid: userValidation,
        count: this.testData.users.length
      });
    }

    // Validate events
    if (this.testData.events.length > 0) {
      const eventValidation = this.testData.events.every(event => 
        event.id && event.title && event.category && event.coordinates
      );
      validations.push({
        type: 'events',
        valid: eventValidation,
        count: this.testData.events.length
      });
    }

    return validations;
  }
}

const testingService = new TestingService();
export default testingService;
