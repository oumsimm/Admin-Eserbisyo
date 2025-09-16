"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestNotification = exports.markNotificationAsRead = exports.processScheduledNotifications = exports.sendNotificationOnStatus = exports.sendNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
/**
 * Cloud Function triggered when a notification is created
 * Sends push notifications to targeted users
 */
exports.sendNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
    var _a, _b;
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
                failedDeliveries: ((_a = notification.targetUsers) === null || _a === void 0 ? void 0 : _a.length) || 0,
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
    }
    catch (error) {
        const err = error;
        console.error(`Error sending notification ${notificationId}:`, err);
        await snap.ref.update({
            error: err.message,
            sentTo: [],
            deliveredTo: 0,
            failedDeliveries: ((_b = notification.targetUsers) === null || _b === void 0 ? void 0 : _b.length) || 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: false, error: err.message };
    }
});
/**
 * Cloud Function triggered when a notification status changes to 'sent'
 * This supports scheduled notifications that are updated by the scheduler
 */
exports.sendNotificationOnStatus = functions.firestore
    .document('notifications/{notificationId}')
    .onUpdate(async (change, context) => {
    var _a;
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
                failedDeliveries: ((_a = after.targetUsers) === null || _a === void 0 ? void 0 : _a.length) || 0,
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
    }
    catch (error) {
        const err = error;
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
exports.processScheduledNotifications = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
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
        scheduledQuery.forEach((doc) => {
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
    }
    catch (error) {
        const err = error;
        console.error('Error processing scheduled notifications:', err);
        return { error: err.message };
    }
});
/**
 * Function to update notification read status when user reads it
 */
exports.markNotificationAsRead = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        const err = error;
        console.error('Error marking notification as read:', err);
        throw new functions.https.HttpsError('internal', 'Failed to mark notification as read');
    }
});
/**
 * Helper function to get FCM tokens for a list of user IDs
 */
async function getUserTokens(userIds) {
    const tokens = [];
    for (const userId of userIds) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                    tokens.push(userData.fcmToken);
                }
            }
        }
        catch (error) {
            console.error(`Error getting token for user ${userId}:`, error);
        }
    }
    return tokens;
}
/**
 * Get push targets: FCM and Expo tokens
 */
async function getUserPushTargets(userIds) {
    const fcmTokens = [];
    const expoTokens = [];
    for (const userId of userIds) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data === null || data === void 0 ? void 0 : data.fcmToken)
                    fcmTokens.push(data.fcmToken);
                if (data === null || data === void 0 ? void 0 : data.expoPushToken)
                    expoTokens.push(data.expoPushToken);
            }
        }
        catch (e) {
            console.warn('Error reading user for push tokens:', userId, e);
        }
    }
    return { fcmTokens, expoTokens };
}
/**
 * Send Expo push notifications via Expo Push API
 */
async function sendExpoPushNotifications(tokens, payload) {
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
        }
        else {
            successCount = tokens.length;
        }
    }
    catch (e) {
        console.error('Expo push API error:', e);
        failureCount = tokens.length;
    }
    return { successCount, failureCount };
}
/**
 * Helper function to handle failed FCM tokens
 */
async function handleFailedTokens(responses, tokens, userIds) {
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
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
    var _a;
    // Verify user is admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
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
    }
    catch (error) {
        const err = error;
        console.error('Error sending test notification:', err);
        throw new functions.https.HttpsError('internal', 'Failed to send test notification');
    }
});
//# sourceMappingURL=index.js.map