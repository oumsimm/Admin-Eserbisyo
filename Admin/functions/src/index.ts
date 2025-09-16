import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Cloud Function triggered when a notification is created
 * Sends push notifications to targeted users
 */
export const sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    console.log(`Processing notification: ${notificationId}`);

    // Only process if status is 'sent' (not scheduled)
    if (notification.status !== 'sent') {
      console.log(`Notification ${notificationId} is not ready to send (status: ${notification.status})`);
      return null;
    }

    try {
      // Get push targets (FCM and Expo)
      const targets = await getUserPushTargets(notification.targetUsers || []);

      if (targets.fcmTokens.length === 0 && targets.expoTokens.length === 0) {
        console.log(`No valid push tokens found for notification ${notificationId}`);
        await snap.ref.update({
          sentTo: [],
          deliveredTo: 0,
          failedDeliveries: notification.targetUsers?.length || 0,
          error: 'No valid push tokens found'
        });
        return null;
      }

      // Prepare the FCM message
      const message = {
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: {
          notificationId: notificationId,
          type: notification.type || 'general',
          priority: notification.priority || 'normal'
        },
        tokens: targets.fcmTokens
      };

      // Send via FCM
      let delivered = 0;
      let failed = 0;
      if (targets.fcmTokens.length > 0) {
        const response = await messaging.sendMulticast(message);
        delivered += response.successCount;
        failed += response.failureCount;
        console.log(`FCM sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
        if (response.failureCount > 0) {
          await handleFailedTokens(response.responses, targets.fcmTokens, notification.targetUsers);
        }
      }

      // Send via Expo Push if available
      if (targets.expoTokens.length > 0) {
        const expoResult = await sendExpoPushNotifications(targets.expoTokens, {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId,
            type: notification.type || 'general',
            priority: notification.priority || 'normal',
          }
        });
        delivered += expoResult.successCount;
        failed += expoResult.failureCount;
        console.log(`Expo sent. Success: ${expoResult.successCount}, Failed: ${expoResult.failureCount}`);
      }

      // Update the notification document with delivery status
      await snap.ref.update({
        sentTo: notification.targetUsers,
        deliveredTo: delivered,
        failedDeliveries: failed,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, delivered, failed };

    } catch (error) {
      const err = error as Error;
      console.error(`Error sending notification ${notificationId}:`, err);
      
      await snap.ref.update({
        error: err.message,
        sentTo: [],
        deliveredTo: 0,
        failedDeliveries: notification.targetUsers?.length || 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: false, error: err.message };
    }
  });

/**
 * Cloud Function triggered when a notification status changes to 'sent'
 * This supports scheduled notifications that are updated by the scheduler
 */
export const sendNotificationOnStatus = functions.firestore
  .document('notifications/{notificationId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const before = change.before.data();
    const after = change.after.data();
    const notificationId = context.params.notificationId;

    if (!before || !after) {
      return null;
    }

    // Only act when the status transitions to 'sent'
    if (before.status === 'sent' || after.status !== 'sent') {
      return null;
    }

    try {
      const targets = await getUserPushTargets(after.targetUsers || []);

      if (targets.fcmTokens.length === 0 && targets.expoTokens.length === 0) {
        console.log(`No valid push tokens found for notification ${notificationId}`);
        await change.after.ref.update({
          sentTo: [],
          deliveredTo: 0,
          failedDeliveries: after.targetUsers?.length || 0,
          error: 'No valid push tokens found',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      const message = {
        notification: {
          title: after.title,
          body: after.message,
        },
        data: {
          notificationId: notificationId,
          type: after.type || 'general',
          priority: after.priority || 'normal'
        },
        tokens: targets.fcmTokens
      };
      let delivered = 0;
      let failed = 0;
      if (targets.fcmTokens.length > 0) {
        const response = await messaging.sendMulticast(message);
        delivered += response.successCount;
        failed += response.failureCount;
        console.log(`FCM sent (status change). Success: ${response.successCount}, Failed: ${response.failureCount}`);
        if (response.failureCount > 0) {
          await handleFailedTokens(response.responses, targets.fcmTokens, after.targetUsers || []);
        }
      }
      if (targets.expoTokens.length > 0) {
        const expoResult = await sendExpoPushNotifications(targets.expoTokens, {
          title: after.title,
          body: after.message,
          data: {
            notificationId,
            type: after.type || 'general',
            priority: after.priority || 'normal',
          }
        });
        delivered += expoResult.successCount;
        failed += expoResult.failureCount;
        console.log(`Expo sent (status change). Success: ${expoResult.successCount}, Failed: ${expoResult.failureCount}`);
      }

      await change.after.ref.update({
        sentTo: after.targetUsers,
        deliveredTo: delivered,
        failedDeliveries: failed,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, delivered, failed };
    } catch (error) {
      const err = error as Error;
      console.error(`Error sending notification on status change ${notificationId}:`, err);
      await change.after.ref.update({
        error: err.message,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: false, error: err.message };
    }
  });

/**
 * Scheduled function to process scheduled notifications
 * Runs every 5 minutes to check for notifications ready to send
 */
export const processScheduledNotifications = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context: functions.EventContext) => {
    console.log('Processing scheduled notifications...');
    
    const now = admin.firestore.Timestamp.now();
    
    try {
      // Find notifications scheduled for now or earlier
      const scheduledQuery = await db
        .collection('notifications')
        .where('status', '==', 'scheduled')
        .where('scheduledFor', '<=', now.toDate())
        .get();

      if (scheduledQuery.empty) {
        console.log('No scheduled notifications to process');
        return null;
      }

      const batch = db.batch();
      let processedCount = 0;

      scheduledQuery.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        // Update status to 'sent' to trigger the sendNotification function
        batch.update(doc.ref, { 
          status: 'sent',
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        processedCount++;
      });

      await batch.commit();
      console.log(`Processed ${processedCount} scheduled notifications`);

      return { processed: processedCount };

    } catch (error) {
      const err = error as Error;
      console.error('Error processing scheduled notifications:', err);
      return { error: err.message };
    }
  });

/**
 * Function to update notification read status when user reads it
 */
export const markNotificationAsRead = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { notificationId } = data;
  const userId = context.auth.uid;

  if (!notificationId) {
    throw new functions.https.HttpsError('invalid-argument', 'notificationId is required');
  }

  try {
    const notificationRef = db.collection('notifications').doc(notificationId);
    
    await notificationRef.update({
      readBy: admin.firestore.FieldValue.arrayUnion(userId),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Notification ${notificationId} marked as read by user ${userId}`);
    return { success: true };

  } catch (error) {
    const err = error as Error;
    console.error('Error marking notification as read:', err);
    throw new functions.https.HttpsError('internal', 'Failed to mark notification as read');
  }
});

/**
 * Helper function to get FCM tokens for a list of user IDs
 */
async function getUserTokens(userIds: string[]): Promise<string[]> {
  const tokens: string[] = [];
  
  for (const userId of userIds) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      }
    } catch (error) {
      console.error(`Error getting token for user ${userId}:`, error);
    }
  }
  
  return tokens;
}

/**
 * Get push targets: FCM and Expo tokens
 */
async function getUserPushTargets(userIds: string[]): Promise<{ fcmTokens: string[]; expoTokens: string[] }> {
  const fcmTokens: string[] = [];
  const expoTokens: string[] = [];
  for (const userId of userIds) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        if (data?.fcmToken) fcmTokens.push(data.fcmToken);
        if (data?.expoPushToken) expoTokens.push(data.expoPushToken);
      }
    } catch (e) {
      console.warn('Error reading user for push tokens:', userId, e);
    }
  }
  return { fcmTokens, expoTokens };
}

/**
 * Send Expo push notifications via Expo Push API
 */
async function sendExpoPushNotifications(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }) {
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  }));
  let successCount = 0;
  let failureCount = 0;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error('Expo push API failed with status', res.status);
      failureCount = tokens.length;
    } else {
      successCount = tokens.length;
    }
  } catch (e) {
    console.error('Expo push API error:', e);
    failureCount = tokens.length;
  }
  return { successCount, failureCount };
}

/**
 * Helper function to handle failed FCM tokens
 */
async function handleFailedTokens(
  responses: admin.messaging.SendResponse[],
  tokens: string[],
  userIds: string[]
) {
  const batch = db.batch();
  let hasWrites = false;
  
  responses.forEach((response, index) => {
    if (!response.success && response.error) {
      const errorCode = response.error.code;
      
      // Remove invalid tokens
      if (errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token') {
        
        const userId = userIds[index];
        if (userId) {
          const userRef = db.collection('users').doc(userId);
          batch.update(userRef, {
            fcmToken: admin.firestore.FieldValue.delete(),
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
          });
          hasWrites = true;
          
          console.log(`Removed invalid FCM token for user ${userId}`);
        }
      }
    }
  });
  
  if (hasWrites) {
    await batch.commit();
  }
}

/**
 * Function to send immediate notification (for testing)
 */
export const sendTestNotification = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Verify user is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'User must be admin');
  }

  const { title, message, targetUserId } = data;

  try {
    const userTokens = await getUserTokens([targetUserId]);
    
    if (userTokens.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No valid FCM token found for user');
    }

    const notificationMessage = {
      notification: {
        title: title || 'Test Notification',
        body: message || 'This is a test notification from E-SERBISYO admin',
      },
      data: {
        type: 'test',
        priority: 'normal'
      },
      tokens: userTokens
    };

    const response = await messaging.sendMulticast(notificationMessage);
    
    return {
      success: true,
      delivered: response.successCount,
      failed: response.failureCount
    };

  } catch (error) {
    const err = error as Error;
    console.error('Error sending test notification:', err);
    throw new functions.https.HttpsError('internal', 'Failed to send test notification');
  }
});

/**
 * Helper: create per-user notification docs for a list of users
 */
async function fanOutUserNotifications(params: {
  targetUserIds: string[];
  payload: { title: string; description: string; type: 'event' | 'program'; relatedId: string; isAdminCreated?: boolean };
}) {
  const { targetUserIds, payload } = params;
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  targetUserIds.forEach((uid) => {
    const ref = db.collection('users').doc(uid).collection('notifications').doc();
    batch.set(ref, {
      title: payload.title,
      description: payload.description,
      type: payload.type,
      relatedId: payload.relatedId,
      isAdminCreated: payload.isAdminCreated ?? true,
      read: false,
      time: now,
    });
  });
  await batch.commit();
}

/**
 * Trigger: when an admin creates a new event, create notifications for all users
 * Assumes a 'users' collection with user documents; targets all non-admin users.
 */
export const onEventCreated = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snap, context) => {
    const eventData = snap.data() as any;
    const eventId = context.params.eventId as string;
    try {
      // Collect target users (all users for now). You can filter by community if needed.
      const usersSnap = await db.collection('users').get();
      const targetUserIds: string[] = [];
      usersSnap.forEach((doc) => {
        const data = doc.data() as any;
        // Skip admins
        if (data?.isAdmin || data?.role === 'admin') return;
        targetUserIds.push(doc.id);
      });

      if (targetUserIds.length === 0) return null;

      await fanOutUserNotifications({
        targetUserIds,
        payload: {
          title: eventData?.title || 'New Event',
          description: eventData?.description || 'A new event has been posted.',
          type: 'event',
          relatedId: eventId,
          isAdminCreated: true,
        },
      });

      return { success: true, notified: targetUserIds.length };
    } catch (e) {
      console.error('onEventCreated error:', e);
      return { success: false };
    }
  });

/**
 * Trigger: when an admin creates a new program, create notifications for all users
 */
export const onProgramCreated = functions.firestore
  .document('programs/{programId}')
  .onCreate(async (snap, context) => {
    const programData = snap.data() as any;
    const programId = context.params.programId as string;
    try {
      const usersSnap = await db.collection('users').get();
      const targetUserIds: string[] = [];
      usersSnap.forEach((doc) => {
        const data = doc.data() as any;
        if (data?.isAdmin || data?.role === 'admin') return;
        targetUserIds.push(doc.id);
      });

      if (targetUserIds.length === 0) return null;

      await fanOutUserNotifications({
        targetUserIds,
        payload: {
          title: programData?.title || 'New Program',
          description: programData?.description || 'A new program has been posted.',
          type: 'program',
          relatedId: programId,
          isAdminCreated: true,
        },
      });

      return { success: true, notified: targetUserIds.length };
    } catch (e) {
      console.error('onProgramCreated error:', e);
      return { success: false };
    }
  });

/**
 * Scheduled monthly reset of users' monthly_points
 * Runs at 00:00 on the 1st of every month (resets previous month)
 * Also records last_monthly_reset in system/leaderboard
 */
export const scheduleMonthlyPointsReset = functions.pubsub
  .schedule('0 0 1 * *')
  .timeZone('UTC')
  .onRun(async () => {
    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      await db.collection('system').doc('leaderboard').set({
        last_monthly_reset: admin.firestore.FieldValue.serverTimestamp(),
        last_monthly_reset_count: 0,
        last_monthly_reset_trigger: 'scheduled',
      }, { merge: true });
      return { success: true, reset: 0 };
    }

    let batch = db.batch();
    let writesInBatch = 0;
    let processed = 0;
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const docSnap of usersSnap.docs) {
      const userRef = docSnap.ref;
      const data = docSnap.data() as any;
      const beforeMonthly = Number(data?.monthly_points || 0) || 0;

      batch.update(userRef, { monthly_points: 0, updatedAt: now });
      writesInBatch++;

      // Log into user points history
      const historyRef = userRef.collection('points_history').doc();
      batch.set(historyRef, {
        delta: -beforeMonthly,
        activity: 'monthly_reset',
        reason: 'Automatic monthly reset',
        before: { monthly_points: beforeMonthly },
        after: { monthly_points: 0 },
        createdAt: now,
        source: 'scheduled_monthly_reset',
      });
      writesInBatch++;

      processed++;
      if (writesInBatch >= 450) { // keep margin under 500
        await batch.commit();
        batch = db.batch();
        writesInBatch = 0;
      }
    }

    if (writesInBatch > 0) {
      await batch.commit();
    }

    await db.collection('system').doc('leaderboard').set({
      last_monthly_reset: now,
      last_monthly_reset_count: processed,
      last_monthly_reset_trigger: 'scheduled',
    }, { merge: true });

    return { success: true, reset: processed };
  });

/**
 * Callable: Manually reset monthly points (admin only)
 */
export const resetMonthlyPoints = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const callerId = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerId).get();
  if (!callerDoc.exists || (!(callerDoc.data() as any)?.isAdmin && (callerDoc.data() as any)?.role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const usersSnap = await db.collection('users').get();
  let batch = db.batch();
  let writesInBatch = 0;
  let processed = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const docSnap of usersSnap.docs) {
    const userRef = docSnap.ref;
    const data = docSnap.data() as any;
    const beforeMonthly = Number(data?.monthly_points || 0) || 0;

    batch.update(userRef, { monthly_points: 0, updatedAt: now });
    writesInBatch++;

    const historyRef = userRef.collection('points_history').doc();
    batch.set(historyRef, {
      delta: -beforeMonthly,
      activity: 'monthly_reset',
      reason: 'Manual monthly reset',
      before: { monthly_points: beforeMonthly },
      after: { monthly_points: 0 },
      createdAt: now,
      source: 'manual_monthly_reset',
      adminId: callerId,
    });
    writesInBatch++;

    processed++;
    if (writesInBatch >= 450) {
      await batch.commit();
      batch = db.batch();
      writesInBatch = 0;
    }
  }

  if (writesInBatch > 0) {
    await batch.commit();
  }

  await db.collection('system').doc('leaderboard').set({
    last_monthly_reset: now,
    last_monthly_reset_count: processed,
    last_monthly_reset_trigger: 'manual',
    last_monthly_reset_admin: callerId,
  }, { merge: true });

  return { success: true, reset: processed };
});

/**
 * Callable: Admin edit user points (adjust both monthly_points and total_points)
 */
export const editUserPoints = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const adminId = context.auth.uid;
  const adminDoc = await db.collection('users').doc(adminId).get();
  if (!adminDoc.exists || (!(adminDoc.data() as any)?.isAdmin && (adminDoc.data() as any)?.role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const { targetUserId, delta, reason } = data || {};
  const numericDelta = Number(delta);
  if (!targetUserId || !Number.isFinite(numericDelta)) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId and numeric delta are required');
  }

  const userRef = db.collection('users').doc(targetUserId);
  await db.runTransaction(async (trx) => {
    const userSnap = await trx.get(userRef);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    const data = userSnap.data() as any;
    const beforeTotal = Number(data?.total_points ?? data?.points ?? 0) || 0;
    const beforeMonthly = Number(data?.monthly_points ?? 0) || 0;
    const newTotal = Math.max(0, beforeTotal + numericDelta);
    const newMonthly = Math.max(0, beforeMonthly + numericDelta);
    const newLegacyPoints = newTotal; // keep legacy in sync

    trx.update(userRef, {
      total_points: newTotal,
      monthly_points: newMonthly,
      points: newLegacyPoints,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const historyRef = userRef.collection('points_history').doc();
    trx.set(historyRef, {
      delta: numericDelta,
      activity: 'admin_edit',
      reason: reason || 'Admin points adjustment',
      before: { total_points: beforeTotal, monthly_points: beforeMonthly },
      after: { total_points: newTotal, monthly_points: newMonthly },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'admin_edit_points',
      adminId,
    });
  });

  return { success: true };
});

/**
 * Callable: Send congratulatory notification to current Top N monthly users (default 5)
 */
export const congratulateTopMonthlyUsers = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const adminId = context.auth.uid;
  const adminDoc = await db.collection('users').doc(adminId).get();
  if (!adminDoc.exists || (!(adminDoc.data() as any)?.isAdmin && (adminDoc.data() as any)?.role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const limit = Math.min(Math.max(Number(data?.limit ?? 5), 1), 20);

  const topSnap = await db
    .collection('users')
    .orderBy('monthly_points', 'desc')
    .limit(limit)
    .get();

  const topUserIds: string[] = topSnap.docs.map((d) => d.id);
  if (topUserIds.length === 0) {
    return { success: true, delivered: 0 };
  }

  // Create a single admin-triggered notification document to fan out via existing triggers
  const notifRef = await db.collection('notifications').add({
    title: 'Congratulations to our Top Contributors! 🎉',
    message: 'Kudos to this month\'s top community contributors. Keep it up! 🏆',
    type: 'achievement',
    priority: 'high',
    status: 'sent', // trigger sendNotification
    targetUsers: topUserIds,
    createdBy: adminId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, notificationId: notifRef.id, targeted: topUserIds.length };
});