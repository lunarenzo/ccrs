import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

interface OfficerDoc {
  id: string;
  email?: string;
  displayName?: string;
  jurisdictionId?: string;
}

interface PickResult {
  officerUid: string;
  reason: string;
}

function isOpenStatus(status: string | undefined): boolean {
  return status === 'assigned' || status === 'accepted' || status === 'responding';
}

export async function autoPickOfficer(reportId: string): Promise<PickResult> {
  // 1) Read report
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) throw new Error('Report not found');
  const report: any = reportSnap.data();
  const reportJurisdiction = report?.jurisdictionId;

  // 2) List active officers
  const usersRef = collection(db, 'users');
  let usersQ = query(usersRef, where('role', '==', 'officer'), where('status', '==', 'active'));
  const usersSnap = await getDocs(usersQ);
  let officers: OfficerDoc[] = usersSnap.docs.map(d => ({ id: d.id, email: (d.data() as any).email, displayName: (d.data() as any).displayName, jurisdictionId: (d.data() as any).jurisdictionId }));

  // 3) Optional jurisdiction filter when available on both sides
  if (reportJurisdiction) {
    const scoped = officers.filter(o => o.jurisdictionId === reportJurisdiction);
    if (scoped.length > 0) officers = scoped;
  }

  if (officers.length === 0) throw new Error('No active officers available');

  // 4) Compute open workload per officer
  const workloads: Array<{ uid: string; openCount: number; lastUpdated: number }> = [];
  for (const o of officers) {
    const assignedQ = query(collection(db, 'reports'), where('assignedTo', '==', o.id));
    const assignedSnap = await getDocs(assignedQ);
    let openCount = 0;
    let lastUpdated = 0;
    assignedSnap.forEach(docSnap => {
      const d: any = docSnap.data();
      if (isOpenStatus(d.status)) openCount++;
      const ts = d.updatedAt?.toDate?.()?.getTime?.() || d.updatedAt || d.timestamp?.toDate?.()?.getTime?.() || 0;
      if (ts > lastUpdated) lastUpdated = typeof ts === 'number' ? ts : 0;
    });
    workloads.push({ uid: o.id, openCount, lastUpdated });
  }

  // 5) Pick least-loaded officer (tie-break by oldest lastUpdated)
  workloads.sort((a, b) => {
    if (a.openCount !== b.openCount) return a.openCount - b.openCount;
    return a.lastUpdated - b.lastUpdated;
  });

  const winner = workloads[0];
  return { officerUid: winner.uid, reason: `open=${winner.openCount}, lastUpdated=${winner.lastUpdated || 0}` };
}
