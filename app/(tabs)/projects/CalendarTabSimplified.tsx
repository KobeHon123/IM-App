import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SectionList,
  Modal,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, X, CheckSquare, Clock } from 'lucide-react-native';
import EventCardSimplified from '@/components/EventCardSimplified';
import { useData } from '@/hooks/useData';
import { Part } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';

const eventColors = {
  Measurement: '#3B82F6',
  'Test-Fit': '#10B981',
  Installation: '#F97316',
  Delivery: '#F59E0B',
  Meeting: '#EC4899',
  Other: '#6B7280',
};

const CalendarTabSimplified = ({ projectId }: { projectId: string }) => {
  const { loading, getEventsByProject, createEvent, getPartsByProject, updateEvent, deleteEvent } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isCalendarFolded, setIsCalendarFolded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other'>('Measurement');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [timeInput, setTimeInput] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthEvents = events
      .filter((event) => {
        const [day, eventMonth, eventYear] = event.date.split('-').map(Number);
        return eventMonth === month && eventYear === year;
      });

    // Separate into upcoming and past events
    const upcomingEvents = monthEvents.filter(event => {
      const eventDate = parseDate(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });

    const pastEvents = monthEvents.filter(event => {
      const eventDate = parseDate(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate < today;
    });

    // Sort both groups by date
    upcomingEvents.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    pastEvents.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Return upcoming events first, then past events
    return [...upcomingEvents, ...pastEvents];
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

        if (editingEventId) {
          // Update existing event
          const result = await updateEvent(editingEventId, {
            date: formatDate(selectedDateForCreation),
            type: selectedType as 'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other',
            parts: selectedParts,
            description: finalDescription,
            projectId,
          });
          if (result) {
            Alert.alert('Event Updated', 'Event has been updated successfully.');
            resetModal();
          } else {
            Alert.alert('Error', 'Failed to update event. Please try again.');
          }
        } else {
          // Create new event
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
        }
      } catch (error) {
        console.error('Error saving event:', error);
        Alert.alert('Error', 'An unexpected error occurred while saving the event.');
      }
    }
  };

  const handleEditEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setEditingEventId(eventId);
      setSelectedDateForCreation(parseDate(event.date));
      setSelectedType(event.type);
      setSelectedParts(event.parts || []);
      
      // Parse time from description if present
      const descriptionParts = event.description.split(' - ');
      if (descriptionParts.length === 2 && /^\d{2}:\d{2}$/.test(descriptionParts[0])) {
        const [hours, minutes] = descriptionParts[0].split(':').map(Number);
        const time = new Date();
        time.setHours(hours, minutes);
        setSelectedTime(time);
        setDescription(descriptionParts[1]);
      } else {
        setSelectedTime(null);
        setDescription(event.description);
      }
      
      setShowConfirmModal(true);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              Alert.alert('Event Deleted', 'Event has been deleted successfully.');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handlePartSelection = (partId: string) => {
    setSelectedParts((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId]
    );
  };

  const handleTimeInput = (text: string) => {
    // Only allow digits and colon
    const cleaned = text.replace(/[^0-9:]/g, '');
    setTimeInput(cleaned);

    // Auto-format as user types (HH:MM)
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      setTimeInput(cleaned + ':');
    } else if (cleaned.length === 5 && cleaned[2] === ':') {
      // Valid HH:MM format
      const [hours, minutes] = cleaned.split(':').map(Number);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const today = new Date();
        setSelectedTime(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes));
      }
    }
  };

  const resetModal = () => {
    setShowConfirmModal(false);
    setSelectedDateForCreation(null);
    setSelectedType('Measurement');
    setSelectedParts([]);
    setDescription('');
    setSelectedTime(null);
    setTimeInput('');
    setEditingEventId(null);
  };

  const renderCalendarDay = (day: number, isCurrentMonth: boolean, onPress: () => void, keyParam: string) => {
    const eventColor = day > 0 ? getEventColorForDay(day) : null;

    if (day === 0) {
      return <View key={keyParam} style={styles.calendarDay} />;
    }

    return (
      <TouchableOpacity key={keyParam} style={[styles.calendarDay, !isCurrentMonth && styles.inactiveDay]} onPress={onPress}>
        <View style={eventColor ? [styles.eventDay, { backgroundColor: eventColor }] : null}>
          <ThemedText style={[
            styles.dayText,
            !isCurrentMonth && styles.inactiveText,
            eventColor ? { color: '#FFFFFF' } : null
          ]}>
            {day}
          </ThemedText>
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
            <ThemedText key={day} style={styles.headerDay}>{day}</ThemedText>
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
            <ThemedText style={styles.navText}>Previous</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.monthTitle}>{selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</ThemedText>
          <TouchableOpacity style={styles.monthNav} onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>
            <ThemedText style={styles.navText}>Next</ThemedText>
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
        renderItem={({ item }) => {
          const eventDate = new Date(item.date.split('-').reverse().join('-'));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          eventDate.setHours(0, 0, 0, 0);
          const isPast = eventDate < today;

          return (
            <EventCardSimplified
              date={item.date}
              type={item.type}
              parts={item.parts || []}
              projectParts={projectParts}
              description={item.description}
              onEdit={() => handleEditEvent(item.id)}
              onDelete={() => handleDeleteEvent(item.id)}
              isPast={isPast}
            />
          );
        }}
        renderSectionHeader={() => null}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={resetModal}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Create Event'}</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                {selectedDateForCreation ? formatDate(selectedDateForCreation) : 'Select date'}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={resetModal}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalInnerContent} showsVerticalScrollIndicator={false}>
            {/* Event Type Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Event Type</ThemedText>
              <View style={styles.eventTypeGrid}>
                {(['Measurement', 'Test-Fit', 'Installation', 'Delivery', 'Meeting', 'Other'] as const).map((type) => {
                  const isSelected = selectedType === type;
                  const color = eventColors[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.eventTypeOption,
                        isSelected && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <ThemedText style={[
                        styles.eventTypeOptionText,
                        isSelected && { color: '#FFFFFF', fontWeight: '600' },
                      ]}>
                        {type}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Time (Optional)</ThemedText>
              <View style={styles.timeInputContainer}>
                <Clock color={eventColors[selectedType]} size={20} />
                <TextInput
                  style={styles.timeInputField}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                  value={timeInput || (selectedTime ? formatTime(selectedTime) : '')}
                  onChangeText={handleTimeInput}
                  maxLength={5}
                  keyboardType="decimal-pad"
                />
                <ThemedText style={styles.timeFormatLabel}>24H</ThemedText>
                {selectedTime && (
                  <TouchableOpacity
                    style={styles.timeClearButton}
                    onPress={() => {
                      setSelectedTime(null);
                      setTimeInput('');
                    }}
                  >
                    <ThemedText style={styles.timeClearText}>✕</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Parts Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleRow}>
                <ThemedText style={styles.sectionTitle}>Parts</ThemedText>
                {selectedParts.length > 0 && (
                  <View style={styles.partBadge}>
                    <ThemedText style={styles.partBadgeText}>{selectedParts.length}</ThemedText>
                  </View>
                )}
              </View>
              {projectParts.length === 0 ? (
                <ThemedText style={styles.noContentText}>No parts available</ThemedText>
              ) : (
                <View style={styles.partsListCompact}>
                  {projectParts.map((item) => {
                    const isSelected = selectedParts.includes(item.id);
                    const color = eventColors[selectedType];
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.partListItem,
                          isSelected && { backgroundColor: color },
                        ]}
                        onPress={() => handlePartSelection(item.id)}
                      >
                        <View style={styles.partListContent}>
                          <View style={[
                            styles.partListCheckbox,
                            isSelected && { backgroundColor: color, borderColor: color },
                          ]}>
                            {isSelected && <ThemedText style={styles.partListCheckmark}>✓</ThemedText>}
                          </View>
                          <View style={styles.partListTextContent}>
                            <ThemedText style={[
                              styles.partListName,
                              isSelected && { color: '#FFFFFF' },
                            ]}>
                              {item.name}
                            </ThemedText>
                            <ThemedText style={[
                              styles.partListType,
                              isSelected && { color: '#FFFFFF', opacity: 0.85 },
                            ]}>
                              {item.type}
                            </ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Description Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Description (Optional)</ThemedText>
              <TextInput
                style={styles.textAreaModern}
                value={description}
                onChangeText={setDescription}
                placeholder="Add notes or details about this event..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.createButtonModern, { backgroundColor: eventColors[selectedType] }]} 
              onPress={handleConfirmCreate}
            >
              <ThemedText style={styles.createButtonTextModern}>
                {editingEventId ? 'Update Event' : 'Create Event'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginLeft: 12,
    marginRight: 12,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  monthNav: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  // Modern modal styles
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  modalInnerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  eventTypeOptionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timeInputField: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
  },
  timeClearButton: {
    padding: 8,
    marginLeft: 4,
  },
  timeClearText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  timeFormatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  partBadge: {
    width: 24,
    height: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
  },
  partBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 14,
  },
  partsListCompact: {
    gap: 8,
  },
  partListItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  partListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partListCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partListCheckmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  partListTextContent: {
    flex: 1,
  },
  partListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  partListType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  noContentText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 20,
  },
  textAreaModern: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    height: 110,
    textAlignVertical: 'top',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonModern: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonTextModern: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarTabSimplified;
