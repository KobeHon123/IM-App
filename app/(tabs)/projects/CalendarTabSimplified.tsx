import React, { useState, useMemo } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, X, CheckSquare, Clock, Plus, Calendar } from 'lucide-react-native';
import EventCardSimplified from '@/components/EventCardSimplified';
import { useData } from '@/hooks/useData';
import { Part } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import type { ThemeColors } from '@/constants/Colors';

const eventColors = {
  Measurement: '#3B82F6',
  'Test-Fit': '#10B981',
  Installation: '#F97316',
  Delivery: '#F59E0B',
  Meeting: '#EC4899',
  Other: '#6B7280',
};

const CalendarTabSimplified = ({ projectId }: { projectId: string }) => {
  const colors = useColors();
  const { canEdit } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { loading, getEventsByProject, createEvent, getPartsByProject, updateEvent, deleteEvent } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isCalendarFolded, setIsCalendarFolded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [selectedDateForCreation, setSelectedDateForCreation] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<'Measurement' | 'Test-Fit' | 'Installation' | 'Delivery' | 'Meeting' | 'Other'>('Measurement');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [timeInput, setTimeInput] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [pickerDate, setPickerDate] = useState<{ day: number; month: number; year: number }>({ day: 1, month: 1, year: 2024 });

  const events = getEventsByProject(projectId);
  const projectParts: Part[] = getPartsByProject(projectId); // Fetch parts

  const extractPartNumber = (partName: string): number => {
    const match = partName.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
  };

  const sortParts = (partsToSort: Part[]): Part[] => {
    return [...partsToSort].sort((a, b) => {
      const numA = extractPartNumber(a.name);
      const numB = extractPartNumber(b.name);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      return a.name.localeCompare(b.name);
    });
  };

  const getGroupedAndSortedParts = () => {
    const grouped: Record<string, Part[]> = {};
    projectParts.forEach(part => {
      if (!grouped[part.type]) {
        grouped[part.type] = [];
      }
      grouped[part.type].push(part);
    });
    
    // Sort parts within each group
    Object.keys(grouped).forEach(type => {
      grouped[type] = sortParts(grouped[type]);
    });
    
    return grouped;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

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

  const getEventColorForPickerDay = (day: number, month: number, year: number): string | null => {
    const dayEvents = events.filter((e) => {
      const [eventDay, eventMonth, eventYear] = e.date.split('-').map(Number);
      return eventDay === day && eventMonth === month && eventYear === year;
    });
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
    setExpandedCategories({});
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
              if (!canEdit) return;
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
            <ChevronDown color={colors.textSecondary} size={20} />
          ) : (
            <ChevronUp color={colors.textSecondary} size={20} />
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
      {/* Calendar hidden - using floating button instead */}
      {/* {renderCalendar()} */}
      <SectionList
        sections={[{ 
          title: '', 
          data: (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const upcoming = events.filter(event => {
              const eventDate = new Date(event.date.split('-').reverse().join('-'));
              eventDate.setHours(0, 0, 0, 0);
              return eventDate >= today;
            });
            
            const past = events.filter(event => {
              const eventDate = new Date(event.date.split('-').reverse().join('-'));
              eventDate.setHours(0, 0, 0, 0);
              return eventDate < today;
            });
            
            // Sort both by date
            upcoming.sort((a, b) => new Date(a.date.split('-').reverse().join('-')).getTime() - new Date(b.date.split('-').reverse().join('-')).getTime());
            past.sort((a, b) => new Date(a.date.split('-').reverse().join('-')).getTime() - new Date(b.date.split('-').reverse().join('-')).getTime());
            
            return [...upcoming, ...past];
          })()
        }]}
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
              onEdit={canEdit ? () => handleEditEvent(item.id) : undefined}
              onDelete={canEdit ? () => handleDeleteEvent(item.id) : undefined}
              isPast={isPast}
            />
          );
        }}
        renderSectionHeader={() => null}
        showsVerticalScrollIndicator={false}
      />

      {canEdit && (
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => {
          setSelectedDateForCreation(new Date());
          setShowConfirmModal(true);
        }}
      >
        <Plus color="#FFFFFF" size={28} />
      </TouchableOpacity>
      )}

      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={resetModal}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
            <View>
              <ThemedText style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Create Event'}</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                {selectedDateForCreation ? formatDate(selectedDateForCreation) : 'Select date'}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={resetModal}>
              <X color={colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalInnerContent} showsVerticalScrollIndicator={false}>
            {/* Date Selection Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Select Date</ThemedText>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  if (selectedDateForCreation) {
                    setPickerDate({
                      day: selectedDateForCreation.getDate(),
                      month: selectedDateForCreation.getMonth() + 1,
                      year: selectedDateForCreation.getFullYear(),
                    });
                  }
                  setShowDatePickerInline(!showDatePickerInline);
                }}
              >
                <Calendar color={colors.primaryText} size={20} />
                <ThemedText style={styles.datePickerButtonText}>
                  {selectedDateForCreation ? formatDate(selectedDateForCreation) : 'Tap to select date'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Inline Date Picker - Calendar */}
            {showDatePickerInline && (
              <View style={styles.inlineCalendarContainer}>
                <View style={styles.inlineCalendarHeader}>
                  <TouchableOpacity onPress={() => setPickerDate({ ...pickerDate, month: pickerDate.month === 1 ? 12 : pickerDate.month - 1, year: pickerDate.month === 1 ? pickerDate.year - 1 : pickerDate.year })}>
                    <ThemedText style={styles.inlineCalendarNavText}>←</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.inlineCalendarTitle}>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][pickerDate.month - 1]} {pickerDate.year}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setPickerDate({ ...pickerDate, month: pickerDate.month === 12 ? 1 : pickerDate.month + 1, year: pickerDate.month === 12 ? pickerDate.year + 1 : pickerDate.year })}>
                    <ThemedText style={styles.inlineCalendarNavText}>→</ThemedText>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inlineCalendarWeekHeader}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <ThemedText key={day} style={styles.inlineCalendarWeekDay}>{day}</ThemedText>
                  ))}
                </View>

                <View style={styles.inlineCalendarGrid}>
                  {(() => {
                    const daysInMonth = new Date(pickerDate.year, pickerDate.month, 0).getDate();
                    const firstDay = new Date(pickerDate.year, pickerDate.month - 1, 1).getDay();
                    const days = [];
                    
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<View key={`empty-${i}`} style={styles.inlineCalendarEmptyDay} />);
                    }
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                      const isSelected = pickerDate.day === day;
                      const eventColor = getEventColorForPickerDay(day, pickerDate.month, pickerDate.year);
                      days.push(
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.inlineCalendarDay,
                            isSelected && styles.inlineCalendarDaySelected,
                          ]}
                          onPress={() => setPickerDate({ ...pickerDate, day })}
                        >
                          {eventColor && (
                            <View style={[styles.inlineCalendarEventIndicator, { backgroundColor: eventColor }]} />
                          )}
                          <ThemedText
                            style={[
                              styles.inlineCalendarDayText,
                              isSelected && styles.inlineCalendarDayTextSelected,
                            ]}
                          >
                            {day}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    }
                    
                    return days;
                  })()}
                </View>

                <TouchableOpacity 
                  style={styles.inlineDatePickerButton}
                  onPress={() => {
                    const newDate = new Date(pickerDate.year, pickerDate.month - 1, pickerDate.day);
                    setSelectedDateForCreation(newDate);
                    setShowDatePickerInline(false);
                  }}
                >
                  <ThemedText style={styles.inlineDatePickerButtonText}>Confirm Date</ThemedText>
                </TouchableOpacity>
              </View>
            )}

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
                  placeholderTextColor={colors.textMuted}
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
                  {Object.entries(getGroupedAndSortedParts()).map(([category, parts]) => {
                    const isExpanded = expandedCategories[category] !== false; // Default to expanded
                    const color = eventColors[selectedType];
                    return (
                      <View key={category}>
                        <TouchableOpacity
                          style={styles.categoryHeader}
                          onPress={() => toggleCategory(category)}
                        >
                          <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
                          <View style={styles.categoryBadge}>
                            <ThemedText style={styles.categoryBadgeText}>{parts.length}</ThemedText>
                          </View>
                          {isExpanded ? (
                            <ChevronUp color={colors.textSecondary} size={18} />
                          ) : (
                            <ChevronDown color={colors.textSecondary} size={18} />
                          )}
                        </TouchableOpacity>
                        {isExpanded && (
                          <View style={styles.categoryContent}>
                            {parts.map((item) => {
                              const isSelected = selectedParts.includes(item.id);
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
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
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
                placeholderTextColor={colors.textMuted}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  tabContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    padding: 16,
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  inactiveText: {
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Modern modal styles
  modalFullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.text,
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    flex: 1,
  },
  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  eventTypeOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    padding: 0,
  },
  timeClearButton: {
    padding: 8,
    marginLeft: 4,
  },
  timeClearText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  timeFormatLabel: {
    fontSize: 11,
    color: colors.textMuted,
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
    gap: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
    flex: 1,
  },
  categoryBadge: {
    width: 20,
    height: 20,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 13,
  },
  categoryContent: {
    paddingLeft: 12,
    gap: 6,
    marginBottom: 8,
  },
  partListItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border,
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
    color: colors.text,
  },
  partListType: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noContentText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 20,
  },
  textAreaModern: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    height: 110,
    textAlignVertical: 'top',
    color: colors.text,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cancelButtonText: {
    color: colors.textStrong,
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
  // Inline Date Picker Styles
  inlineDatePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineDatePickerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inlineDatePickerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  inlineDatePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Inline Calendar Styles
  inlineCalendarContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  inlineCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inlineCalendarNavText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    paddingHorizontal: 8,
  },
  inlineCalendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inlineCalendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineCalendarWeekDay: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 44,
    height: 44,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inlineCalendarEmptyDay: {
    width: 44,
    height: 44,
  },
  inlineCalendarDay: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    marginVertical: 2,
  },
  inlineCalendarDaySelected: {
    backgroundColor: colors.primary,
  },
  inlineCalendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  inlineCalendarDayTextSelected: {
    color: '#FFFFFF',
  },
  datePickerContent: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  datePickerColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  datePickerScroll: {
    flex: 1,
    maxHeight: 300,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  datePickerOptionSelected: {
    backgroundColor: colors.primary,
  },
  datePickerOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  datePickerOptionTextSelected: {
    color: '#FFFFFF',
  },
  inlineCalendarEventIndicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 4,
    right: 4,
  },
});

export default CalendarTabSimplified;
