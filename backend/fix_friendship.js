const sqlite = require('./database/sqlite');

async function fixFriendshipInconsistency() {
  try {
    console.log('=== FRIENDSHIP DATA FIX ===');
    
    const userId1 = 'user_1767609832343_2jxc7mqvn';
    const userId2 = 'user_1767603684178_g8fg968ia';
    
    console.log('Checking for accepted requests without friendship records...');
    
    // Find accepted requests without corresponding friends records
    const orphanedRequests = await sqlite.all(`
      SELECT fr.* 
      FROM friend_requests fr
      LEFT JOIN friends f1 ON (
        (f1.userId1 = fr.fromUserId AND f1.userId2 = fr.toUserId) OR
        (f1.userId1 = fr.toUserId AND f1.userId2 = fr.fromUserId)
      )
      WHERE fr.status = 'accepted' 
        AND f1.id IS NULL
        AND ((fr.fromUserId = ? AND fr.toUserId = ?) OR (fr.fromUserId = ? AND fr.toUserId = ?))
    `, [userId1, userId2, userId2, userId1]);
    
    console.log('Orphaned accepted requests:', orphanedRequests.length);
    
    if (orphanedRequests.length > 0) {
      console.log('Found orphaned requests:', JSON.stringify(orphanedRequests, null, 2));
      
      // Option 1: Delete orphaned accepted requests to reset state
      console.log('\nDeleting orphaned accepted requests...');
      for (const request of orphanedRequests) {
        await sqlite.run('DELETE FROM friend_requests WHERE id = ?', [request.id]);
        console.log(`✅ Deleted request ${request.id}`);
      }
      
      console.log('✅ Cleanup completed! Users can now send friend requests again.');
    } else {
      console.log('No orphaned requests found.');
    }
    
    // Verify cleanup
    console.log('\n=== VERIFICATION ===');
    const remainingRequests = await sqlite.all(`
      SELECT * FROM friend_requests 
      WHERE (fromUserId = ? AND toUserId = ?) 
         OR (fromUserId = ? AND toUserId = ?)
    `, [userId1, userId2, userId2, userId1]);
    
    console.log('Remaining requests:', remainingRequests.length);
    if (remainingRequests.length > 0) {
      console.log(JSON.stringify(remainingRequests, null, 2));
    }
    
  } catch (error) {
    console.error('Error during fix:', error);
  }
}

fixFriendshipInconsistency();