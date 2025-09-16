import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Simple keyword-based severity classifier (fallback when user does not choose)
function classifySeverity(text = '') {
  const t = (text || '').toLowerCase();
  const criticalTerms = ['violence', 'threat', 'danger', 'emergency', 'injury', 'hack', 'breach', 'fire', 'accident'];
  const highTerms = ['harassment', 'bully', 'urgent', 'fraud', 'scam', 'offensive', 'security', 'safety'];
  const mediumTerms = ['issue', 'problem', 'bug', 'broken', 'error', 'delay', 'concern'];
  if (criticalTerms.some((k) => t.includes(k))) return 'critical';
  if (highTerms.some((k) => t.includes(k))) return 'high';
  if (mediumTerms.some((k) => t.includes(k))) return 'medium';
  return 'low';
}

// Basic client-side validation for report form data
function validateReportData({ title = '', description = '', category = '' } = {}) {
  const errors = [];
  if (!String(title || '').trim()) errors.push('Title is required');
  if (!String(description || '').trim()) errors.push('Description is required');
  if (!String(category || '').trim()) errors.push('Category is required');
  return { isValid: errors.length === 0, errors };
}

// Determine urgency from provided content/categories (wrapper around classifySeverity)
function determineUrgency(title = '', description = '', category = '') {
  const combined = `${title}\n${description}\n${category}`;
  return classifySeverity(combined);
}

// Basic ethics validation to discourage PII/defamation
function validateEthics({ title = '', description = '' }) {
  const combined = `${title} ${description}`.toLowerCase();
  const blocked = ['ssn', 'social security', 'credit card', 'bank account'];
  const hasBlocked = blocked.some((k) => combined.includes(k));
  if (hasBlocked) {
    return { valid: false, reason: 'Please remove sensitive personal information before submitting.' };
  }
  return { valid: true };
}

async function createReport({ userId, reporterId, title, description, category = 'incident', severity, urgency, location, metadata = {}, reportedItemId = null, targetType = null }) {
  const ethics = validateEthics({ title, description });
  if (!ethics.valid) {
    return { success: false, error: ethics.reason };
  }

  // Title is optional. Use first 60 chars of description as fallback
  const safeTitle = String(title || '').trim() || String(description || '').trim().slice(0, 60) || 'User Report';
  const computedSeverity = severity || urgency || classifySeverity(`${safeTitle}\n${description}`);
  const uid = userId || reporterId || metadata.userId || metadata.reporterId || null;

  try {
    // Write to admin-consumed collection: userReports
    const ref = await addDoc(collection(db, 'userReports'), {
      userId: uid,
      reportedItemId: reportedItemId || metadata.reportedItemId || null,
      targetType: targetType || metadata.targetType || null,
      title: safeTitle,
      description: String(description || '').trim(),
      category,
      // Admin portal expects 'urgency'; also include 'severity' for compatibility
      urgency: computedSeverity,
      severity: computedSeverity,
      status: 'pending',
      metadata,
      reporterName: metadata.reporterName || metadata.name || null,
      reporterEmail: metadata.reporterEmail || metadata.email || null,
      location: location || metadata.location || null,
      attachments: metadata.attachments || [],
      source: 'mobile',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // AJAX-style check: fetch back the created document
    const snap = await getDoc(doc(db, 'userReports', ref.id));
    const data = snap.exists() ? { id: ref.id, ...snap.data() } : null;
    return { success: true, id: ref.id, severity: computedSeverity, report: data };
  } catch (e) {
    return { success: false, error: e?.message || 'Failed to create report' };
  }
}

// Admin: real-time subscription to reports
function subscribeToReports(callback, filters = {}) {
  let qRef = query(collection(db, 'userReports'), orderBy('createdAt', 'desc'));
  if (filters.severity && filters.severity !== 'all') {
    qRef = query(qRef, where('urgency', '==', filters.severity));
  }
  if (filters.status && filters.status !== 'all') {
    qRef = query(qRef, where('status', '==', filters.status));
  }
  if (filters.category && filters.category !== 'all') {
    qRef = query(qRef, where('category', '==', filters.category));
  }
  if (filters.limit) {
    qRef = query(qRef, limit(filters.limit));
  }
  return onSnapshot(qRef, (snapshot) => {
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(results);
  });
}

// Admin: fetch reports (one-time)
async function getReports({ severity, status, category, limitCount = 100 } = {}) {
  let qRef = query(collection(db, 'userReports'), orderBy('createdAt', 'desc'));
  if (severity) qRef = query(qRef, where('urgency', '==', severity));
  if (status) qRef = query(qRef, where('status', '==', status));
  if (category) qRef = query(qRef, where('category', '==', category));
  if (limitCount) qRef = query(qRef, limit(limitCount));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Admin: update status or assign
async function updateReportStatus(reportId, status, adminId = null) {
  const updateData = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (adminId) updateData.assignedTo = adminId;
  if (status === 'resolved') updateData.resolvedAt = serverTimestamp();
  await updateDoc(doc(db, 'userReports', reportId), updateData);
  const snap = await getDoc(doc(db, 'userReports', reportId));
  return { id: reportId, ...snap.data() };
}

// Admin: aggregate simple stats
async function getReportStats(timeframeDays = 30) {
  const now = new Date();
  const start = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);
  let qRef = query(collection(db, 'userReports'), orderBy('createdAt', 'desc'));
  // Firestore requires createdAt to be a timestamp to filter by >=; keeping simple count client-side after fetch
  const snap = await getDocs(qRef);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const inRange = all; // If needed, filter by createdAt.toDate() >= start
  const stats = {
    total: inRange.length,
    critical: inRange.filter((r) => r.severity === 'critical').length,
    high: inRange.filter((r) => r.severity === 'high').length,
    pending: inRange.filter((r) => r.status === 'pending').length,
    resolved: inRange.filter((r) => r.status === 'resolved').length,
  };
  return stats;
}

export default {
  // user
  createReport,
  classifySeverity,
  validateReportData,
  determineUrgency,
  // admin
  subscribeToReports,
  getReports,
  updateReportStatus,
  getReportStats,
};
