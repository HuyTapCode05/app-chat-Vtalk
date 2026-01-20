const sqlite = require('./database/sqlite');

async function checkFriendshipData() {
  try {
    const userId1 = 'user_1767609832343_2jxc7mqvn';
    const userId2 = 'user_1767603684178_g8fg968ia';
    
    console.log('=== FRIENDSHIP DATA CHECK ===');
    console.log('User 1:', userId1);
    console.log('User 2:', userId2);
    console.log();
    
    // Check friend requests
    console.log('1. FRIEND REQUESTS:');
    const requests = await sqlite.all(`
      SELECT * FROM friend_requests 
      WHERE (fromUserId = ? AND toUserId = ?) 
         OR (fromUserId = ? AND toUserId = ?)
    `, [userId1, userId2, userId2, userId1]);
    console.log('Friend requests:', JSON.stringify(requests, null, 2));
    console.log();
    
    // Check friends table
    console.log('2. FRIENDS TABLE:');
    const friends = await sqlite.all(`
      SELECT * FROM friends 
      WHERE (userId1 = ? AND userId2 = ?) 
         OR (userId1 = ? AND userId2 = ?)
    `, [userId1, userId2, userId2, userId1]);
    console.log('Friends records:', JSON.stringify(friends, null, 2));
    console.log();
    
    // Analysis
    console.log('3. ANALYSIS:');
    const hasAcceptedRequest = requests.some(r => r.status === 'accepted');
    const hasFriendsRecord = friends.length > 0;
    
    console.log('Has accepted request:', hasAcceptedRequest);
    console.log('Has friends record:', hasFriendsRecord);
    console.log('Inconsistency detected:', hasAcceptedRequest && !hasFriendsRecord);
    
    if (hasAcceptedRequest && !hasFriendsRecord) {
      console.log('🔴 PROBLEM: Accepted friend request exists but no friendship record!');
      console.log('This causes "Đã là bạn bè" error despite not being actual friends.');
      
      // Suggest fix
      console.log('\n4. SUGGESTED FIX:');
      console.log('Option 1: Delete the accepted request to allow new request');
      console.log('Option 2: Create the missing friendship record');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFriendshipData();