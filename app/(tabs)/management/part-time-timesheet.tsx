import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, SafeAreaView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';

type Period = 'full' | 'am' | 'pm' | 'other';

interface TimesheetEntry {
  id: string;
  user_id: string | null;
  worker_name: string;
  work_date: string;
  period: Period;
  location: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
}

const TEAM_MEMBERS = ['Kobe', 'Joyce', 'Cynthia'];
const VENUES = ['Office', 'PolyU', 'Site'];

const WORKER_SYMBOLS = {
  'Kobe': { symbol: 'K' },
  'Joyce': { symbol: 'J' },
  'Cynthia': { symbol: 'C' },
};

export default function PartTimeTimesheet() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('full');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [customStartTime, setCustomStartTime] = useState(new Date());
  const [customEndTime, setCustomEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding for days before month starts
    const firstDayOfWeek = firstDay.getDay();
    const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    for (let i = startPadding; i > 0; i--) {
      const paddingDay = new Date(year, month, 1 - i);
      days.push(paddingDay);
    }

    // Add all days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add padding for days after month ends
    const lastDayOfWeek = lastDay.getDay();
    const endPadding = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

    for (let i = 1; i <= endPadding; i++) {
      const paddingDay = new Date(year, month + 1, i);
      days.push(paddingDay);
    }

    return days;
  };

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Load timesheets for current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDateToLocalString(new Date(year, month, 1));
    const endDate = formatDateToLocalString(new Date(year, month + 1, 0));

    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date');

    if (error) {
      console.error('Error loading timesheets:', error);
    } else {
      setTimesheets(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentDate, user]);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedCalendarDate(null);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedCalendarDate(null);
  };

  const getEntriesForDate = (date: Date): TimesheetEntry[] => {
    const dateStr = formatDateToLocalString(date);
    return timesheets.filter(entry => entry.work_date === dateStr);
  };

  const handleAddTimesheet = async () => {
    if (!selectedMember) {
      Alert.alert('Required', 'Please select a team member');
      return;
    }

    if (!selectedVenue) {
      Alert.alert('Required', 'Please select a venue');
      return;
    }

    const dateStr = formatDateToLocalString(selectedDate);

    const timesheetData: any = {
      worker_name: selectedMember,
      work_date: dateStr,
      period: selectedPeriod,
      location: selectedVenue.toLowerCase(),
    };

    if (selectedPeriod === 'other') {
      timesheetData.custom_start_time = customStartTime.toTimeString().split(' ')[0];
      timesheetData.custom_end_time = customEndTime.toTimeString().split(' ')[0];
    }

    // Check if entry exists
    const existingEntry = timesheets.find(
      entry => entry.worker_name === selectedMember && entry.work_date === dateStr
    );

    if (existingEntry) {
      const { error } = await supabase
        .from('timesheets')
        .update({ ...timesheetData, updated_at: new Date().toISOString() })
        .eq('id', existingEntry.id);

      if (error) {
        console.error('Error updating timesheet:', error);
        alert('Failed to update timesheet');
        return;
      }
    } else {
      const { error } = await supabase
        .from('timesheets')
        .insert(timesheetData);

      if (error) {
        console.error('Error inserting timesheet:', error);
        Alert.alert('Error', 'Failed to add timesheet');
        return;
      }
    }

    setShowAddModal(false);
    loadData();
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setSelectedMember(entry.worker_name);
    setSelectedPeriod(entry.period);
    setSelectedVenue(entry.location || '');

    const dateObj = new Date(entry.work_date + 'T00:00:00');
    setSelectedDate(dateObj);

    if (entry.period === 'other' && entry.custom_start_time && entry.custom_end_time) {
      const startTime = new Date();
      const [startHours, startMinutes] = entry.custom_start_time.split(':');
      startTime.setHours(parseInt(startHours), parseInt(startMinutes));
      setCustomStartTime(startTime);

      const endTime = new Date();
      const [endHours, endMinutes] = entry.custom_end_time.split(':');
      endTime.setHours(parseInt(endHours), parseInt(endMinutes));
      setCustomEndTime(endTime);
    }

    setShowEditModal(true);
  };

  const handleUpdateTimesheet = async () => {
    if (!editingEntry) return;

    if (!selectedVenue) {
      Alert.alert('Required', 'Please select a venue');
      return;
    }

    const dateStr = formatDateToLocalString(selectedDate);

    const timesheetData: any = {
      work_date: dateStr,
      period: selectedPeriod,
      location: selectedVenue.toLowerCase(),
    };

    if (selectedPeriod === 'other') {
      timesheetData.custom_start_time = customStartTime.toTimeString().split(' ')[0];
      timesheetData.custom_end_time = customEndTime.toTimeString().split(' ')[0];
    } else {
      timesheetData.custom_start_time = null;
      timesheetData.custom_end_time = null;
    }

    const { error } = await supabase
      .from('timesheets')
      .update(timesheetData)
      .eq('id', editingEntry.id);

    if (error) {
      console.error('Error updating timesheet:', error);
      Alert.alert('Error', 'Failed to update timesheet');
      return;
    }

    setShowEditModal(false);
    setEditingEntry(null);
    loadData();
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this work time entry?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('timesheets')
              .delete()
              .eq('id', entryId);

            if (error) {
              console.error('Error deleting timesheet:', error);
              Alert.alert('Error', 'Failed to delete timesheet');
              return;
            }

            loadData();
          },
        },
      ]
    );
  };

  const getPeriodLabel = (period: Period, entry: TimesheetEntry) => {
    switch (period) {
      case 'full': return 'Full';
      case 'am': return 'AM';
      case 'pm': return 'PM';
      case 'other':
        if (entry.custom_start_time && entry.custom_end_time) {
          return `${entry.custom_start_time.substring(0, 5)}-${entry.custom_end_time.substring(0, 5)}`;
        }
        return 'Other';
    }
  };

  const getPeriodColor = (period: Period) => {
    switch (period) {
      case 'full': return '#10B981';  // Green
      case 'am': return '#EF4444';     // Red
      case 'pm': return '#3B82F6';     // Blue
      case 'other': return '#8B5CF6';  // Purple
    }
  };

  const formatLocation = (location: string | null) => {
    if (!location) return '';
    if (location === 'polyu') return 'PolyU';
    return location.charAt(0).toUpperCase() + location.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} color="#2563EB" strokeWidth={5} />
        </View>
      </SafeAreaView>
    );
  }

  const daysInMonth = getDaysInMonth(currentDate);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Part Time Timesheet</Text>
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNavigator}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedMember('');
            setSelectedDate(new Date());
            setSelectedPeriod('full');
            setSelectedVenue('');
            setShowAddModal(true);
          }}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Work Time</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendar}>
          {/* Day headers */}
          <View style={styles.weekDaysHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar days */}
          <View style={styles.calendarGrid}>
            {daysInMonth.map((date, index) => {
              const isCurrentMonthDay = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedCalendarDate?.toDateString() === date.toDateString();
              const entries = getEntriesForDate(date);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonthDay && styles.calendarDayOtherMonth,
                    isToday && styles.calendarDayToday,
                    isSelected && styles.calendarDaySelected,
                  ]}
                  onPress={() => setSelectedCalendarDate(date)}
                >
                  <Text style={[
                    styles.calendarDayNumber,
                    !isCurrentMonthDay && styles.calendarDayNumberOtherMonth,
                    isToday && styles.calendarDayNumberToday,
                    isSelected && styles.calendarDayNumberSelected,
                  ]}>
                    {date.getDate()}
                  </Text>

                  {/* Show entries */}
                  {entries.length > 0 && (
                    <View style={styles.entriesContainer}>
                      {entries.map(entry => {
                        const workerInfo = WORKER_SYMBOLS[entry.worker_name as keyof typeof WORKER_SYMBOLS];
                        const periodColor = getPeriodColor(entry.period);
                        return (
                          <View
                            key={entry.id}
                            style={[
                              styles.workerSymbol,
                              { backgroundColor: periodColor }
                            ]}
                          >
                            <Text style={styles.symbolText}>
                              {workerInfo?.symbol || entry.worker_name.charAt(0)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedCalendarDate && (
          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                {selectedCalendarDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCalendarDate(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {getEntriesForDate(selectedCalendarDate).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No work scheduled for this day</Text>
              </View>
            ) : (
              <View style={styles.detailsList}>
                {getEntriesForDate(selectedCalendarDate).map(entry => {
                  const workerInfo = WORKER_SYMBOLS[entry.worker_name as keyof typeof WORKER_SYMBOLS];
                  const periodColor = getPeriodColor(entry.period);
                  return (
                    <View key={entry.id} style={styles.detailCard}>
                      <View style={styles.detailCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={[styles.detailWorkerSymbol, { backgroundColor: periodColor }]}>
                            <Text style={styles.detailSymbolText}>
                              {workerInfo?.symbol || entry.worker_name.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.detailWorkerName}>{entry.worker_name}</Text>
                        </View>
                        <View style={styles.detailCardActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditEntry(entry)}
                          >
                            <Pencil size={18} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.detailCardContent}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Period:</Text>
                          <Text style={styles.detailValue}>{getPeriodLabel(entry.period, entry)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Location:</Text>
                          <Text style={styles.detailValue}>{formatLocation(entry.location)}</Text>
                        </View>
                        {entry.period === 'other' && entry.custom_start_time && entry.custom_end_time && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Time:</Text>
                            <Text style={styles.detailValue}>
                              {entry.custom_start_time.substring(0, 5)} - {entry.custom_end_time.substring(0, 5)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Workers</Text>
          <View style={styles.legendItems}>
            {Object.entries(WORKER_SYMBOLS).map(([name, info]) => (
              <View key={name} style={styles.legendItem}>
                <View style={[styles.legendSymbol, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={styles.legendSymbolText}>{info.symbol}</Text>
                </View>
                <Text style={styles.legendText}>{name}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.legendTitle, { marginTop: 16 }]}>Period Colors</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.legendSymbolText}>AM</Text>
              </View>
              <Text style={styles.legendText}>Morning</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.legendSymbolText}>PM</Text>
              </View>
              <Text style={styles.legendText}>Afternoon</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#10B981' }]}>
                <Text style={styles.legendSymbolText}>F</Text>
              </View>
              <Text style={styles.legendText}>Full Day</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Work Time</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Team Member Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Team Member *</Text>
              <View style={styles.memberButtons}>
                {TEAM_MEMBERS.map(member => (
                  <TouchableOpacity
                    key={member}
                    style={[
                      styles.memberButton,
                      selectedMember === member && styles.memberButtonSelected
                    ]}
                    onPress={() => setSelectedMember(member)}
                  >
                    <Text style={[
                      styles.memberButtonText,
                      selectedMember === member && styles.memberButtonTextSelected
                    ]}>
                      {member}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Venue Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venue *</Text>
              <View style={styles.memberButtons}>
                {VENUES.map(venue => (
                  <TouchableOpacity
                    key={venue}
                    style={[
                      styles.memberButton,
                      selectedVenue === venue && styles.memberButtonSelected
                    ]}
                    onPress={() => setSelectedVenue(venue)}
                  >
                    <Text style={[
                      styles.memberButtonText,
                      selectedVenue === venue && styles.memberButtonTextSelected
                    ]}>
                      {venue}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>

            {/* Period Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Period *</Text>
              <View style={styles.periodButtons}>
                {[
                  { value: 'am' as Period, label: 'AM' },
                  { value: 'pm' as Period, label: 'PM' },
                  { value: 'full' as Period, label: 'Full Day' },
                  { value: 'other' as Period, label: 'Other' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.periodButton,
                      selectedPeriod === option.value && styles.periodButtonSelected
                    ]}
                    onPress={() => setSelectedPeriod(option.value)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === option.value && styles.periodButtonTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time Selection */}
            {selectedPeriod === 'other' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Custom Time</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>From</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {customStartTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>To</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {customEndTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showStartTimePicker && (
                  <DateTimePicker
                    value={customStartTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowStartTimePicker(false);
                      if (time) setCustomStartTime(time);
                    }}
                  />
                )}

                {showEndTimePicker && (
                  <DateTimePicker
                    value={customEndTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowEndTimePicker(false);
                      if (time) setCustomEndTime(time);
                    }}
                  />
                )}
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddTimesheet}
            >
              <Text style={styles.saveButtonText}>Save Work Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Work Time</Text>
            <TouchableOpacity onPress={() => {
              setShowEditModal(false);
              setEditingEntry(null);
            }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Team Member Display (Read-only) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Team Member</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{selectedMember}</Text>
              </View>
            </View>

            {/* Venue Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venue *</Text>
              <View style={styles.memberButtons}>
                {VENUES.map(venue => (
                  <TouchableOpacity
                    key={venue}
                    style={[
                      styles.memberButton,
                      selectedVenue === venue && styles.memberButtonSelected
                    ]}
                    onPress={() => setSelectedVenue(venue)}
                  >
                    <Text style={[
                      styles.memberButtonText,
                      selectedVenue === venue && styles.memberButtonTextSelected
                    ]}>
                      {venue}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>

            {/* Period Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Period *</Text>
              <View style={styles.periodButtons}>
                {[
                  { value: 'am' as Period, label: 'AM' },
                  { value: 'pm' as Period, label: 'PM' },
                  { value: 'full' as Period, label: 'Full Day' },
                  { value: 'other' as Period, label: 'Other' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.periodButton,
                      selectedPeriod === option.value && styles.periodButtonSelected
                    ]}
                    onPress={() => setSelectedPeriod(option.value)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === option.value && styles.periodButtonTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time Selection */}
            {selectedPeriod === 'other' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Custom Time</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>From</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {customStartTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>To</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {customEndTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showStartTimePicker && (
                  <DateTimePicker
                    value={customStartTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowStartTimePicker(false);
                      if (time) setCustomStartTime(time);
                    }}
                  />
                )}

                {showEndTimePicker && (
                  <DateTimePicker
                    value={customEndTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowEndTimePicker(false);
                      if (time) setCustomEndTime(time);
                    }}
                  />
                )}
              </View>
            )}

            {/* Update Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateTimesheet}
            >
              <Text style={styles.saveButtonText}>Update Work Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  calendar: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 0.75, // Changed from 0.75 to 1 for a perfect square
    padding: 4,
    borderWidth: 0.5, // Thinner lines often look cleaner in grids
    borderColor: '#E5E7EB',
    justifyContent: 'space-between', // This pushes the Date to top and Symbols to bottom with a gap
    height: 60, // Adding a fixed height ensures they never grow
  },
  calendarDayOtherMonth: {
    backgroundColor: '#F9FAFB',
  },
  calendarDayToday: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 1,
  },
  calendarDayNumberOtherMonth: {
    color: '#9CA3AF',
  },
  calendarDayNumberToday: {
    color: '#2563EB',
  },
  calendarDaySelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
    borderWidth: 2,
  },
  calendarDayNumberSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  entriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 20,     // Ensures space is reserved even when empty
    marginBottom: 4,
  },
  workerSymbol: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  symbolText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  entryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  entryName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  entryPeriod: {
    fontSize: 7,
    color: '#FFFFFF',
  },
  legend: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendSymbol: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendSymbolText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legendText: {
    fontSize: 14,
    color: '#6B7280',
  },
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  readOnlyField: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  memberButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  memberButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  memberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberButtonTextSelected: {
    color: '#2563EB',
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  periodButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextSelected: {
    color: '#2563EB',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  timeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailsList: {
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  periodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailWorkerSymbol: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  detailSymbolText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailWorkerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailCardContent: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});
