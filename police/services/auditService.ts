import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, firebaseAuth } from '../config/firebase';

export interface AuditLogEntry {
  action: string;
  reportId?: string;
  targetPath?: string;
  actorUid: string;
  details?: Record<string, unknown>;
  timestamp: any;
}

function getActorUid(explicitUid?: string): string {
  if (explicitUid) return explicitUid;
  const uid = firebaseAuth?.currentUser?.uid;
  return uid || 'anonymous';
}

export async function logAudit(
  action: string,
  params?: { reportId?: string; targetPath?: string; details?: Record<string, unknown>; actorUid?: string }
): Promise<void> {
  const { reportId, targetPath, details, actorUid } = params || {};
  // Build payload without undefined values to satisfy Firestore constraints
  const payload: Partial<AuditLogEntry> & { action: string; actorUid: string; timestamp: any } = {
    action,
    actorUid: getActorUid(actorUid),
    timestamp: serverTimestamp(),
  };
  if (reportId) payload.reportId = reportId;
  if (targetPath) payload.targetPath = targetPath;
  payload.details = details ?? {};

  await addDoc(collection(db, 'audit_logs'), payload as any);
}

export const auditService = { logAudit };
export default auditService;
