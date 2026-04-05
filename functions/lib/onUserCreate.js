"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.onUserCreate = (0, https_1.onCall)(async (request) => {
    const { uid, email, fullName } = request.data;
    if (!uid)
        throw new Error('uid is required');
    const db = (0, firestore_1.getFirestore)('maghilqa');
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
//# sourceMappingURL=onUserCreate.js.map