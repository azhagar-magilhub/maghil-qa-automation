"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTicketWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.onTicketWrite = (0, firestore_1.onDocumentWritten)('ticketBatches/{batchId}/tickets/{ticketId}', async (event) => {
    const batchId = event.params.batchId;
    const after = event.data?.after?.data();
    const before = event.data?.before?.data();
    if (!after)
        return;
    const db = (0, firestore_2.getFirestore)('maghilqa');
    const batchRef = db.doc(`ticketBatches/${batchId}`);
    if (before?.status !== after.status) {
        const updates = {};
        if (after.status === 'CREATED') {
            updates.successCount = firestore_2.FieldValue.increment(1);
        }
        else if (after.status === 'FAILED') {
            updates.failedCount = firestore_2.FieldValue.increment(1);
        }
        if (Object.keys(updates).length > 0) {
            await batchRef.update(updates);
        }
        const ticketsSnapshot = await db
            .collection(`ticketBatches/${batchId}/tickets`)
            .where('status', 'in', ['PENDING', 'CREATING'])
            .limit(1)
            .get();
        if (ticketsSnapshot.empty) {
            const batchDoc = await batchRef.get();
            const batchData = batchDoc.data();
            const failedCount = batchData?.failedCount ?? 0;
            const successCount = batchData?.successCount ?? 0;
            const finalStatus = failedCount > 0
                ? successCount > 0
                    ? 'PARTIAL_FAILURE'
                    : 'FAILED'
                : 'COMPLETED';
            await batchRef.update({ status: finalStatus });
        }
    }
});
//# sourceMappingURL=onTicketWrite.js.map