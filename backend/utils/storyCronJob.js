const storage = require('../storage/dbStorage');

// Clean up expired stories every hour
const cleanupExpiredStories = async () => {
  try {
    console.log('🧹 Running story cleanup cron job...');
    
    const deletedCount = await storage.stories.deleteExpiredStories();
    
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} expired stories`);
    } else {
      console.log('✅ No expired stories to clean up');
    }
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Error in story cleanup cron job:', error);
    return 0;
  }
};

// Run cleanup every hour (3600000 ms)
const startStoryCleanupJob = () => {
  console.log('⏰ Starting story cleanup cron job (every hour)');
  
  // Run immediately on startup
  cleanupExpiredStories();
  
  // Set interval for every hour
  setInterval(cleanupExpiredStories, 3600000);
};

module.exports = {
  cleanupExpiredStories,
  startStoryCleanupJob
};