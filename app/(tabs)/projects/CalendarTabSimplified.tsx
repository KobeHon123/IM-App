import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  SectionList,
  Modal,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDown, ChevronUp, X, CheckSquare, Clock } from 'lucide-react-native';
import EventCardSimplified from '@/components/EventCardSimplified';
import { useData } from '@/hooks/useData';
import { Part } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

const eventColors = {
  Measurement: '#3B82F6',
  'Test-Fit': '#10B981',
  Installation: '#F97316',
  Delivery: '#F59E0B',
  Meeting: '#8B5CF6',
  Other: '#6B7280',
};

const CalendarTabSimplified = ({ projectId }: { projectId: string }) => {
  const { loading, getEventsByProject, createEvent, getPartsByProject } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isCalendarFolded, setIsCalendarFolded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other'>('Measurement');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const events = getEventsByProject(projectId);
  const projectParts: Part[] = getPartsByProject(projectId); // Fetch parts

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (time: Date | null) => {
    if (!time) return '';
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthEvents = () => {
    const [month, year] = [selectedMonth.getMonth() + 1, selectedMonth.getFullYear()];
    return events
      .filter((event) => {
        const [day, eventMonth, eventYear] = event.date.split('-').map(Number);
        return eventMonth === month && eventYear === year;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA.getTime() - dateB.getTime();
      });
  };

  const getEventColorForDay = (day: number): string | null => {
    const dayEvents = getMonthEvents().filter((e) => parseDate(e.date).getDate() === day);
    if (dayEvents.length > 0) {
      return eventColors[dayEvents[0].type] || null;
    }
    return null;
  };

  const handleConfirmCreate = async () => {
    if (selectedDateForCreation) {
      try {
        const timeStr = selectedTime ? formatTime(selectedTime) : '';
        const finalDescription = timeStr ? `${timeStr} - ${description}` : description;

        const result = await createEvent({
          date: formatDate(selectedDateForCreation),
          type: selectedType as 'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other',
          parts: selectedParts,
          description: finalDescription,
          projectId,
        });

        if (result) {
          Alert.alert('Event Created', `Event for ${formatDate(selectedDateForCreation)} has been added.`);
          resetModal();
        } else {
          Alert.alert('Error', 'Failed to create event. Please try again.');
        }
      } catch (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'An unexpected error occurred while creating the event.');
      }
    }
  };

  const handlePartSelection = (partId: string) => {
    setSelectedParts((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId]
    );
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  const resetModal = () => {
    setShowConfirmModal(false);
    setSelectedDateForCreation(null);
    setSelectedType('Measurement');
    setSelectedParts([]);
    setDescription('');
    setSelectedTime(null);
    setShowTimePicker(false);
  };

  const renderCalendarDay = (day: number, isCurrentMonth: boolean, onPress: () => void, keyParam: string) => {
    const eventColor = day > 0 ? getEventColorForDay(day) : null;

    if (day === 0) {
      return <View key={keyParam} style={styles.calendarDay} />;
    }

    return (
      <TouchableOpacity key={keyParam} style={[styles.calendarDay, !isCurrentMonth && styles.inactiveDay]} onPress={onPress}>
        <View style={eventColor ? [styles.eventDay, { backgroundColor: eventColor }] : null}>
          <Text style={[
            styles.dayText,
            !isCurrentMonth && styles.inactiveText,
            eventColor ? { color: '#FFFFFF' } : null
          ]}>
            {day}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const weeks = [];
    let currentDay = 1;
    const numWeeks = Math.ceil((firstDay + daysInMonth) / 7);

    for (let week = 0; week < numWeeks; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const dayIndex = week * 7 + day;
        const keyParam = `day-${week}-${day}`;
        if (dayIndex < firstDay || currentDay > daysInMonth) {
          days.push(renderCalendarDay(0, false, () => {}, keyParam));
        } else {
          const dayNum = currentDay;
          const tappedDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), dayNum);
          days.push(
            renderCalendarDay(dayNum, true, () => {
              setSelectedDateForCreation(tappedDate);
              setShowConfirmModal(true);
            }, keyParam)
          );
          currentDay++;
        }
      }
      weeks.push(<View key={`week-${week}`} style={styles.calendarWeek}>{days}</View>);
    }

    return (
      <>
        <View style={styles.calendarHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.headerDay}>{day}</Text>
          ))}
        </View>
        {weeks}
      </>
    );
  };

  const renderCalendar = () => {
    return (
      <View style={styles.calendarContainer}>
        <TouchableOpacity
          style={styles.monthNavContainer}
          onPress={() => setIsCalendarFolded(!isCalendarFolded)}
        >
          <TouchableOpacity style={styles.monthNav} onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>
            <Text style={styles.navText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity style={styles.monthNav} onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
          {isCalendarFolded ? (
            <ChevronDown color="#6B7280" size={20} />
          ) : (
            <ChevronUp color="#6B7280" size={20} />
          )}
        </TouchableOpacity>
        {!isCalendarFolded && renderCalendarGrid()}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} color="#007AFF" strokeWidth={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {renderCalendar()}
      <SectionList
        sections={[{ title: '', data: getMonthEvents() }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCardSimplified
            date={item.date}
            type={item.type}
            parts={item.parts || []}
            projectParts={projectParts}
            description={item.description}
          />
        )}
        renderSectionHeader={() => null}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="fullScreen" // Full screen mode
        onRequestClose={resetModal}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <TouchableOpacity onPress={resetModal}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalInnerContent}>
            <Text style={styles.confirmText}>
              Are you sure to make an event on {selectedDateForCreation ? formatDate(selectedDateForCreation) : ''}?
            </Text>
            <Text style={styles.inputLabel}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventTypeContainer}>
              {(['Measurement', 'Test-Fit', 'Installation', 'Delivery', 'Meeting', 'Other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.eventTypeButton,
                    selectedType === type && { backgroundColor: eventColors[type] },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[
                    styles.eventTypeText,
                    selectedType === type && { color: '#FFFFFF' },
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Select Parts (Multi-select)</Text>
            {projectParts.length === 0 ? (
              <Text style={styles.noContentText}>No parts available</Text>
            ) : (
              <ScrollView style={styles.partsList} showsVerticalScrollIndicator={false}>
                {projectParts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.partSelectionItem,
                      selectedParts.includes(item.id) && styles.selectedPartItem,
                    ]}
                    onPress={() => handlePartSelection(item.id)}
                  >
                    <View style={styles.partSelectionContent}>
                      <Text style={styles.partSelectionText}>
                        {selectedParts.includes(item.id) ? '✓ ' : ''}{item.name}
                      </Text>
                      <Text style={styles.partTypeText}>{item.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Text style={styles.inputLabel}>Time (Optional)</Text>
            <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
              <Clock color="#6B7280" size={24} />
              <Text style={styles.timeButtonText}>
                {selectedTime ? formatTime(selectedTime) : 'Select Time'}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime || new Date()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'android' ? 'clock' : 'spinner'}
                onChange={onTimeChange}
              />
            )}
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
              placeholderTextColor="#6B728080"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
          <TouchableOpacity style={styles.createButton} onPress={handleConfirmCreate}>
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginLeft: 12,
    marginRight: 12,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    width: 40,
    height: 40,
  },
  inactiveDay: {
    backgroundColor: '#FFFFFF',
  },
  eventDay: {
    borderRadius: 24,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    color: '#111827',
  },
  inactiveText: {
    color: '#9CA3AF',
  },
  monthNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  monthNav: {
    padding: 4,
  },
  navText: {
    fontSize: 16,
    color: '#2563EB',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  // Full screen modal styles (white background, light colors hardcoded)
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    padding: 20,
  },
  modalInnerContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827', // Dark text
    marginLeft: 16,
    marginTop: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#374151', // Dark gray text
    textAlign: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151', // Dark label
    marginBottom: 8,
    marginLeft: 10,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    marginLeft: 12,
    marginRight: 12,
  },
  eventTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    marginRight: 8,
  },
  eventTypeText: {
    fontSize: 14,
    color: '#6B7280', // Gray text
  },
  partSelectionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedPartItem: {
    backgroundColor: '#E6F0FA',
  },
  partSelectionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partSelectionText: {
    fontSize: 16,
    color: '#111827', // Dark text
    fontWeight: '500',
    flex: 1,
  },
  partTypeText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  partsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  noContentText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 20,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
    marginLeft: 12,
    marginRight: 12,
  },
  timeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280', // Gray text (dark on white)
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    marginLeft: 12,
    marginRight: 12,
    color: '#111827', // Dark input text
    backgroundColor: '#FFFFFF', // White background
  },
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 18,
    width: '90%',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarTabSimplified;
