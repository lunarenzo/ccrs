import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

export function InviteActivationScreen() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | { email: string; jurisdictionId: string; expiresAt?: Date }>(null);

  async function handleVerify() {
    if (!user?.email) {
      Alert.alert('Not signed in', 'Please sign in with the same email the admin used to invite you.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Invalid code', 'Please enter your invite code.');
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      // Force refresh ID token so Firestore rules see request.auth.token.email immediately after sign-up
      try { await user.getIdToken(true); } catch {}

      const qy = query(
        collection(db, 'invites'),
        where('email', '==', user.email.trim().toLowerCase())
      );
      const snap = await getDocs(qy);
      const match = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .find((i) => (i.inviteCode || '').toUpperCase() === code.trim().toUpperCase());

      if (!match) {
        Alert.alert('Not found', 'No invite found for your email with this code.');
        return;
      }

      const expiresAt: Date | undefined = match.expiresAt?.toDate ? match.expiresAt.toDate() : undefined;
      const now = new Date();
      if (expiresAt && expiresAt < now) {
        Alert.alert('Expired', 'This invite has expired. Please contact your admin for a new invite.');
        return;
      }
      if (match.status && match.status !== 'pending') {
        Alert.alert('Unavailable', `This invite is ${match.status}. Please contact your admin.`);
        return;
      }

      setResult({ email: match.email, jurisdictionId: match.jurisdictionId, expiresAt });

      // Ensure users/{uid} exists so Admin can list this account
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            id: user.uid,
            email: user.email?.toLowerCase() || '',
            role: 'citizen',
            status: 'active',
            jurisdictionId: match.jurisdictionId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          } as any, { merge: true } as any);
        } else {
          await setDoc(userRef, {
            email: user.email?.toLowerCase() || '',
            jurisdictionId: match.jurisdictionId,
            updatedAt: Timestamp.now(),
          } as any, { merge: true } as any);
        }
      } catch (e) {
        console.warn('Failed to ensure user profile after invite verification:', e);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to verify invite.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Activate Officer Access</Text>
        <Text style={styles.subtitle}>
          Enter the invite code provided by your administrator. Make sure you signed in with the same email.
        </Text>

        <TextInput
          placeholder="Enter invite code"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
          style={styles.input}
          editable={!isLoading}
        />

        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleVerify} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Invite</Text>}
        </TouchableOpacity>

        {result && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Invite Verified</Text>
            <Text style={styles.successText}>Email: {result.email}</Text>
            <Text style={styles.successText}>Jurisdiction: {result.jurisdictionId}</Text>
            {result.expiresAt && (
              <Text style={styles.successText}>Expires: {result.expiresAt.toLocaleDateString()}</Text>
            )}
            <Text style={[styles.subtitle, { marginTop: 8 }]}>Please contact your admin to grant officer access.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: '#1F2937', marginBottom: 12,
  },
  button: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  successBox: { marginTop: 16, backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1, borderRadius: 8, padding: 12 },
  successTitle: { color: '#065F46', fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  successText: { color: '#065F46', textAlign: 'center' },
});
