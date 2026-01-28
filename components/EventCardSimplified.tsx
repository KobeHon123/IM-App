import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Clock, Package, FileText, Edit2, Trash2 } from 'lucide-react-native';
import { Part } from '@/types';
import { ThemedText } from '@/components/ThemedText';

interface EventCardSimplifiedProps {
  date: string;
  type: 'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other';
  parts: string[];
  projectParts: Part[];
  description?: string;
  time?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isPast?: boolean;
}

const eventColors = {
  Measurement: '#3B82F6',
  'Test-Fit': '#10B981',
  Installation: '#F97316',
  Delivery: '#F59E0B',
  Meeting: '#EC4899',
  Other: '#6B7280',
};

const eventBgColors = {
  Measurement: '#EFF6FF',
  'Test-Fit': '#F0FDF4',
  Installation: '#FFF7ED',
  Delivery: '#FFFBEB',
  Meeting: '#FCE7F3',
  Other: '#F9FAFB',
};

const EventCardSimplified: React.FC<EventCardSimplifiedProps> = ({ date, type, parts, projectParts, description, time, onEdit, onDelete, isPast }) => {
  const baseColor = eventColors[type] || '#6B7280';
  const color = isPast ? '#9CA3AF' : baseColor;
  const bgColor = isPast ? '#F3F4F6' : (eventBgColors[type] || '#F9FAFB');
  const partNames = parts.map((id) => projectParts.find((p) => p.id === id)?.name || 'Unknown');

  // Parse time from description (format: "HH:MM - description")
  let eventTime = time;
  let displayDescription = description;
  
  if (description && !eventTime) {
    const parts = description.split(' - ');
    if (parts.length === 2 && /^\d{2}:\d{2}$/.test(parts[0])) {
      eventTime = parts[0];
      displayDescription = parts[1];
    }
  }

  return (
    <View style={[styles.eventCard, { backgroundColor: bgColor }]}>
      {/* Header with Type Badge and Action Buttons */}
      <View style={styles.headerTop}>
        <View style={[styles.typeBadge, { backgroundColor: color }]}>
          <ThemedText style={styles.typeLabel}>{type}</ThemedText>
        </View>
        <View style={styles.actionButtons}>
          {onEdit && (
            <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
              <Edit2 color={color} size={18} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={onDelete}>
              <Trash2 color="#EF4444" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date and Time */}
      <View style={styles.header}>
        <View style={styles.dateTimeGroup}>
          <View style={styles.dateGroup}>
            <Calendar color={color} size={16} />
            <ThemedText style={styles.dateText}>{date}</ThemedText>
          </View>
          {eventTime && (
            <View style={styles.timeGroup}>
              <Clock color={color} size={16} />
              <ThemedText style={styles.timeText}>{eventTime}</ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Parts Section */}
      {parts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package color={color} size={18} />
            <ThemedText style={styles.sectionTitle}>Parts ({parts.length})</ThemedText>
          </View>
          <View style={styles.partsList}>
            {partNames.map((name, index) => (
              <View key={index} style={[styles.partBadge, { borderColor: color }]}>
                <ThemedText style={[styles.partText, { color }]}>{name}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Description Section */}
      {displayDescription && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText color={color} size={18} />
            <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
          </View>
          <ThemedText style={styles.descriptionText}>{displayDescription}</ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 12,
    paddingTop: 16,
    paddingRight: 16,
    paddingLeft: 16,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  header: {
    marginBottom: 14,
  },
  dateTimeGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  partsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  partText: {
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default EventCardSimplified;