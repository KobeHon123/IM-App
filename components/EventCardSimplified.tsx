import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Tag, Clock, FileText } from 'lucide-react-native';
import { Part } from '@/types';

interface EventCardSimplifiedProps {
  date: string;
  type: 'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other';
  parts: string[];
  projectParts: Part[];
  description?: string;
  time?: string;
}

const eventColors = {
  Measurement: '#3B82F6',
  'Test-Fit': '#10B981',
  Installation: '#F97316',
  Delivery: '#F59E0B',
  Meeting: '#8B5CF6',
  Other: '#6B7280',
};

const EventCardSimplified: React.FC<EventCardSimplifiedProps> = ({ date, type, parts, projectParts, description, time }) => {
  const color = eventColors[type] || '#6B7280'; // Fallback to neutral

  return (
    <View style={[styles.eventCard, { borderLeftColor: color }]}>
      <View style={styles.content}>
        <View style={styles.typeContainer}>
          <Tag color={color} size={16} />
          <Text style={[styles.typeText, { color }]}>{type}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Calendar color="#6B7280" size={16} />
          <Text style={styles.dateText}>{date}</Text>
        </View>
        {parts.length > 0 && (
          <View style={styles.partsContainer}>
            <Text style={styles.partsLabel}>Parts:</Text>
            <Text style={styles.partsText}>
              {parts.map((id) => projectParts.find((p) => p.id === id)?.name || 'Unknown').join(', ')}
            </Text>
          </View>
        )}
        {time && (
          <View style={styles.timeContainer}>
            <Clock color="#6B7280" size={16} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        )}
        {description && (
          <View style={styles.descriptionContainer}>
            <FileText color="#6B7280" size={16} />
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginVertical: 8,
    marginHorizontal: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  partsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  partsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 4,
  },
  partsText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 4,
    flex: 1,
  },
});

export default EventCardSimplified;