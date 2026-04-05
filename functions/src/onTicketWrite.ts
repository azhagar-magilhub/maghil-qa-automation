import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export const onTicketWrite = onDocumentWritten(
  'ticketBatches/{batchId}/tickets/{ticketId}',
  async (event) => {
    const batchId = event.params.batchId;
    const after = event.data?.after?.data();
    const before = event.data?.before?.data();

    if (!after) return;

    const db = getFirestore('maghilqa');
    const batchRef = db.doc(`ticketBatches/${batchId}`);

    if (before?.status !== after.status) {
      const updates: Record<string, FieldValue> = {};

      if (after.status === 'CREATED') {
        updates.successCount = FieldValue.increment(1);
      } else if (after.status === 'FAILED') {
        updates.failedCount = FieldValue.increment(1);
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
        const finalStatus =
          failedCount > 0
            ? successCount > 0
              ? 'PARTIAL_FAILURE'
              : 'FAILED'
            : 'COMPLETED';
        await batchRef.update({ status: finalStatus });
      }
    }
  },
);
