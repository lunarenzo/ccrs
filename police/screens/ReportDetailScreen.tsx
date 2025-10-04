import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService, Report } from '../services/firestoreService';
import { LeafletMap } from '../components/LeafletMap';
import { retryAsync } from '../services/retry';
import * as ImagePicker from 'expo-image-picker';
import { evidenceService, EvidenceItem } from '../services/evidenceService';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { useRoleCheck } from '../components/auth/RoleGuard';
import { cacheService } from '../services/cacheService';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

interface ReportDetailScreenProps {
  reportId: string;
  onBack: () => void;
}

export function ReportDetailScreen({ reportId, onBack }: ReportDetailScreenProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const { officer } = useAuth();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const { isSupervisor } = useRoleCheck();
  const [showReassign, setShowReassign] = useState(false);
  const [officers, setOfficers] = useState<Array<{ uid: string; email: string; displayName?: string }>>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  // Bottom action bar only shows status CTAs; evidence actions live in the content section.
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  // Cross-platform note modal state (Android prioritized)
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadReportDetails();
  }, [reportId]);

  const loadReportDetails = async () => {
    try {
      // Warm UI with cached data first
      const cachedReport = await cacheService.getCache<Report>(`report:${reportId}`);
      if (cachedReport) setReport(cachedReport);
      const cachedEvidence = await cacheService.getCache<EvidenceItem[]>(`evidence:${reportId}`);
      if (cachedEvidence) setEvidence(cachedEvidence);

      // Fetch fresh
      const reportData = await firestoreService.getReport(reportId);
      setReport(reportData);
      if (reportData) {
        await cacheService.setCache(`report:${reportId}`, reportData, CACHE_TTL_MS);
        await loadEvidence(reportData.id);
      } else {
        setEvidence([]);
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      Alert.alert('Error', 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const loadOfficers = async () => {
    setLoadingOfficers(true);
    try {
      const list = await firestoreService.listOfficers();
      setOfficers(list);
    } catch (e) {
      console.error('Failed to load officers:', e);
      Alert.alert('Error', 'Failed to load officers');
    } finally {
      setLoadingOfficers(false);
    }
  };

  const handleReassignTo = async (newOfficerUid: string) => {
    if (!report || !officer) return;
    setActionLoading(true);
    try {
      await firestoreService.reassignReport(report.id, newOfficerUid, officer.uid);
      Alert.alert('Reassigned', 'Case reassigned successfully.');
      setShowReassign(false);
      await loadReportDetails();
    } catch (e) {
      console.error('Failed to reassign:', e);
      Alert.alert('Error', 'Failed to reassign case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveClosure = async () => {
    if (!report || !officer) return;
    setActionLoading(true);
    try {
      await firestoreService.approveClosure(report.id, officer.uid);
      Alert.alert('Approved', 'Closure approved.');
      await loadReportDetails();
    } catch (e) {
      console.error('Failed to approve closure:', e);
      Alert.alert('Error', 'Failed to approve closure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClosure = () => {
    if (!report || !officer) return;
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject Closure',
        'Provide a reason:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async (reason) => {
              if (!reason?.trim()) {
                Alert.alert('Error', 'Please provide a reason');
                return;
              }
              setActionLoading(true);
              try {
                await firestoreService.rejectClosure(report.id, reason, officer.uid);
                Alert.alert('Rejected', 'Closure rejected and case returned to responding.');
                await loadReportDetails();
              } catch (e) {
                console.error('Failed to reject closure:', e);
                Alert.alert('Error', 'Failed to reject closure');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      Alert.alert('Reject Closure', 'This prompt is not yet supported on Android. Please try from iOS or contact support.');
    }
  };

  const handleStartAudioRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow microphone access to record audio.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopAndUploadAudio = async () => {
    if (!report || !officer) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }
      setActionLoading(true);
      await retryAsync(() => evidenceService.uploadAudio(report.id, uri, officer.uid), { retries: 2, baseDelayMs: 300 });
      await loadEvidence(report.id);
      Alert.alert('Evidence Added', 'Audio recorded and uploaded successfully.');
    } catch (e) {
      console.error('Failed to stop/upload audio:', e);
      Alert.alert('Error', 'Failed to upload audio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTextNote = () => {
    if (!report || !officer) return;
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add Officer Note',
        'Enter note text:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: async (note) => {
              if (!note?.trim()) {
                Alert.alert('Error', 'Please enter a note');
                return;
              }
              setActionLoading(true);
              try {
                await firestoreService.addOfficerNote(report.id, note, officer.uid);
                await loadReportDetails();
                Alert.alert('Note Added', 'Officer note added successfully.');
              } catch (e) {
                console.error('Failed to add note:', e);
                Alert.alert('Error', 'Failed to add note');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Android: use custom modal (prioritized platform)
      setNoteText('');
      setShowNoteModal(true);
    }
  };

  const handleSubmitNote = async () => {
    if (!report || !officer) return;
    const trimmed = noteText.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }
    setActionLoading(true);
    try {
      await firestoreService.addOfficerNote(report.id, trimmed, officer.uid);
      setShowNoteModal(false);
      setNoteText('');
      await loadReportDetails();
      Alert.alert('Note Added', 'Officer note added successfully.');
    } catch (e) {
      console.error('Failed to add note:', e);
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!report || !officer) return;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access to capture evidence.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setActionLoading(true);
      await retryAsync(() => evidenceService.uploadPhoto(report.id, uri, officer.uid), { retries: 2, baseDelayMs: 300 });
      await loadEvidence(report.id);
      Alert.alert('Evidence Added', 'Photo captured successfully.');
    } catch (e) {
      console.error('Failed to capture photo evidence:', e);
      Alert.alert('Error', 'Failed to capture photo evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddVideoEvidence = async () => {
    if (!report || !officer) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access to add video evidence.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setActionLoading(true);
      await retryAsync(() => evidenceService.uploadVideo(report.id, uri, officer.uid), { retries: 2, baseDelayMs: 300 });
      await loadEvidence(report.id);
      Alert.alert('Evidence Added', 'Video uploaded successfully.');
    } catch (e) {
      console.error('Failed to add video evidence:', e);
      Alert.alert('Error', 'Failed to upload video evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPhotoEvidence = async () => {
    if (!report || !officer) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access to add evidence.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setActionLoading(true);
      await retryAsync(() => evidenceService.uploadPhoto(report.id, uri, officer.uid), { retries: 2, baseDelayMs: 300 });
      await loadEvidence(report.id);
      Alert.alert('Evidence Added', 'Photo uploaded successfully.');
    } catch (e) {
      console.error('Failed to add photo evidence:', e);
      Alert.alert('Error', 'Failed to upload photo evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const loadEvidence = async (rid: string) => {
    setEvidenceLoading(true);
    try {
      // Try cache first
      const cached = await cacheService.getCache<EvidenceItem[]>(`evidence:${rid}`);
      if (cached) setEvidence(cached);

      const items = await evidenceService.listEvidence(rid);
      setEvidence(items);
      await cacheService.setCache(`evidence:${rid}`, items, CACHE_TTL_MS);
    } catch (e) {
      console.error('Failed to load evidence:', e);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleAcceptAssignment = async () => {
    if (!report) return;
    
    setActionLoading(true);
    const prev = report;
    // Optimistic update
    setReport({ ...report, assignmentStatus: 'accepted', status: 'accepted' });
    try {
      await retryAsync(() => firestoreService.acceptAssignment(report.id), { retries: 2, baseDelayMs: 300 });
      Alert.alert('Success', 'Assignment accepted successfully');
      loadReportDetails(); // Refresh data
    } catch (error) {
      console.error('Error accepting assignment:', error);
      setReport(prev); // revert
      Alert.alert('Error', 'Failed to accept assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineAssignment = () => {
    Alert.prompt(
      'Decline Assignment',
      'Please provide a reason for declining this assignment:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert('Error', 'Please provide a reason for declining');
              return;
            }
            
            setActionLoading(true);
            const prev = report!;
            // Optimistic update
            setReport({ ...prev, assignmentStatus: 'declined', status: 'unassigned', assignedTo: null as any });
            try {
              await retryAsync(() => firestoreService.declineAssignment(prev.id, reason), { retries: 2, baseDelayMs: 300 });
              Alert.alert('Assignment Declined', 'The assignment has been declined and will be reassigned.');
              onBack();
            } catch (error) {
              console.error('Error declining assignment:', error);
              setReport(prev); // revert
              Alert.alert('Error', 'Failed to decline assignment');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      'plain-text'
    );
    if (Platform.OS !== 'ios') {
      Alert.alert('Decline Assignment', 'Decline reason prompt not supported on Android yet.');
    }
  };

  const handleUpdateStatus = (newStatus: Report['status']) => {
    if (newStatus === 'resolved' || newStatus === 'rejected') {
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Case Resolution',
          'Please provide resolution notes:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async (notes) => {
                if (!notes?.trim()) {
                  Alert.alert('Error', 'Please provide resolution notes');
                  return;
                }
                
                setActionLoading(true);
                try {
                  await firestoreService.updateReportStatus(report!.id, newStatus, notes);
                  Alert.alert('Success', `Case marked as ${newStatus}`);
                  loadReportDetails();
                } catch (error) {
                  console.error('Error updating status:', error);
                  Alert.alert('Error', 'Failed to update case status');
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ],
          'plain-text'
        );
      } else {
        // Android fallback: allow update without notes to avoid crash
        Alert.alert(
          'Case Resolution',
          'Resolution notes prompt is not supported on Android yet. Proceed without notes?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed',
              style: 'destructive',
              onPress: async () => {
                setActionLoading(true);
                try {
                  await firestoreService.updateReportStatus(report!.id, newStatus);
                  Alert.alert('Success', `Case marked as ${newStatus}`);
                  loadReportDetails();
                } catch (error) {
                  console.error('Error updating status:', error);
                  Alert.alert('Error', 'Failed to update case status');
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ]
        );
      }
    } else {
      setActionLoading(true);
      const prev = report!;
      // Optimistic
      setReport({ ...prev, status: newStatus });
      retryAsync(() => firestoreService.updateReportStatus(prev.id, newStatus), { retries: 2, baseDelayMs: 300 })
        .then(() => {
          Alert.alert('Success', `Case status updated to ${newStatus}`);
          loadReportDetails();
        })
        .catch((error) => {
          console.error('Error updating status:', error);
          setReport(prev); // revert
          Alert.alert('Error', 'Failed to update case status');
        })
        .finally(() => setActionLoading(false));
    }
  };

  const handleOpenInMaps = () => {
    if (!report?.location?.coordinates) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }

    const { latitude, longitude } = report.location.coordinates;
    const address = encodeURIComponent(report.location.address || '');
    
    Alert.alert(
      'Open in Maps',
      'Choose your preferred navigation app:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Google Maps',
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            Linking.openURL(url);
          },
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'responding': return '#3B82F6';
      case 'resolved': return '#6B7280';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#65A30D';
      default: return '#6B7280';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canAcceptDecline = report?.assignmentStatus === 'pending';
  const canUpdateStatus = report?.status === 'accepted' || report?.status === 'responding';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading report details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Report not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Case Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 220 }}>
        <View style={styles.content}>
          {/* Case Header */}
          <View style={styles.caseHeader}>
            <Text style={styles.caseTitle}>{report.title || `${report.category} Report`}</Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(report.priority) }]}>
                <Text style={styles.badgeText}>{report.priority.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                <Text style={styles.badgeText}>{report.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Case Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Case Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{report.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reported:</Text>
              <Text style={styles.infoValue}>{formatDate(report.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>{formatDate(report.updatedAt)}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{report.description}</Text>
          </View>

          {/* Location & Map */}
          {report.location && (
            <View style={styles.section}>
              <View style={styles.locationHeader}>
                <Text style={styles.sectionTitle}>Location</Text>
                <TouchableOpacity style={styles.navigateButton} onPress={handleOpenInMaps}>
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.address}>{report.location.address}</Text>
              {report.location.coordinates && (
                <LeafletMap
                  latitude={report.location.coordinates.latitude}
                  longitude={report.location.coordinates.longitude}
                  address={report.location.address}
                />
              )}
            </View>
          )}

          {/* Officer Notes */}
          {report.officerNotes && report.officerNotes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Officer Notes</Text>
              {report.officerNotes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.noteTimestamp}>
                    {formatDate(note.timestamp)} - {note.author}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Resolution Notes */}
          {report.resolutionNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resolution Notes</Text>
              <Text style={styles.resolutionNotes}>{report.resolutionNotes}</Text>
            </View>
          )}

          {/* Supervisor Actions */}
          {isSupervisor() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supervisor Actions</Text>
              {/* Reassign */}
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={async () => {
                    setShowReassign((v) => !v);
                    if (!showReassign && officers.length === 0) await loadOfficers();
                  }}
                >
                  <Text style={styles.navigateButtonText}>{showReassign ? 'Hide Reassign' : 'Reassign Case'}</Text>
                </TouchableOpacity>
                {showReassign && (
                  <View style={{ gap: 6 }}>
                    {loadingOfficers ? (
                      <ActivityIndicator color="#3B82F6" />
                    ) : officers.length === 0 ? (
                      <Text style={styles.infoValue}>No officers found.</Text>
                    ) : (
                      officers.map((o) => (
                        <TouchableOpacity
                          key={o.uid}
                          onPress={() => handleReassignTo(o.uid)}
                          style={{ padding: 10, backgroundColor: '#F3F4F6', borderRadius: 6 }}
                        >
                          <Text style={{ color: '#111827' }}>{o.displayName || o.email} ({o.uid.slice(0, 6)}…)</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Closure Review */}
              {report.status === 'resolved' && !((report as any).closureApproved === true) && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.navigateButton, { backgroundColor: '#10B981' }]} onPress={handleApproveClosure}>
                    <Text style={styles.navigateButtonText}>Approve Closure</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navigateButton, { backgroundColor: '#EF4444' }]} onPress={handleRejectClosure}>
                    <Text style={styles.navigateButtonText}>Reject Closure</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Evidence (FileUpload-like design) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            {report.status === 'responding' && (
              <View style={styles.uploadCard}>
                <View style={styles.uploadButtonContainer}>
                  <TouchableOpacity
                    style={[styles.uploadButton, actionLoading && styles.uploadButtonDisabled]}
                    onPress={() => setShowEvidencePicker((v) => !v)}
                    disabled={actionLoading}
                    accessibilityLabel={showEvidencePicker ? 'Hide upload options' : 'Show upload options'}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={24} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.uploadTitle}>Upload an evidence</Text>
                <Text style={styles.uploadText}>Upload File/s</Text>
                <Text style={styles.helperText}>
                  {`Click to upload media (${evidence.length} item${evidence.length === 1 ? '' : 's'})`}
                </Text>
                {showEvidencePicker && (
                  <View style={styles.pickerRow}>
                    <TouchableOpacity style={styles.chipButton} onPress={handleCapturePhoto} disabled={actionLoading}>
                      <Text style={styles.chipText}>Capture</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipButton} onPress={handleAddPhotoEvidence} disabled={actionLoading}>
                      <Text style={styles.chipText}>Add Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipButton} onPress={handleAddVideoEvidence} disabled={actionLoading}>
                      <Text style={styles.chipText}>Add Video</Text>
                    </TouchableOpacity>
                    {!recorderState.isRecording ? (
                      <TouchableOpacity style={styles.chipButton} onPress={handleStartAudioRecording} disabled={actionLoading}>
                        <Text style={styles.chipText}>Record Audio</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.chipButton} onPress={handleStopAndUploadAudio} disabled={actionLoading}>
                        <Text style={styles.chipText}>Stop & Save</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.chipButton} onPress={handleAddTextNote} disabled={actionLoading}>
                      <Text style={styles.chipText}>Add Note</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            {evidenceLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : evidence.length === 0 ? (
              <Text style={styles.infoValue}>No evidence yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceGallery}>
                {evidence.map((item) => (
                  item.type === 'photo' ? (
                    <Image
                      key={item.id}
                      source={{ uri: item.url }}
                      style={styles.evidenceImage}
                      accessibilityLabel="Evidence photo"
                    />
                  ) : item.type === 'video' ? (
                    <EvidenceVideo key={item.id} url={item.url} />
                  ) : (
                    <EvidenceAudio key={item.id} url={item.url} />
                  )
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Note Input Modal (Android prioritized; also available cross-platform if desired) */}
      {showNoteModal && (
        <Modal
          visible={showNoteModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.sectionTitle}>Add Officer Note</Text>
              <TextInput
                placeholder="Enter note"
                value={noteText}
                onChangeText={setNoteText}
                autoFocus
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 80,
                  color: '#111827',
                }}
                placeholderTextColor="#9CA3AF"
                accessibilityLabel="Officer note input"
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => { setShowNoteModal(false); setNoteText(''); }}
                  style={styles.modalActionButton}
                  accessibilityLabel="Cancel note"
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitNote}
                  style={[styles.modalActionButton, { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}
                  accessibilityLabel="Submit note"
                  disabled={actionLoading}
                >
                  <Text style={[styles.modalActionText, { color: '#FFFFFF' }]}>{actionLoading ? 'Saving…' : 'Add Note'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Primary status CTA pinned on top for small screens */}
        {report.status === 'accepted' && (
          <View style={styles.statusActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.respondingButton]}
              onPress={() => handleUpdateStatus('responding')}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Mark as Responding</Text>
            </TouchableOpacity>
          </View>
        )}
        {canAcceptDecline && (
          <View style={styles.assignmentActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptAssignment}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Accept Assignment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDeclineAssignment}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {canUpdateStatus && (
          <View style={styles.statusActions}>
            {report.status === 'responding' && (
              <View style={styles.resolutionActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolvedButton]}
                  onPress={() => handleUpdateStatus('resolved')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectedButton]}
                  onPress={() => handleUpdateStatus('rejected')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionButtonText}>Mark Rejected</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {actionLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#3B82F6" />
          </View>
        )}
      </View>
      </SafeAreaView>
  );
}

interface EvidenceVideoProps { url: string }
function EvidenceVideo({ url }: EvidenceVideoProps) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return (
    <View style={styles.evidenceImage} accessibilityLabel="Evidence video">
      <VideoView
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

interface EvidenceAudioProps { url: string }
function EvidenceAudio({ url }: EvidenceAudioProps) {
  const player = useAudioPlayer(url);
  const { isPlaying } = useEvent(player as any, 'playingChange', { isPlaying: (player as any).playing });

  return (
    <View style={[styles.evidenceImage, { justifyContent: 'center', alignItems: 'center' }]} accessibilityLabel="Evidence audio">
      <TouchableOpacity
        style={{ backgroundColor: '#11182788', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
        onPress={() => { (isPlaying ? (player as any).pause() : (player as any).play()); }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>{isPlaying ? 'Pause Audio' : 'Play Audio'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  caseHeader: {
    marginBottom: 24,
  },
  caseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navigateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  address: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  noteItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  resolutionNotes: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  evidenceGallery: {
    gap: 8,
  },
  evidenceImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  uploadButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#EA580C',
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  uploadText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
  },
  chipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 8,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusActions: {
    gap: 12,
  },
  resolutionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  respondingButton: {
    backgroundColor: '#3B82F6',
  },
  resolvedButton: {
    backgroundColor: '#10B981',
  },
  rejectedButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalActionButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
