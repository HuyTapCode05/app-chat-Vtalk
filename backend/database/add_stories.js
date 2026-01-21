const sqlite = require('./sqlite');

// Add stories tables to database
async function addStoriesTables() {
  try {
    console.log('🗃️ Adding stories tables to database...');

    // Stories table
    await sqlite.run(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL, -- 'image', 'video', 'text'
        content TEXT, -- for text stories or caption
        mediaUrl TEXT, -- for image/video stories
        backgroundColor TEXT, -- for text stories
        textColor TEXT, -- for text stories
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Story views table
    await sqlite.run(`
      CREATE TABLE IF NOT EXISTS story_views (
        id TEXT PRIMARY KEY,
        storyId TEXT NOT NULL,
        viewerId TEXT NOT NULL,
        viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE,
        FOREIGN KEY (viewerId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(storyId, viewerId)
      )
    `);

    // Add index for efficient queries
    await sqlite.run(`
      CREATE INDEX IF NOT EXISTS idx_stories_userId_expiresAt 
      ON stories(userId, expiresAt)
    `);

    await sqlite.run(`
      CREATE INDEX IF NOT EXISTS idx_story_views_storyId 
      ON story_views(storyId)
    `);

    console.log('✅ Stories tables created successfully');

    // Test queries
    const storiesCount = await sqlite.get('SELECT COUNT(*) as count FROM stories');
    const viewsCount = await sqlite.get('SELECT COUNT(*) as count FROM story_views');
    
    console.log(`📊 Current stories: ${storiesCount.count}`);
    console.log(`📊 Current story views: ${viewsCount.count}`);

  } catch (error) {
    console.error('❌ Error adding stories tables:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  addStoriesTables()
    .then(() => {
      console.log('🎉 Stories migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addStoriesTables };