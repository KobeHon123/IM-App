import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import {
  AlertCircle,
  AlignLeft,
  CheckSquare,
  Download,
  Edit2,
  FileText,
  Image as ImageIcon,
  Info,
  MessageCircle,
  Package,
  Ruler,
  Square,
  User,
  X,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Part, Comment } from '@/types';
import { updateComment, deleteComment, toggleCommentCompletion } from '@/lib/supabaseHelpers';

interface PartDetailModalProps {
  visible: boolean;
  selectedPart: Part | null;
  comments: Comment[];
  projectNames?: string[];
  onClose: () => void;
  onCommentsChange: (comments: Comment[]) => void;
  onImagePress?: (uri: string) => void;
}

export function PartDetailModal({
  visible,
  selectedPart,
  comments,
  projectNames,
  onClose,
  onCommentsChange,
}: PartDetailModalProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleImagePress = (uri: string) => {
    console.log('=== handleImagePress called ===');
    console.log('URI received:', uri);
    console.log('Current showFullImageModal state:', showFullImageModal);
    setFullImageUri(uri);
    setShowFullImageModal(true);
    console.log('States updated - showFullImageModal should be true now');
  };

  const handleDownloadImage = async () => {
    if (!fullImageUri) return;

    try {
      setIsDownloading(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to save images to your gallery.');
        return;
      }

      // Generate a unique filename
      const filename = `part_image_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Download the image
      const downloadResult = await FileSystem.downloadAsync(fullImageUri, fileUri);

      if (downloadResult.status === 200) {
        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('IM-App', asset, false);
        Alert.alert('Success', 'Image saved to your gallery!');
      } else {
        Alert.alert('Error', 'Failed to download image');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsDownloading(false);
    }
  };
  const handleToggleCommentCompletion = async (commentId: string) => {
    try {
      const updatedComment = await toggleCommentCompletion(commentId);
      if (updatedComment) {
        const updatedComments = comments.map(c =>
          c.id === commentId ? updatedComment : c
        );
        onCommentsChange(updatedComments);
      }
    } catch (error) {
      console.error('Error toggling comment completion:', error);
      Alert.alert('Error', 'Failed to update comment status');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (editingCommentText.trim()) {
      try {
        await updateComment(commentId, { text: editingCommentText.trim() });
        const updatedComments = comments.map(c =>
          c.id === commentId ? { ...c, text: editingCommentText.trim() } : c
        );
        onCommentsChange(updatedComments);
        setEditingCommentId(null);
        setEditingCommentText('');
      } catch (error) {
        console.error('Error updating comment:', error);
        Alert.alert('Error', 'Failed to update comment');
      }
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId);
              const updatedComments = comments.filter(c => c.id !== commentId);
              onCommentsChange(updatedComments);
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Part Details</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.modalClose}>Close</ThemedText>
          </TouchableOpacity>
        </View>
        {selectedPart && (
          <ScrollView style={styles.modalContent}>
            {/* Pictures Section (Moved to Top) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ImageIcon color="#6B7280" size={20} />
                <ThemedText style={styles.sectionTitle}>Pictures</ThemedText>
              </View>
              {selectedPart.pictures?.length ? (
                <FlatList
                  data={selectedPart.pictures}
                  keyExtractor={(item) => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleImagePress(item)}>
                      <Image source={{ uri: item }} style={styles.imagePreview} />
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <ThemedText style={styles.noContentText}>No pictures added</ThemedText>
              )}
            </View>
            {/* CAD Drawing Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText color="#6B7280" size={20} />
                <ThemedText style={styles.sectionTitle}>CAD Drawing</ThemedText>
              </View>
              {selectedPart.cadDrawing ? (
                <TouchableOpacity onPress={() => handleImagePress(selectedPart.cadDrawing!)}>
                  <Image 
                    key={selectedPart.cadDrawing} 
                    source={{ uri: selectedPart.cadDrawing }} 
                    style={styles.imagePreview} 
                  />
                </TouchableOpacity>
              ) : (
                <ThemedText style={styles.noContentText}>No CAD drawing added</ThemedText>
              )}
            </View>
            {/* Basic Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info color="#6B7280" size={20} />
                <ThemedText style={styles.sectionTitle}>Basic Info</ThemedText>
              </View>
              <View style={styles.fieldRow}>
                <Package color="#6B7280" size={18} />
                <ThemedText style={styles.fieldLabel}>Name:</ThemedText>
                <ThemedText style={styles.fieldValue}>{selectedPart.name}</ThemedText>
              </View>
              <View style={styles.fieldRow}>
                <FileText color="#6B7280" size={18} />
                <ThemedText style={styles.fieldLabel}>Type:</ThemedText>
                <ThemedText style={styles.fieldValue}>{selectedPart.type}</ThemedText>
              </View>
              <View style={styles.fieldRow}>
                <AlertCircle color="#6B7280" size={18} />
                <ThemedText style={styles.fieldLabel}>Status:</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: {
                  measured: '#EF4444',
                  designed: '#F59E0B',
                  tested: '#3B82F6',
                  printed: '#F97316',
                  installed: '#10B981',
                }[selectedPart.status] || '#6B7280' }]}>
                  <ThemedText style={styles.statusText}>
                    {selectedPart.status ? selectedPart.status.charAt(0).toUpperCase() + selectedPart.status.slice(1) : 'Unknown'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <User color="#6B7280" size={18} />
                <ThemedText style={styles.fieldLabel}>Designer:</ThemedText>
                <ThemedText style={styles.fieldValue}>{selectedPart.designer || 'Not assigned'}</ThemedText>
              </View>
              {projectNames && projectNames.length > 0 && (
                <View style={styles.fieldRow}>
                  <Package color="#6B7280" size={18} />
                  <ThemedText style={styles.fieldLabel}>Projects:</ThemedText>
                  <ThemedText style={styles.fieldValue}>{projectNames.join(' / ')}</ThemedText>
                </View>
              )}
              <View style={styles.descriptionRow}>
                <AlignLeft color="#6B7280" size={18} />
                <ThemedText style={styles.fieldLabel}>Location/Description:</ThemedText>
                <ThemedText style={[styles.fieldValue, { flex: 2 }]}>{selectedPart.description || 'No description available'}</ThemedText>
              </View>
            </View>
            {/* Dimensions Section */}
            {Object.keys(selectedPart.dimensions).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ruler color="#6B7280" size={20} />
                  <ThemedText style={styles.sectionTitle}>Dimensions</ThemedText>
                </View>
                <FlatList
                  data={Object.entries(selectedPart.dimensions)}
                  keyExtractor={([key]) => key}
                  renderItem={({ item: [key, value] }) => (
                    <View style={styles.dimensionRow}>
                      <ThemedText style={styles.dimensionKey}>{key.charAt(0).toUpperCase() + key.slice(1)}:</ThemedText>
                      <ThemedText style={styles.dimensionValue}>{value}</ThemedText>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
            {/* Comments Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MessageCircle color="#6B7280" size={20} />
                <ThemedText style={styles.sectionTitle}>Comments ({comments.length})</ThemedText>
              </View>
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <View key={comment.id} style={[
                    styles.commentItem,
                    comment.isCompleted && styles.commentItemCompleted
                  ]}>
                    <View style={styles.commentHeader}>
                      <TouchableOpacity
                        style={styles.commentCheckbox}
                        onPress={() => handleToggleCommentCompletion(comment.id)}
                      >
                        {comment.isCompleted ? (
                          <CheckSquare color="#10B981" size={24} />
                        ) : (
                          <Square color="#6B7280" size={24} />
                        )}
                      </TouchableOpacity>
                      {editingCommentId === comment.id ? (
                        <TextInput
                          style={styles.commentEditInput}
                          value={editingCommentText}
                          onChangeText={setEditingCommentText}
                          multiline
                          autoFocus
                        />
                      ) : (
                        <ThemedText style={[
                          styles.commentText,
                          comment.isCompleted && styles.commentTextCompleted
                        ]}>
                          {comment.text}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.commentFooter}>
                      <View style={styles.commentMetadata}>
                        <ThemedText style={styles.commentAuthor}>{comment.author}</ThemedText>
                        <ThemedText style={styles.commentSeparator}>•</ThemedText>
                        <ThemedText style={styles.commentDate}>
                          {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </ThemedText>
                        {comment.venueName && (
                          <>
                            <ThemedText style={styles.commentSeparator}>•</ThemedText>
                            <ThemedText style={styles.commentVenue}>{comment.venueName}</ThemedText>
                          </>
                        )}
                      </View>
                      <View style={styles.commentActions}>
                        {editingCommentId === comment.id ? (
                          <>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                            >
                              <ThemedText style={styles.commentCancelText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => handleUpdateComment(comment.id)}
                            >
                              <ThemedText style={styles.commentSaveText}>Save</ThemedText>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                            >
                              <Edit2 color="#2563EB" size={16} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.commentActionButton}
                              onPress={() => handleDeleteComment(comment.id)}
                            >
                              <ThemedText style={styles.commentDeleteText}>Delete</ThemedText>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <ThemedText style={styles.noContentText}>No comments yet</ThemedText>
              )}
            </View>
          </ScrollView>
        )}

        {/* Full Image Modal - Inside the main modal */}
        {showFullImageModal && (
          <View style={styles.fullImageOverlay}>
            <SafeAreaView style={styles.fullImageModalContainer}>
              <View style={styles.fullImageHeader}>
                <View style={styles.fullImageButtons}>
                  <TouchableOpacity 
                    style={styles.fullImageButton} 
                    onPress={handleDownloadImage}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Download color="#FFFFFF" size={24} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.fullImageButton} 
                    onPress={() => setShowFullImageModal(false)}
                  >
                    <X color="#FFFFFF" size={28} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fullImageContent}>
                {fullImageUri ? (
                  <Image 
                    source={{ uri: fullImageUri }} 
                    style={styles.fullImage} 
                    resizeMode="contain"
                  />
                ) : (
                  <ThemedText style={styles.noImageText}>No image available</ThemedText>
                )}
              </View>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imagePreview: {
    width: 200,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  noContentText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dimensionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dimensionKey: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dimensionValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentItemCompleted: {
    opacity: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentCheckbox: {
    padding: 4,
    marginRight: 8,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  commentTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  commentEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 32,
  },
  commentMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  commentVenue: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    padding: 4,
    marginLeft: 12,
  },
  commentDeleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  commentCancelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentSaveText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  fullImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  fullImageModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullImageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingRight: 16,
    paddingBottom: 16,
  },
  fullImageButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  fullImageButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullImageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  noImageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
