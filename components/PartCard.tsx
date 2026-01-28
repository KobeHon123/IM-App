import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Animated, Platform } from 'react-native';
import { usePlatformHaptics } from '@/hooks/usePlatformHaptics';
import { Part, Project } from '@/types';
import { EllipsisVertical, Package, MessageCircle, Send, Check, Minus, Plus, ChevronRight } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface PartCardProps {
  part: Part;
  project?: Project;
  quantity?: number;
  showQuantity?: boolean;
  countingMode?: boolean;
  statusMode?: boolean;
  hasComments?: boolean;
  venueName?: string;
  showCommentButton?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onMorePress?: () => void;
  onLongPress?: () => void;
  onQuantityChange?: (delta: number) => void;
  onStatusChange?: (newStatus: string) => void;
  onCommentSend?: (text: string) => void;
}

export function PartCard({
  part,
  project,
  quantity = 0,
  showQuantity = false,
  countingMode = false,
  statusMode = false,
  hasComments = false,
  venueName,
  showCommentButton = true,
  isSelected = false,
  onPress,
  onMorePress,
  onLongPress,
  onQuantityChange,
  onStatusChange,
  onCommentSend
}: PartCardProps) {
  const { impactAsync, notificationAsync } = usePlatformHaptics();
  const statusColors = {
    measured: '#EF4444',
    designed: '#F59E0B',
    tested: '#3B82F6',
    printed: '#F97316',
    installed: '#10B981',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(quantity.toString());
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  // Sync local quantity with prop when it changes from parent
  React.useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  const handleQuantityChange = (delta: number) => {
    // Optimistic update - update local state immediately
    const newQuantity = Math.max(0, localQuantity + delta);
    setLocalQuantity(newQuantity);
    // Then call parent handler
    if (onQuantityChange) {
      onQuantityChange(delta);
    }
  };

  const handleQuantityEdit = () => {
    const newQuantity = parseInt(tempQuantity) || 0;
    const delta = newQuantity - localQuantity;
    setLocalQuantity(newQuantity);
    if (onQuantityChange) {
      onQuantityChange(delta);
    }
    setIsEditing(false);
  };

  const handleQuantityPress = () => {
    if (countingMode && onQuantityChange) {
      setTempQuantity(localQuantity.toString());
      setIsEditing(true);
    }
  };

  const handleStatusSelect = (status: string) => {
    if (onStatusChange) {
      onStatusChange(status);
    }
    setShowStatusModal(false);
  };

  const handleCommentSend = () => {
    if (commentText.trim() && onCommentSend) {
      onCommentSend(commentText.trim());
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const displayName = project ? `${part.name} - ${project.name}` : part.name;

  const shouldDisablePress = countingMode || statusMode || showCommentInput;

  const handleCardPress = () => {
    if (!shouldDisablePress && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => {
        if (!shouldDisablePress) {
          handleCardPress();
          if (onPress) onPress();
        }
      }}
      onLongPress={onLongPress}
      delayLongPress={500}
      disabled={shouldDisablePress && !onLongPress}
      activeOpacity={shouldDisablePress ? 1 : 0.7}
    >
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {part.cadDrawing ? (
            <Image key={part.cadDrawing} source={{ uri: part.cadDrawing }} style={styles.thumbnail} />
          ) : part.pictures.length > 0 ? (
            <Image key={part.pictures[0]} source={{ uri: part.pictures[0] }} style={styles.thumbnail} />
          ) : (
            <View style={styles.placeholderImage}>
              <Package color="#6B7280" size={24} />
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <ThemedText style={styles.name}>{displayName}</ThemedText>
          {!countingMode && <ThemedText style={styles.type}>{part.type}</ThemedText>}
          
          {!countingMode && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[part.status] || '#6B7280' }]}>
                <ThemedText style={styles.statusText}>
                  {part.status ? part.status.charAt(0).toUpperCase() + part.status.slice(1) : 'Unknown'}
                </ThemedText>
              </View>
            </View>
          )}
          
          {!countingMode && showQuantity && (
            <ThemedText style={styles.quantity}>Qty: {quantity}</ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          {statusMode && onStatusChange ? (
            <TouchableOpacity
              style={styles.statusModeContainer}
              onPress={() => setShowStatusModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.statusIndicator, { backgroundColor: statusColors[part.status] || '#6B7280' }]} />
              <ThemedText style={styles.statusModeText}>
                {part.status ? part.status.charAt(0).toUpperCase() + part.status.slice(1) : 'Set'}
              </ThemedText>
              <ChevronRight color="#9CA3AF" size={14} />
            </TouchableOpacity>
          ) : countingMode && onQuantityChange ? (
            <View style={styles.countingModeContainer}>
              <TouchableOpacity
                style={[styles.countButton, styles.countButtonMinus]}
                onPress={() => {
                  impactAsync();
                  handleQuantityChange(-1);
                }}
                activeOpacity={0.7}
              >
                <Minus color="#EF4444" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
              {isEditing ? (
                <TextInput
                  style={styles.countInput}
                  value={tempQuantity}
                  onChangeText={setTempQuantity}
                  onBlur={handleQuantityEdit}
                  onSubmitEditing={handleQuantityEdit}
                  keyboardType="numeric"
                  selectTextOnFocus
                  autoFocus
                />
              ) : (
                <TouchableOpacity 
                  style={styles.countDisplay}
                  onPress={handleQuantityPress}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.countValue}>{localQuantity}</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.countButton, styles.countButtonPlus]}
                onPress={() => {
                  impactAsync();
                  handleQuantityChange(1);
                }}
                activeOpacity={0.7}
              >
                <Plus color="#3B82F6" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.normalActions}>
              {showCommentButton && (
                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => setShowCommentInput(true)}
                >
                  <MessageCircle color={hasComments ? '#2563EB' : '#6B7280'} size={20} />
                  {hasComments && <View style={styles.commentBadge} />}
                </TouchableOpacity>
              )}
              {onMorePress && (
                <TouchableOpacity style={styles.moreButton} onPress={onMorePress}>
                  <EllipsisVertical color="#6B7280" size={20} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder={`Add comment for ${venueName || 'this part'}...`}
            multiline
            autoFocus
          />
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.commentCancelButton}
              onPress={() => {
                setShowCommentInput(false);
                setCommentText('');
              }}
            >
              <ThemedText style={styles.commentCancelText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commentSendButton, !commentText.trim() && styles.commentSendButtonDisabled]}
              onPress={handleCommentSend}
              disabled={!commentText.trim()}
            >
              <Send color="#FFFFFF" size={16} />
              <ThemedText style={styles.commentSendText}>Send</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showStatusModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <TouchableOpacity
            style={styles.statusModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.statusModalHeader}>
              <ThemedText style={styles.statusModalTitle}>Update Status</ThemedText>
              <ThemedText style={styles.statusModalSubtitle}>{part.name}</ThemedText>
            </View>
            <View style={styles.statusOptionsContainer}>
              {(['measured', 'designed', 'tested', 'printed', 'installed'] as const).map((status, index) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    part.status === status && styles.statusOptionSelected
                  ]}
                  onPress={() => handleStatusSelect(status)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]}>
                      {part.status === status && (
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      )}
                    </View>
                    <ThemedText style={[
                      styles.statusOptionText,
                      part.status === status && styles.statusOptionTextSelected
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusProgressBar, { width: `${(index + 1) * 20}%`, backgroundColor: statusColors[status] + '30' }]} />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

// ... styles remain unchanged

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  quantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  moreButton: {
    padding: 8,
  },
  // Modern Counting Mode Styles
  countingModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 4,
    gap: 8,
  },
  countButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
  },
  countButtonMinus: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  countButtonPlus: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  countDisplay: {
    minWidth: 52,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  countValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  countInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    minWidth: 48,
    height: 40,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
    paddingHorizontal: 8,
  },
  // Modern Status Mode Styles
  statusModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  // Legacy styles kept for compatibility
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    padding: 8,
    position: 'relative',
    left: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 6,
    margin: 2,
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  quantityButtonLarge: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    margin: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityButtonTextLarge: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 6,
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  quantityInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    minWidth: 300,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  statusModalHeader: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusOptionsContainer: {
    padding: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    position: 'relative',
    overflow: 'hidden',
  },
  statusOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusOptionTextSelected: {
    color: '#4338CA',
    fontWeight: '600',
  },
  statusProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  normalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentButton: {
    padding: 8,
    position: 'relative',
  },
  commentBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  commentInputContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  commentCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  commentCancelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  commentSendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  commentSendText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardSelected: {
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
    borderWidth: 2,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
