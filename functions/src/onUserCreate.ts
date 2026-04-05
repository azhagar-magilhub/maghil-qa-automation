import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export const onUserCreate = onCall(async (request) => {
  const { uid, email, fullName } = request.data;
  if (!uid) throw new Error('uid is required');

  const db = getFirestore('maghilqa');
  await db.doc(`users/${uid}`).set({
    email: email || '',
    fullName: fullName || email?.split('@')[0] || 'User',
    role: 'USER',
    isActive: true,
    setupComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true };
});
