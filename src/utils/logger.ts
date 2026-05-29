import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AuditLogOperator {
  uid: string;
  email: string | null;
  role: string;
}

export const createAuditLog = async (
  user: AuditLogOperator,
  actionType: string,
  collectionName: string,
  description: string
) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      timestamp: serverTimestamp(),
      operatorId: user.uid,
      operatorEmail: user.email || '',
      operatorRole: user.role, // admin 或 subAdmin
      actionType: actionType,  // 例如: 'UPDATE_PERK', 'CREATE_GROUP_BUY'
      targetCollection: collectionName,
      description: description
    });
  } catch (error) {
    console.error("審計日誌寫入失敗:", error);
  }
};
