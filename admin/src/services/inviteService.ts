import { addDoc, collection, Timestamp, getDocs, orderBy, query, limit as qlimit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OfficerInviteInput {
  email: string;
  fullName?: string;
  jurisdictionId: string;
  expiresInDays?: number; // default 14
}

export interface OfficerInvite {
  id?: string;
  email: string;
  fullName?: string;
  role: 'officer';
  jurisdictionId: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  inviteCode: string;
  createdBy: { uid: string; email?: string | null };
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createOfficerInvite(
  input: OfficerInviteInput,
  createdBy: { uid: string; email?: string | null }
): Promise<{ id: string; inviteCode: string }> {
  const { email, fullName, jurisdictionId, expiresInDays = 14 } = input;
  const now = new Date();
  const expires = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const inviteCode = generateInviteCode(8);

  const payload: Omit<OfficerInvite, 'id'> = {
    email: email.trim().toLowerCase(),
    fullName: fullName?.trim(),
    role: 'officer',
    jurisdictionId,
    status: 'pending',
    inviteCode,
    createdBy,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expires),
  };

  const ref = await addDoc(collection(db, 'invites'), payload as any);
  return { id: ref.id, inviteCode };
}

export async function listInvites(opts?: { limit?: number }): Promise<OfficerInvite[]> {
  const l = Math.max(1, Math.min(200, opts?.limit ?? 25));
  const qy = query(collection(db, 'invites'), orderBy('createdAt', 'desc'), qlimit(l));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const ref = doc(db, 'invites', inviteId);
  await updateDoc(ref, { status: 'revoked' as const });
}

export const inviteService = { createOfficerInvite, listInvites, revokeInvite };
export default inviteService;
