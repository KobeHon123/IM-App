import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { Part, Project } from '@/types';
import { EllipsisVertical, Package, MessageCircle, Send } from 'lucide-react-native';

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
  onPress?: () => void;
  onMorePress?: () => void;
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
  onPress,
  onMorePress,
  onQuantityChange,
  onStatusChange,
  onCommentSend
}: PartCardProps) {
  const statusColors = {
    measured: '#EF4444',
    designed: '#F59E0B',
    tested: '#3B82F6',
    printed: '#F97316',
    installed: '#10B981',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(quantity.toString());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleQuantityEdit = () => {
    const newQuantity = parseInt(tempQuantity) || 0;
    if (onQuantityChange) {
      const delta = newQuantity - quantity;
      onQuantityChange(delta);
    }
    setIsEditing(false);
  };

  const handleQuantityPress = () => {
    if (countingMode && onQuantityChange) {
      setTempQuantity(quantity.toString());
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
      style={styles.card}
      onPress={handleCardPress}
      disabled={shouldDisablePress}
      activeOpacity={shouldDisablePress ? 1 : 0.7}
    >
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {part.cadDrawing ? (
            <Image source={{ uri: part.cadDrawing }} style={styles.thumbnail} />
          ) : part.pictures.length > 0 ? (
            <Image source={{ uri: part.pictures[0] }} style={styles.thumbnail} />
          ) : (
            <View style={styles.placeholderImage}>
              <Package color="#6B7280" size={24} />
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <Text style={styles.name}>{displayName}</Text>
          {!countingMode && <Text style={styles.type}>{part.type}</Text>}
          
          {!countingMode && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[part.status] || '#6B7280' }]}>
                <Text style={styles.statusText}>
                  {part.status ? part.status.charAt(0).toUpperCase() + part.status.slice(1) : 'Unknown'}
                </Text>
              </View>
            </View>
          )}
          
          {!countingMode && showQuantity && (
            <Text style={styles.quantity}>Qty: {quantity}</Text>
          )}
        </View>

        <View style={styles.actions}>
          {statusMode && onStatusChange ? (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: statusColors[part.status] || '#6B7280' }]}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={styles.statusButtonText}>
                {part.status ? part.status.charAt(0).toUpperCase() + part.status.slice(1) : 'Set'}
              </Text>
            </TouchableOpacity>
          ) : countingMode && onQuantityChange ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButtonLarge}
                onPress={() => onQuantityChange(-1)}
              >
                <Text style={styles.quantityButtonTextLarge}>-</Text>
              </TouchableOpacity>
              {isEditing ? (
                <TextInput
                  style={styles.quantityInput}
                  value={tempQuantity}
                  onChangeText={setTempQuantity}
                  onBlur={handleQuantityEdit}
                  onSubmitEditing={handleQuantityEdit}
                  keyboardType="numeric"
                  selectTextOnFocus
                  autoFocus
                />
              ) : (
                <TouchableOpacity onPress={handleQuantityPress}>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.quantityButtonLarge}
                onPress={() => onQuantityChange(1)}
              >
                <Text style={styles.quantityButtonTextLarge}>+</Text>
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
              <Text style={styles.commentCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commentSendButton, !commentText.trim() && styles.commentSendButtonDisabled]}
              onPress={handleCommentSend}
              disabled={!commentText.trim()}
            >
              <Send color="#FFFFFF" size={16} />
              <Text style={styles.commentSendText}>Send</Text>
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
            <Text style={styles.statusModalTitle}>Change Status</Text>
            {(['measured', 'designed', 'tested', 'printed', 'installed'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  part.status === status && styles.statusOptionSelected
                ]}
                onPress={() => handleStatusSelect(status)}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
                <Text style={styles.statusOptionText}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
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
    position: 'relative',  // NEW: Enables relative shifts
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  statusOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    textTransform: 'capitalize',
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
});
