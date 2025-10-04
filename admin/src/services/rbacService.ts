import { collection, getDocs, orderBy, query, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type UserRole = 'citizen' | 'officer' | 'supervisor' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Jurisdiction {
  id: string;
  name: string;
  type?: 'precinct' | 'district' | 'city' | 'region';
}

class RbacService {
  async setUserRole(params: { userId: string; role?: UserRole; status?: UserStatus; jurisdictionId?: string; }) {
    const { userId, role, status, jurisdictionId } = params;
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // Create minimal user doc if missing (helps initial admin bootstrap)
      await setDoc(userRef, {
        id: userId,
        role: role || 'citizen',
        status: status || 'active',
        jurisdictionId: jurisdictionId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as any, { merge: true } as any);
      return { success: true, userId, role: (role || 'citizen') as UserRole, status: (status || 'active') as UserStatus };
    }
    await updateDoc(userRef, {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(jurisdictionId ? { jurisdictionId } : {}),
      updatedAt: Timestamp.now(),
    } as any);
    return { success: true, userId, role, status } as { success: boolean; userId: string; role?: UserRole; status?: UserStatus };
  }

  async getJurisdictions(): Promise<Jurisdiction[]> {
    const q = query(collection(db, 'jurisdictions'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }
}

export const rbacService = new RbacService();
export default rbacService;
