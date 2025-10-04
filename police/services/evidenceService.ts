import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAudit } from './auditService';

export interface EvidenceItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  url: string;
  publicId: string;
  authorUid: string;
  createdAt: Timestamp;
}

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'image/jpeg';
}

function filenameFromUri(uri: string): string {
  const parts = uri.split('/');
  const last = parts[parts.length - 1] || `photo_${Date.now()}.jpg`;
  return last.includes('.') ? last : `${last}.jpg`;
}

class EvidenceService {
  async uploadPhoto(reportId: string, fileUri: string, authorUid: string): Promise<EvidenceItem> {
    const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
    const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Missing Cloudinary configuration. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filenameFromUri(fileUri),
      type: guessMimeFromUri(fileUri),
    } as any);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', `reports/${reportId}/photos`);
    form.append('context', `reportId=${reportId}`);
    form.append('tags', `report:${reportId},evidence`);

    const res = await fetch(endpoint, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
      console.error('Cloudinary upload error:', data);
      throw new Error('Failed to upload to Cloudinary');
    }

    const docRef = await addDoc(collection(db, `reports/${reportId}/report_evidence`), {
      type: 'photo',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    });

    await logAudit('evidence_add', {
      reportId,
      targetPath: `reports/${reportId}/report_evidence/${docRef.id}`,
      details: { type: 'photo', publicId: data.public_id }
    });

    return {
      id: docRef.id,
      type: 'photo',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    };
  }

  async uploadVideo(reportId: string, fileUri: string, authorUid: string): Promise<EvidenceItem> {
    const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
    const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Missing Cloudinary configuration. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filenameFromUri(fileUri),
      type: guessMimeFromUri(fileUri),
    } as any);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', `reports/${reportId}/videos`);
    form.append('context', `reportId=${reportId}`);
    form.append('tags', `report:${reportId},evidence,video`);

    const res = await fetch(endpoint, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
      console.error('Cloudinary upload error:', data);
      throw new Error('Failed to upload video to Cloudinary');
    }

    const docRef = await addDoc(collection(db, `reports/${reportId}/report_evidence`), {
      type: 'video',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    });

    await logAudit('evidence_add', {
      reportId,
      targetPath: `reports/${reportId}/report_evidence/${docRef.id}`,
      details: { type: 'video', publicId: data.public_id }
    });

    return {
      id: docRef.id,
      type: 'video',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    };
  }

  async uploadAudio(reportId: string, fileUri: string, authorUid: string): Promise<EvidenceItem> {
    const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
    const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Missing Cloudinary configuration. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
    }

    // Cloudinary treats audio as `video` resource type
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filenameFromUri(fileUri).replace(/\.(jpg|jpeg|png)$/i, '.m4a'),
      type: guessMimeFromUri(fileUri),
    } as any);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', `reports/${reportId}/audio`);
    form.append('context', `reportId=${reportId}`);
    form.append('tags', `report:${reportId},evidence,audio`);

    const res = await fetch(endpoint, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
      console.error('Cloudinary upload error (audio):', data);
      throw new Error('Failed to upload audio');
    }

    const docRef = await addDoc(collection(db, `reports/${reportId}/report_evidence`), {
      type: 'audio',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    });

    await logAudit('evidence_add', {
      reportId,
      targetPath: `reports/${reportId}/report_evidence/${docRef.id}`,
      details: { type: 'audio', publicId: data.public_id }
    });

    return {
      id: docRef.id,
      type: 'audio',
      url: data.secure_url,
      publicId: data.public_id,
      authorUid,
      createdAt: Timestamp.now(),
    };
  }

  async listEvidence(reportId: string): Promise<EvidenceItem[]> {
    const qy = query(collection(db, `reports/${reportId}/report_evidence`), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME as string;

    const items: EvidenceItem[] = [];
    for (const d of snap.docs) {
      const data: any = d.data();
      if (data.type === 'photo' || data.type === 'video' || data.type === 'audio') {
        let url: string | undefined = data.url;
        if (!url && data.publicId && CLOUD_NAME) {
          const resource = data.type === 'photo' ? 'image' : 'video';
          url = `https://res.cloudinary.com/${CLOUD_NAME}/${resource}/upload/${data.publicId}`;
        }
        if (!url) continue;
        items.push({
          id: d.id,
          type: data.type,
          url,
          publicId: data.publicId || '',
          authorUid: data.authorUid,
          createdAt: data.createdAt,
        });
      }
    }
    return items;
  }
}

export const evidenceService = new EvidenceService();
export default evidenceService;
