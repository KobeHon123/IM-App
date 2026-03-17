import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Pencil, Trash2, Info, Download, ArrowLeft } from 'lucide-react-native';
import { File as FSFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useRouter } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/hooks/useData';
import LoadingSpinner from '@/components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { BlurView } from 'expo-blur';

type Period = 'full' | 'am' | 'pm' | 'other';

interface DutyAllocation {
  duty: string;
  hours: number;
}

interface DutyAllocationInput {
  duty: string;
  hours: string;
}

interface StoredDutyPayload {
  version: 1;
  duties: DutyAllocation[];
}

const MAX_DUTY_COUNT = 3;

interface TimesheetEntry {
  id: string;
  user_id: string | null;
  worker_name: string;
  work_date: string;
  period: Period;
  location: string | null;
  site_name?: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
  duty?: string | null;
  confirmed?: boolean;
}

const TEAM_MEMBERS = ['Kobe', 'Joyce', 'Cynthia'];
const VENUES = ['Office', 'PolyU', 'Site'];

const WORKER_SYMBOLS = {
  'Kobe': { symbol: 'K' },
  'Joyce': { symbol: 'J' },
  'Cynthia': { symbol: 'C' },
};

// Star shape component for Site location
const TriangleShape = ({ color, confirmed }: { color: string; confirmed?: boolean }) => {
  // Create a cross/plus shape with even thicker arms
  const crossPoints = "5,1 13,1 13,5 17,5 17,13 13,13 13,17 5,17 5,13 1,13 1,5 5,5";
  
  return (
    <Svg width={20} height={20} viewBox="0 0 18 18">
      <Polygon 
        points={crossPoints} 
        fill={color}
        stroke={confirmed ? '#334155' : 'none'}
        strokeWidth={confirmed ? 1.5 : 0}
      />
    </Svg>
  );
};

const StarShape = ({ color }: { color: string }) => {
  // Create a 5-point star
  const starPoints = "9,0 11.4,7.4 19,7.4 13.2,12.4 15.6,20 9,15.6 2.4,20 4.8,12.4 -1,7.4 6.6,7.4";
  
  return (
    <Svg width={18} height={18} viewBox="0 0 18 20">
      <Polygon points={starPoints} fill={color} />
    </Svg>
  );
};

// ─── Wheel Picker constants (used by TimeWheelPickerModal) ──────────────────
const WHEEL_ITEM_HEIGHT = 48;
const WHEEL_VISIBLE_ITEMS = 5; // must be odd

// WheelPickerModal removed — duty hours now use a plain TextInput (decimal-pad)

const wheelStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerBtn: {
    minWidth: 64,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  wheelContainer: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.75)', // ← adjust 0.75 for transparency (0 = clear, 1 = solid white)
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    backgroundColor: 'rgba(0,122,255,0.06)',
    zIndex: 1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  wheelItemTextSelected: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
});
// ──────────────────────────────────────────────────────────────────────────────

// ─── Time Wheel Picker ───────────────────────────────────────────────────────
const TIME_HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TIME_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const TIME_AMPM = ['AM', 'PM'];
const SHEET_SLIDE_AMOUNT = 420;

// 24h → { hour12, isPM }
const to12h = (h24: number) => {
  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { h12, isPM };
};
// { hour12, isPM } → 24h
const to24h = (h12: number, isPM: boolean) => {
  if (!isPM && h12 === 12) return 0;
  if (isPM && h12 !== 12) return h12 + 12;
  return h12;
};

interface TimeWheelPickerModalProps {
  visible: boolean;
  hour: number;
  minute: number;
  title?: string;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
}

const TimeWheelPickerModal = ({ visible, hour, minute, title, onConfirm, onCancel }: TimeWheelPickerModalProps) => {
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);
  const ampmRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_SLIDE_AMOUNT)).current;
  const [rendered, setRendered] = useState(false);

  const init12 = to12h(hour);
  const [tempHour12, setTempHour12] = useState(init12.h12);
  const [tempMinute, setTempMinute] = useState(minute);
  const [tempIsPM, setTempIsPM] = useState(init12.isPM);

  useEffect(() => {
    if (visible) {
      const { h12, isPM } = to12h(hour);
      setTempHour12(h12);
      setTempIsPM(isPM);
      const rounded = TIME_MINUTES.reduce((prev, curr) =>
        Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev, 0);
      setTempMinute(rounded);
      const hIdx = TIME_HOURS_12.indexOf(h12);
      const mIdx = TIME_MINUTES.indexOf(rounded);
      const aIdx = isPM ? 1 : 0;
      setRendered(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      setTimeout(() => {
        hourRef.current?.scrollTo({ y: Math.max(0, hIdx) * WHEEL_ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: Math.max(0, mIdx) * WHEEL_ITEM_HEIGHT, animated: false });
        ampmRef.current?.scrollTo({ y: aIdx * WHEEL_ITEM_HEIGHT, animated: false });
      }, 80);
    } else if (rendered) {
      Animated.timing(slideAnim, {
        toValue: SHEET_SLIDE_AMOUNT,
        duration: 240,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [visible]);

  const handleHourScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    setTempHour12(TIME_HOURS_12[Math.max(0, Math.min(idx, 11))]);
  };
  const handleMinuteScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    setTempMinute(TIME_MINUTES[Math.max(0, Math.min(idx, TIME_MINUTES.length - 1))]);
  };
  const handleAmpmScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    setTempIsPM(Math.max(0, Math.min(idx, 1)) === 1);
  };

  const padding = Math.floor(WHEEL_VISIBLE_ITEMS / 2) * WHEEL_ITEM_HEIGHT;
  const containerHeight = WHEEL_VISIBLE_ITEMS * WHEEL_ITEM_HEIGHT;

  if (!rendered) return null;

  return (
    <View style={wheelStyles.overlay}>
      <TouchableOpacity style={wheelStyles.backdrop} activeOpacity={1} onPress={onCancel} />
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <BlurView intensity={65} tint="light" style={wheelStyles.sheet}>
          <View style={wheelStyles.header}>
            <TouchableOpacity onPress={onCancel} style={wheelStyles.headerBtn}>
              <Text style={wheelStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {title ? <Text style={wheelStyles.title}>{title}</Text> : <View style={wheelStyles.headerBtn} />}
            <TouchableOpacity
              onPress={() => onConfirm(to24h(tempHour12, tempIsPM), tempMinute)}
              style={wheelStyles.headerBtn}
            >
              <Text style={wheelStyles.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={[wheelStyles.wheelContainer, { height: containerHeight, flexDirection: 'row' }]}>
            <View style={[wheelStyles.selectionIndicator, { top: padding, height: WHEEL_ITEM_HEIGHT }]} pointerEvents="none" />
            {/* Hours */}
            <ScrollView
              ref={hourRef}
              style={{ flex: 2 }}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleHourScroll}
              onScrollEndDrag={handleHourScroll}
              contentContainerStyle={{ paddingVertical: padding }}
            >
              {TIME_HOURS_12.map((h) => (
                <View key={h} style={[wheelStyles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                  <Text style={[wheelStyles.wheelItemText, h === tempHour12 && wheelStyles.wheelItemTextSelected]}>
                    {String(h).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </ScrollView>
            {/* Colon */}
            <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: '#111827' }}>:</Text>
            </View>
            {/* Minutes */}
            <ScrollView
              ref={minuteRef}
              style={{ flex: 2 }}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMinuteScroll}
              onScrollEndDrag={handleMinuteScroll}
              contentContainerStyle={{ paddingVertical: padding }}
            >
              {TIME_MINUTES.map((m) => (
                <View key={m} style={[wheelStyles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                  <Text style={[wheelStyles.wheelItemText, m === tempMinute && wheelStyles.wheelItemTextSelected]}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </ScrollView>
            {/* AM / PM */}
            <View style={{ width: 8 }} />
            <ScrollView
              ref={ampmRef}
              style={{ flex: 2 }}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleAmpmScroll}
              onScrollEndDrag={handleAmpmScroll}
              contentContainerStyle={{ paddingVertical: padding }}
            >
              {TIME_AMPM.map((ap) => (
                <View key={ap} style={[wheelStyles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                  <Text style={[
                    wheelStyles.wheelItemText,
                    (ap === 'PM') === tempIsPM && wheelStyles.wheelItemTextSelected,
                  ]}>
                    {ap}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

export default function PartTimeTimesheet() {
  const router = useRouter();
  const { user } = useAuth();
  const { projects } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dutySuggestIndex, setDutySuggestIndex] = useState<number | null>(null);
  const suppressBlurRef = useRef(false);

  const getDutySuggestions = (text: string): string[] => {
    if (!text.trim()) return [];
    const lower = text.toLowerCase();
    return projects
      .filter(p => p.name.toLowerCase().includes(lower))
      .slice(0, 3)
      .map(p => p.name);
  };

  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateWorkedHours = (entry: TimesheetEntry): number => {
    if (entry.period === 'full') return 8.5;
    if (entry.period === 'am' || entry.period === 'pm') return 4;
    if (entry.period === 'other' && entry.custom_start_time && entry.custom_end_time) {
      const start = new Date(`2000-01-01T${entry.custom_start_time}`);
      const end = new Date(`2000-01-01T${entry.custom_end_time}`);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
    return 0;
  };

  const roundToHalfHour = (hours: number): number => {
    return Math.round(hours * 2) / 2;
  };

  const roundToTenth = (hours: number): number => {
    return Math.round(hours * 10) / 10;
  };

  const isHalfHourIncrement = (hours: number): boolean => {
    return Number.isFinite(hours) && Math.abs(hours * 2 - Math.round(hours * 2)) < 0.0001;
  };

  const isTenthHourIncrement = (hours: number): boolean => {
    return Number.isFinite(hours) && Math.abs(hours * 10 - Math.round(hours * 10)) < 0.001;
  };

  const parseDutyPayload = (dutyRaw: string | null | undefined): DutyAllocation[] => {
    if (!dutyRaw || !dutyRaw.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(dutyRaw) as StoredDutyPayload;
      if (parsed?.version === 1 && Array.isArray(parsed.duties)) {
        const normalized = parsed.duties
          .filter(item => typeof item?.duty === 'string' && typeof item?.hours === 'number')
          .map(item => ({
            duty: item.duty.trim(),
            hours: roundToHalfHour(item.hours),
          }))
          .filter(item => item.duty.length > 0 && item.hours > 0);

        if (normalized.length > 0) {
          return normalized;
        }
      }
    } catch {
      // Legacy plain-text duty format
    }

    return [{ duty: dutyRaw.trim(), hours: 0 }];
  };

  const getWorkedHoursFromForm = (): number => {
    if (selectedPeriod === 'full') return 8.5;
    if (selectedPeriod === 'am' || selectedPeriod === 'pm') return 4;
    if (selectedPeriod === 'other') {
      const start = new Date(`2000-01-01T${customStartTime.toTimeString().split(' ')[0]}`);
      const end = new Date(`2000-01-01T${customEndTime.toTimeString().split(' ')[0]}`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return Math.max(0, diff);
    }
    return 0;
  };

  const resolveEntryDuties = (entry: TimesheetEntry): DutyAllocation[] => {
    const parsed = parseDutyPayload(entry.duty);
    if (parsed.length === 0) {
      return [];
    }

    if (parsed.length === 1 && parsed[0].hours <= 0) {
      return [{
        duty: parsed[0].duty,
        hours: roundToHalfHour(calculateWorkedHours(entry)),
      }];
    }

    return parsed;
  };

  const formatDutyText = (entry: TimesheetEntry): string | null => {
    const duties = resolveEntryDuties(entry);
    if (duties.length === 0) {
      return null;
    }
    return duties.map(item => `${item.duty} (${item.hours.toFixed(1)}h)`).join(', ');
  };

  const isFullDay = (entry: TimesheetEntry): boolean => {
    if (entry.period === 'full') return true;
    if (entry.period === 'other') {
      return calculateWorkedHours(entry) >= 8;
    }
    return false;
  };

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('full');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [dutyAllocations, setDutyAllocations] = useState<DutyAllocationInput[]>([{ duty: '', hours: '' }]);
  const [customStartTime, setCustomStartTime] = useState(new Date());
  const [customEndTime, setCustomEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTimeWheelPicker, setShowTimeWheelPicker] = useState(false);
  const [timeWheelTarget, setTimeWheelTarget] = useState<'start' | 'end' | null>(null);

  const openTimePicker = (target: 'start' | 'end') => {
    setTimeWheelTarget(target);
    setShowTimeWheelPicker(true);
  };

  const handleTimeConfirm = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (timeWheelTarget === 'end') {
      const startMins = customStartTime.getHours() * 60 + customStartTime.getMinutes();
      const endMins = h * 60 + m;
      if (endMins <= startMins) {
        Alert.alert('Invalid Time', 'End time must be later than start time.');
        setShowTimeWheelPicker(false);
        setTimeWheelTarget(null);
        return;
      }
    }
    if (timeWheelTarget === 'start') setCustomStartTime(d);
    else if (timeWheelTarget === 'end') setCustomEndTime(d);
    setShowTimeWheelPicker(false);
    setTimeWheelTarget(null);
  };
  const resetDutyAllocations = () => {
    setDutyAllocations([{ duty: '', hours: '' }]);
  };

  const addDutyAllocationInput = () => {
    setDutyAllocations(prev => {
      if (prev.length >= MAX_DUTY_COUNT) {
        return prev;
      }
      return [...prev, { duty: '', hours: '' }];
    });
  };

  const updateDutyText = (index: number, text: string) => {
    setDutyAllocations(prev => prev.map((item, itemIndex) =>
      itemIndex === index ? { ...item, duty: text } : item
    ));
  };

  const updateDutyHours = (index: number, value: string) => {
    // Allow digits, one optional dot, and at most one digit after the dot
    const sanitized = value.match(/^\d*\.?\d?/)?.[0] ?? '';
    setDutyAllocations(prev => prev.map((item, itemIndex) =>
      itemIndex === index ? { ...item, hours: sanitized } : item
    ));
  };

  const removeDutyAllocationInput = (index: number) => {
    if (index === 0) return;
    setDutyAllocations(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const getManualDutyHoursTotal = (): number => {
    return dutyAllocations.slice(1).reduce((sum, allocation) => {
      if (!allocation.duty.trim()) return sum;
      const parsed = parseFloat(allocation.hours);
      if (!Number.isFinite(parsed) || parsed <= 0) return sum;
      return sum + parsed;
    }, 0);
  };

  const getFirstDutyAutoHours = (): number => {
    const totalWorkedHours = getWorkedHoursFromForm();
    const remaining = totalWorkedHours - getManualDutyHoursTotal();
    return Math.max(0, roundToTenth(remaining));
  };

  const toDutyPayloadForSave = (): { value: string | null; error: string | null } => {
    const totalWorkedHours = getWorkedHoursFromForm();

    if (totalWorkedHours <= 0) {
      return { value: null, error: 'Work time must be greater than 0 hour.' };
    }

    const normalizedInputs = dutyAllocations.map(item => ({
      duty: item.duty.trim(),
      hours: item.hours.trim(),
    }));

    const nonEmpty = normalizedInputs
      .map((item, index) => ({ ...item, index }))
      .filter(item => item.duty.length > 0);

    if (nonEmpty.length === 0) {
      return { value: null, error: null };
    }

    if (nonEmpty.length > 1 && !normalizedInputs[0].duty) {
      return { value: null, error: 'Please fill the first duty before adding another duty.' };
    }

    if (nonEmpty.length === 1) {
      const payload: StoredDutyPayload = {
        version: 1,
        duties: [{
          duty: nonEmpty[0].duty,
          hours: roundToTenth(totalWorkedHours),
        }],
      };
      return { value: JSON.stringify(payload), error: null };
    }

    let manualHoursTotal = 0;
    const additionalDuties: DutyAllocation[] = [];

    for (const dutyInput of nonEmpty) {
      if (dutyInput.index === 0) continue;

      const parsedHours = parseFloat(dutyInput.hours);
      if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
        return {
          value: null,
          error: `Please enter allocated hours for Duty ${dutyInput.index + 1}.`,
        };
      }

      if (!isTenthHourIncrement(parsedHours)) {
        return {
          value: null,
          error: `Duty ${dutyInput.index + 1} hours must be in 0.1-hour increments.`,
        };
      }

      manualHoursTotal += parsedHours;
      additionalDuties.push({
        duty: dutyInput.duty,
        hours: roundToTenth(parsedHours),
      });
    }

    if (manualHoursTotal >= totalWorkedHours) {
      return {
        value: null,
        error: 'Allocated duty hours must be less than total work time so Duty 1 can have remaining hours.',
      };
    }

    const firstDutyHours = roundToTenth(totalWorkedHours - manualHoursTotal);
    if (firstDutyHours <= 0) {
      return {
        value: null,
        error: 'Duty 1 must have at least 0.1 hour allocated.',
      };
    }

    const payload: StoredDutyPayload = {
      version: 1,
      duties: [
        {
          duty: normalizedInputs[0].duty,
          hours: firstDutyHours,
        },
        ...additionalDuties,
      ],
    };

    return { value: JSON.stringify(payload), error: null };
  };

  const canAddDutyInput = dutyAllocations.length < MAX_DUTY_COUNT
    && dutyAllocations[dutyAllocations.length - 1].duty.trim().length > 0;

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [selectedWorkerForSalary, setSelectedWorkerForSalary] = useState<string>('Kobe');
  const [salaryCalculationType, setSalaryCalculationType] = useState<'total' | 'confirmed'>('total');
  const [showSalaryDetail, setShowSalaryDetail] = useState(false);
  const [salaryDetailAnim] = useState(new Animated.Value(800));

  const toggleSalaryDetail = (show: boolean) => {
    setShowSalaryDetail(show);
    Animated.timing(salaryDetailAnim, {
      toValue: show ? 0 : 800,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding for days before month starts (Sunday = 0, Monday = 1, etc.)
    const firstDayOfWeek = firstDay.getDay();
    const startPadding = firstDayOfWeek;

    for (let i = startPadding; i > 0; i--) {
      const paddingDay = new Date(year, month, 1 - i);
      days.push(paddingDay);
    }

    // Add all days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add padding for days after month ends (to complete the week, starting Sunday)
    const lastDayOfWeek = lastDay.getDay();
    const endPadding = lastDayOfWeek === 6 ? 0 : 6 - lastDayOfWeek;

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

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsAdmin(profileData?.role === 'admin');

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

    if (selectedVenue === 'Site' && !siteName.trim()) {
      Alert.alert('Required', 'Please enter the site name');
      return;
    }

    const dateStr = formatDateToLocalString(selectedDate);

    const timesheetData: any = {
      worker_name: selectedMember,
      work_date: dateStr,
      period: selectedPeriod,
      location: selectedVenue.toLowerCase(),
      duty: null,
    };

    const dutyPayload = toDutyPayloadForSave();
    if (dutyPayload.error) {
      Alert.alert('Invalid Duty Allocation', dutyPayload.error);
      return;
    }
    timesheetData.duty = dutyPayload.value;

    if (selectedVenue === 'Site') {
      timesheetData.site_name = siteName.trim();
    }

    if (selectedPeriod === 'other') {
      if (customEndTime <= customStartTime) {
        Alert.alert('Invalid Time', 'End time must be later than start time.');
        return;
      }
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
    setSiteName('');
    resetDutyAllocations();
    loadData();
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setSelectedMember(entry.worker_name);
    setSelectedPeriod(entry.period);
    
    // Capitalize the location to match the venue button labels
    const location = entry.location || '';
    const capitalizedLocation = location.charAt(0).toUpperCase() + location.slice(1);
    setSelectedVenue(capitalizedLocation);
    
    // Load site name if it's a site location
    if (entry.location === 'site' && entry.site_name) {
      setSiteName(entry.site_name);
    } else {
      setSiteName('');
    }
    
    const parsedDuties = resolveEntryDuties(entry);
    if (parsedDuties.length === 0) {
      resetDutyAllocations();
    } else {
      setDutyAllocations(parsedDuties.slice(0, MAX_DUTY_COUNT).map((item, index) => ({
        duty: item.duty,
        hours: index === 0 ? '' : item.hours.toString(),
      })));
    }

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
      duty: null,
    };

    const dutyPayload = toDutyPayloadForSave();
    if (dutyPayload.error) {
      Alert.alert('Invalid Duty Allocation', dutyPayload.error);
      return;
    }
    timesheetData.duty = dutyPayload.value;

    if (selectedVenue === 'Site') {
      timesheetData.site_name = siteName.trim();
    } else {
      timesheetData.site_name = null;
    }

    if (selectedPeriod === 'other') {
      if (customEndTime <= customStartTime) {
        Alert.alert('Invalid Time', 'End time must be later than start time.');
        return;
      }
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
      case 'other': return 'Other';
    }
  };

  const getPeriodColor = (period: Period, entry?: TimesheetEntry) => {
    // If it's a full day period, show green
    if (period === 'full') return '#10B981';
    
    // If it's 'other' period, check if it's 8+ hours (full day equivalent)
    if (period === 'other' && entry && isFullDay(entry)) return '#10B981';
    
    // Otherwise use period-specific colors
    switch (period) {
      case 'am': return '#EF4444';     // Red
      case 'pm': return '#3B82F6';     // Blue
      case 'other': return '#9CA3AF';  // Grey
      default: return '#9CA3AF';
    }
  };

  const formatLocation = (location: string | null) => {
    if (!location) return '';
    if (location === 'polyu') return 'PolyU';
    return location.charAt(0).toUpperCase() + location.slice(1);
  };

  const getShapeStyle = (location: string | null) => {
    switch (location?.toLowerCase()) {
      case 'polyu':
        return styles.symbolSquare;    // Square for PolyU
      case 'site':
        return styles.symbolTriangle;  // Triangle for Site (overridden by TriangleShape)
      default:
        return styles.symbolCircle;    // Circle for Office
    }
  };

  const handleToggleConfirmation = async (entryId: string, currentConfirmed: boolean) => {
    const { error } = await supabase
      .from('timesheets')
      .update({ confirmed: !currentConfirmed })
      .eq('id', entryId);

    if (error) {
      console.error('Error updating confirmation status:', error);
      Alert.alert('Error', 'Failed to update confirmation status');
    } else {
      // Update local state
      setTimesheets(timesheets.map(entry => 
        entry.id === entryId ? { ...entry, confirmed: !currentConfirmed } : entry
      ));
    }
  };

  const calculateWorkerHours = (workerName: string, type: 'total' | 'confirmed') => {
    let totalHours = 0;
    timesheets.forEach(entry => {
      if (entry.worker_name === workerName) {
        // If calculating confirmed hours, skip if not confirmed
        if (type === 'confirmed' && !entry.confirmed) return;
        
        totalHours += calculateWorkedHours(entry);
      }
    });
    return totalHours;
  };

  const calculateSalary = () => {
    const hours = calculateWorkerHours(selectedWorkerForSalary, salaryCalculationType);
    return hours * 70; // HKD 70 per hour
  };

  const handleDownloadCSV = async () => {
    try {
      const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Build a column-block for each worker: array of rows, each row = 3 cells
      const workerBlocks: (string | number)[][][] = TEAM_MEMBERS.map(worker => {
        const entries = timesheets
          .filter(e => e.worker_name === worker)
          .filter(e => salaryCalculationType === 'total' || e.confirmed)
          .sort((a, b) => a.work_date.localeCompare(b.work_date));

        const block: (string | number)[][] = [];
        block.push([worker, '', '']);                          // row 0 — worker name (yellow)
        block.push(['Date', 'Hours', 'Amount (HKD)']);        // row 1 — column headers

        entries.forEach(entry => {
          const dateStr = new Date(entry.work_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          const hours = calculateWorkedHours(entry);
          block.push([dateStr, parseFloat(hours.toFixed(1)), parseFloat((hours * 70).toFixed(1))]);
        });

        const totalHours = calculateWorkerHours(worker, salaryCalculationType);
        block.push(['Total', parseFloat(totalHours.toFixed(1)), parseFloat((totalHours * 70).toFixed(1))]);

        // Duty summary
        const dutyMap: Record<string, number> = {};
        entries.forEach(entry => {
          resolveEntryDuties(entry).forEach(d => {
            dutyMap[d.duty] = (dutyMap[d.duty] || 0) + d.hours;
          });
        });
        const duties = Object.entries(dutyMap);
        if (duties.length > 0) {
          block.push(['', '', '']);
          block.push(['Duty Summary', '', '']);
          block.push(['Duty', 'Total Hours', '']);
          duties.forEach(([name, hrs]) => {
            block.push([name, parseFloat(roundToTenth(hrs).toFixed(1)), '']);
          });
        }

        return block;
      });

      // Combine blocks side-by-side with a blank separator column between each
      const maxRows = Math.max(...workerBlocks.map(b => b.length));
      const combined: (string | number)[][] = [];
      for (let r = 0; r < maxRows; r++) {
        const row: (string | number)[] = [];
        workerBlocks.forEach((block, wi) => {
          if (wi > 0) row.push('');                   // blank separator column
          const cells = block[r] ?? ['', '', ''];
          row.push(...cells);
        });
        combined.push(row);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(combined);

      // Yellow fill on worker name cells (row 0, each worker's first column)
      const yellowStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FFFF00' } }, font: { bold: true, sz: 12 } };
      TEAM_MEMBERS.forEach((_, wi) => {
        const col = wi * 4; // cols 0, 4, 8 (3 data cols + 1 separator)
        const ref = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[ref]) ws[ref].s = yellowStyle;
      });

      // Column widths
      const colWidths: { wch: number }[] = [];
      TEAM_MEMBERS.forEach((_, wi) => {
        const offset = wi * 4;
        colWidths[offset]     = { wch: 18 }; // Date / Duty name
        colWidths[offset + 1] = { wch: 10 }; // Hours
        colWidths[offset + 2] = { wch: 14 }; // Amount
        if (wi < TEAM_MEMBERS.length - 1) colWidths[offset + 3] = { wch: 3 }; // separator
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, monthLabel);

      const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true }) as ArrayBuffer;
      const uint8 = new Uint8Array(wbArray);

      const fileName = `salary_breakdown_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
      const file = new FSFile(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(uint8);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Salary Breakdown',
        });
      } else {
        Alert.alert('Saved', `File saved to:\n${file.uri}`);
      }
    } catch (error: any) {
      console.error('CSV export error:', error);
      Alert.alert('Error', 'Failed to export file.');
    }
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#2563EB" size={24} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Part Time Timesheet</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNavigator}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText style={styles.monthLabel}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </ThemedText>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View>
        {/* Calendar */}
        <View style={styles.calendar}>
          {/* Day headers */}
          <View style={styles.weekDaysHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <View key={day} style={styles.weekDayCell}>
                <ThemedText style={styles.weekDayText}>{day}</ThemedText>
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
                  <ThemedText style={[
                    styles.calendarDayNumber,
                    !isCurrentMonthDay && styles.calendarDayNumberOtherMonth,
                    isToday && styles.calendarDayNumberToday,
                    isSelected && styles.calendarDayNumberSelected,
                  ]}>
                    {date.getDate()}
                  </ThemedText>

                  {/* Show entries */}
                  {entries.length > 0 && (
                    <View style={styles.entriesContainer}>
                      {entries.map(entry => {
                        const workerInfo = WORKER_SYMBOLS[entry.worker_name as keyof typeof WORKER_SYMBOLS];
                        const periodColor = getPeriodColor(entry.period, entry);
                        const isTriangleShape = entry.location?.toLowerCase() === 'site';
                        const shapeStyle = getShapeStyle(entry.location);
                        
                        if (isTriangleShape) {
                          return (
                            <View
                              key={entry.id}
                              style={[
                                styles.workerSymbol,
                                styles.triangleContainer,
                              ]}
                            >
                              <TriangleShape color={periodColor} confirmed={entry.confirmed} />
                              <ThemedText style={[styles.symbolText, styles.symbolTextOverlay]}>
                                {workerInfo?.symbol || entry.worker_name.charAt(0)}
                              </ThemedText>
                            </View>
                          );
                        }
                        
                        return (
                          <View
                            key={entry.id}
                            style={[
                              styles.workerSymbol,
                              shapeStyle,
                              { backgroundColor: periodColor },
                              entry.confirmed && styles.confirmedSymbol
                            ]}
                          >
                            <ThemedText style={styles.symbolText}>
                              {workerInfo?.symbol || entry.worker_name.charAt(0)}
                            </ThemedText>
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
              <ThemedText style={styles.detailsTitle}>
                {selectedCalendarDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedCalendarDate(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {getEntriesForDate(selectedCalendarDate).length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>No work scheduled for this day</ThemedText>
              </View>
            ) : (
              <View style={styles.detailsList}>
                {getEntriesForDate(selectedCalendarDate).map(entry => {
                  const workerInfo = WORKER_SYMBOLS[entry.worker_name as keyof typeof WORKER_SYMBOLS];
                  const periodColor = getPeriodColor(entry.period, entry);
                  return (
                    <View key={entry.id} style={styles.detailCard}>
                      <View style={styles.detailCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={[styles.detailWorkerSymbol, { backgroundColor: periodColor }]}>
                            <ThemedText style={styles.detailSymbolText}>
                              {workerInfo?.symbol || entry.worker_name.charAt(0)}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.detailWorkerName}>{entry.worker_name}</ThemedText>
                        </View>
                        <View style={styles.detailCardActions}>
                          {!entry.confirmed && (
                            <>
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
                            </>
                          )}
                        </View>
                      </View>
                      <View style={styles.detailCardContent}>
                        <View style={styles.detailRow}>
                          <ThemedText style={styles.detailLabel}>Period:</ThemedText>
                          <ThemedText style={styles.detailValue}>
                            {entry.period === 'other' && entry.custom_start_time && entry.custom_end_time
                              ? `${entry.custom_start_time.substring(0, 5)} - ${entry.custom_end_time.substring(0, 5)}`
                              : getPeriodLabel(entry.period, entry)
                            }
                          </ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText style={styles.detailLabel}>Site:</ThemedText>
                          <ThemedText style={styles.detailValue}>
                            {entry.location === 'site' 
                              ? (entry.site_name || 'Site')
                              : formatLocation(entry.location)
                            }
                          </ThemedText>
                        </View>
                        {formatDutyText(entry) && (
                          <View style={styles.detailRow}>
                            <ThemedText style={styles.detailLabel}>Duty:</ThemedText>
                            <ThemedText style={styles.detailValue}>{formatDutyText(entry)}</ThemedText>
                          </View>
                        )}
                        {isAdmin && (
                          <View style={styles.adminConfirmationRow}>
                            <TouchableOpacity 
                              style={styles.confirmCheckbox}
                              onPress={() => handleToggleConfirmation(entry.id, entry.confirmed || false)}
                            >
                              {entry.confirmed ? (
                                <ThemedText style={styles.checkboxChecked}>✓</ThemedText>
                              ) : (
                                <ThemedText style={styles.checkboxUnchecked}></ThemedText>
                              )}
                            </TouchableOpacity>
                            <ThemedText style={styles.confirmLabel}>
                              {entry.confirmed ? 'Confirmed' : 'Confirm Attendance'}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Add New Work Time Button */}
            <TouchableOpacity
              style={styles.addNewWorkTimeButton}
              onPress={() => {
                setSelectedMember('');
                setSelectedDate(selectedCalendarDate || new Date());
                setSelectedPeriod('full');
                setSelectedVenue('');
                resetDutyAllocations();
                setSiteName('');
                setShowAddModal(true);
              }}
            >
              <Plus size={20} color="#FFFFFF" />
              <ThemedText style={styles.addNewWorkTimeText}>Add Work Time</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <ThemedText style={styles.legendTitle}>Workers</ThemedText>
          <View style={styles.legendItems}>
            {Object.entries(WORKER_SYMBOLS).map(([name, info]) => (
              <View key={name} style={styles.legendItem}>
                <View style={[styles.legendSymbol, { backgroundColor: '#9CA3AF' }]}>
                  <ThemedText style={styles.legendSymbolText}>{info.symbol}</ThemedText>
                </View>
                <ThemedText style={styles.legendText}>{name}</ThemedText>
              </View>
            ))}
          </View>

          <ThemedText style={[styles.legendTitle, { marginTop: 16 }]}>Period Colors</ThemedText>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#EF4444' }]}>
                <ThemedText style={styles.legendSymbolText}>AM</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>10am-2pm</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#3B82F6' }]}>
                <ThemedText style={styles.legendSymbolText}>PM</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>2pm-6:30pm</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, { backgroundColor: '#10B981' }]}>
                <ThemedText style={styles.legendSymbolText}>F</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>Full Day</ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.legendTitle, { marginTop: 16 }]}>Location Shapes</ThemedText>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText style={styles.legendSymbolText}>O</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>Office</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSymbol, styles.symbolSquare, { backgroundColor: '#9CA3AF' }]}>
                <ThemedText style={styles.legendSymbolText}>P</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>PolyU</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSiteSymbol, { backgroundColor: 'transparent' }]}>
                <View style={styles.legendSiteIconScale}>
                  <TriangleShape color="#9CA3AF" />
                </View>
                <ThemedText style={styles.legendSiteSymbolText}>S</ThemedText>
              </View>
              <ThemedText style={styles.legendText}>Site</ThemedText>
            </View>
          </View>
        </View>

        {/* Salary Calculator */}
        <View style={styles.salaryCalculatorSection}>
          <View style={styles.salaryHeaderRow}>
            <ThemedText style={styles.salaryTitle}>Salary Calculator</ThemedText>
            <TouchableOpacity 
              onPress={() => toggleSalaryDetail(true)}
              style={styles.salaryInfoButton}
            >
              <Info size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          {/* Worker Selection */}
          <View style={styles.salaryGroup}>
            <ThemedText style={styles.salaryLabel}>Select Worker</ThemedText>
            <View style={styles.workerSelectionButtons}>
              {TEAM_MEMBERS.filter(member => isAdmin || member !== 'Kobe').map(member => (
                <TouchableOpacity
                  key={member}
                  style={[
                    styles.workerSelectionButton,
                    selectedWorkerForSalary === member && styles.workerSelectionButtonSelected
                  ]}
                  onPress={() => setSelectedWorkerForSalary(member)}
                >
                  <ThemedText style={[
                    styles.workerSelectionButtonText,
                    selectedWorkerForSalary === member && styles.workerSelectionButtonTextSelected
                  ]}>
                    {member}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hour Type Selection */}
          <View style={styles.salaryGroup}>
            <ThemedText style={styles.salaryLabel}>Calculate</ThemedText>
            <View style={styles.hourTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.hourTypeButton,
                  salaryCalculationType === 'total' && styles.hourTypeButtonSelected
                ]}
                onPress={() => setSalaryCalculationType('total')}
              >
                <ThemedText style={[
                  styles.hourTypeButtonText,
                  salaryCalculationType === 'total' && styles.hourTypeButtonTextSelected
                ]}>
                  Total Hours
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.hourTypeButton,
                  salaryCalculationType === 'confirmed' && styles.hourTypeButtonSelected
                ]}
                onPress={() => setSalaryCalculationType('confirmed')}
              >
                <ThemedText style={[
                  styles.hourTypeButtonText,
                  salaryCalculationType === 'confirmed' && styles.hourTypeButtonTextSelected
                ]}>
                  Confirmed Hours
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Salary Display */}
          <View style={styles.salaryResultBox}>
            <View style={styles.salaryResultRow}>
              <ThemedText style={styles.salaryResultLabel}>Total Hours:</ThemedText>
              <ThemedText style={styles.salaryResultValue}>
                {calculateWorkerHours(selectedWorkerForSalary, salaryCalculationType).toFixed(1)} hrs
              </ThemedText>
            </View>
            <View style={[styles.salaryResultRow, styles.salaryResultRowBorder]}>
              <ThemedText style={styles.salaryTotalLabel}>Total Salary:</ThemedText>
              <ThemedText style={styles.salaryTotalValue}>
                HKD ${calculateSalary().toFixed(1)}
              </ThemedText>
            </View>
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
            <ThemedText style={styles.modalTitle}>Add Work Time</ThemedText>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              setSelectedMember('');
              setSelectedDate(selectedCalendarDate || new Date());
              setSelectedPeriod('full');
              setSelectedVenue('');
              resetDutyAllocations();
              setSiteName('');
            }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Team Member Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Team Member *</ThemedText>
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
                    <ThemedText style={[
                      styles.memberButtonText,
                      selectedMember === member && styles.memberButtonTextSelected
                    ]}>
                      {member}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Venue Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Venue *</ThemedText>
              <View style={styles.memberButtons}>
                {VENUES.map(venue => (
                  <TouchableOpacity
                    key={venue}
                    style={[
                      styles.memberButton,
                      selectedVenue === venue && styles.memberButtonSelected
                    ]}
                    onPress={() => {
                      setSelectedVenue(venue);
                      if (venue !== 'Site') {
                        setSiteName('');
                      }
                    }}
                  >
                    <ThemedText style={[
                      styles.memberButtonText,
                      selectedVenue === venue && styles.memberButtonTextSelected
                    ]}>
                      {venue}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Site Name Input */}
            {selectedVenue === 'Site' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Site Name *</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter site name"
                  value={siteName}
                  onChangeText={setSiteName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {/* Duty Input */}
            <View style={styles.formGroup}>
              <View style={styles.dutyHeaderRow}>
                <ThemedText style={styles.formLabel}>Duty (Optional, max 3)</ThemedText>
                {canAddDutyInput && (
                  <TouchableOpacity style={styles.addDutyInputButton} onPress={addDutyAllocationInput}>
                    <Plus size={16} color="#2563EB" />
                  </TouchableOpacity>
                )}
              </View>

              {dutyAllocations.map((allocation, index) => (
                <View key={`add-duty-${index}`}>
                  <View style={styles.dutyInputRow}>
                    <TextInput
                      style={[styles.textInput, styles.dutyTextInput]}
                      placeholder={`Enter duty/task ${index + 1}`}
                      value={allocation.duty}
                      onChangeText={(text) => updateDutyText(index, text)}
                      onFocus={() => setDutySuggestIndex(index)}
                      onBlur={() => {
                        if (suppressBlurRef.current) {
                          suppressBlurRef.current = false;
                          return;
                        }
                        setDutySuggestIndex(null);
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {index === 0 ? (
                      <View style={styles.autoDutyHoursBadge}>
                        <ThemedText style={styles.autoDutyHoursText}>{getFirstDutyAutoHours().toFixed(1)}hrs</ThemedText>
                      </View>
                    ) : (
                      <>
                        <View style={[styles.dutyHoursSelector, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }]}>
                          <TextInput
                            style={{ flex: 1, textAlign: 'center', fontSize: 14, color: '#111827' }}
                            value={allocation.hours}
                            onChangeText={(text) => updateDutyHours(index, text)}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="done"
                          />
                          <Text style={{ fontSize: 14, color: '#000000' }}>hrs</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeDutyButton}
                          onPress={() => removeDutyAllocationInput(index)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  {dutySuggestIndex === index && getDutySuggestions(allocation.duty).length > 0 && (
                    <View
                      style={styles.dutySuggestionList}
                      onTouchStart={() => { suppressBlurRef.current = true; }}
                    >
                      {getDutySuggestions(allocation.duty).map((name) => (
                        <TouchableOpacity
                          key={name}
                          style={styles.dutySuggestionItem}
                          onPress={() => { updateDutyText(index, name); setDutySuggestIndex(null); }}
                        >
                          <Text style={styles.dutySuggestionText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              <ThemedText style={styles.dutyHintText}>
                Total: {getWorkedHoursFromForm().toFixed(1)}hrs • Allocated: {(
                  (dutyAllocations[0]?.duty.trim() ? getFirstDutyAutoHours() : 0) + getManualDutyHoursTotal()
                ).toFixed(1)}hrs
              </ThemedText>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Date</ThemedText>
              <View style={[styles.dateButton, { opacity: 0.6 }]}>
                <ThemedText style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </ThemedText>
              </View>
            </View>

            {/* Period Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Period *</ThemedText>
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
                    <ThemedText style={[
                      styles.periodButtonText,
                      selectedPeriod === option.value && styles.periodButtonTextSelected
                    ]}>
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time Selection */}
            {selectedPeriod === 'other' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Custom Time</ThemedText>
                <View style={styles.timeRow}>
                  <View style={styles.timeInputContainer}>
                    <ThemedText style={styles.timeLabel}>From</ThemedText>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openTimePicker('start')}
                    >
                      <ThemedText style={styles.timeButtonText}>
                        {customStartTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeInputContainer}>
                    <ThemedText style={styles.timeLabel}>To</ThemedText>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openTimePicker('end')}
                    >
                      <ThemedText style={styles.timeButtonText}>
                        {customEndTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddTimesheet}
            >
              <ThemedText style={styles.saveButtonText}>Save Work Time</ThemedText>
            </TouchableOpacity>
          </ScrollView>

          <TimeWheelPickerModal
            visible={showTimeWheelPicker}
            hour={timeWheelTarget === 'start' ? customStartTime.getHours() : customEndTime.getHours()}
            minute={timeWheelTarget === 'start' ? customStartTime.getMinutes() : customEndTime.getMinutes()}
            title={timeWheelTarget === 'start' ? 'Start Time' : 'End Time'}
            onConfirm={handleTimeConfirm}
            onCancel={() => { setShowTimeWheelPicker(false); setTimeWheelTarget(null); }}
          />
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
            <ThemedText style={styles.modalTitle}>Edit Work Time</ThemedText>
            <TouchableOpacity onPress={() => {
              setShowEditModal(false);
              setEditingEntry(null);
              setSelectedMember('');
              setSelectedDate(new Date());
              setSelectedPeriod('full');
              setSelectedVenue('');
              resetDutyAllocations();
              setSiteName('');
            }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Team Member Display (Read-only) */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Team Member</ThemedText>
              <View style={styles.readOnlyField}>
                <ThemedText style={styles.readOnlyText}>{selectedMember}</ThemedText>
              </View>
            </View>

            {/* Venue Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Venue *</ThemedText>
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
                    <ThemedText style={[
                      styles.memberButtonText,
                      selectedVenue === venue && styles.memberButtonTextSelected
                    ]}>
                      {venue}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Site Name Input */}
            {selectedVenue === 'Site' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Site Name *</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter site name"
                  value={siteName}
                  onChangeText={setSiteName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {/* Duty Input */}
            <View style={styles.formGroup}>
              <View style={styles.dutyHeaderRow}>
                <ThemedText style={styles.formLabel}>Duty (Optional, max 3)</ThemedText>
                {canAddDutyInput && (
                  <TouchableOpacity style={styles.addDutyInputButton} onPress={addDutyAllocationInput}>
                    <Plus size={16} color="#2563EB" />
                  </TouchableOpacity>
                )}
              </View>

              {dutyAllocations.map((allocation, index) => (
                <View key={`edit-duty-${index}`}>
                  <View style={styles.dutyInputRow}>
                    <TextInput
                      style={[styles.textInput, styles.dutyTextInput]}
                      placeholder={`Enter duty/task ${index + 1}`}
                      value={allocation.duty}
                      onChangeText={(text) => updateDutyText(index, text)}
                      onFocus={() => setDutySuggestIndex(index)}
                      onBlur={() => {
                        if (suppressBlurRef.current) {
                          suppressBlurRef.current = false;
                          return;
                        }
                        setDutySuggestIndex(null);
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {index === 0 ? (
                      <View style={styles.autoDutyHoursBadge}>
                        <ThemedText style={styles.autoDutyHoursText}>{getFirstDutyAutoHours().toFixed(1)}hrs</ThemedText>
                      </View>
                    ) : (
                      <>
                        <View style={[styles.dutyHoursSelector, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }]}>
                          <TextInput
                            style={{ flex: 1, textAlign: 'center', fontSize: 14, color: '#111827' }}
                            value={allocation.hours}
                            onChangeText={(text) => updateDutyHours(index, text)}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor="#9CA3AF"
                            returnKeyType="done"
                          />
                          <Text style={{ fontSize: 14, color: '#000000' }}>hrs</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeDutyButton}
                          onPress={() => removeDutyAllocationInput(index)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  {dutySuggestIndex === index && getDutySuggestions(allocation.duty).length > 0 && (
                    <View
                      style={styles.dutySuggestionList}
                      onTouchStart={() => { suppressBlurRef.current = true; }}
                    >
                      {getDutySuggestions(allocation.duty).map((name) => (
                        <TouchableOpacity
                          key={name}
                          style={styles.dutySuggestionItem}
                          onPress={() => { updateDutyText(index, name); setDutySuggestIndex(null); }}
                        >
                          <Text style={styles.dutySuggestionText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              <ThemedText style={styles.dutyHintText}>
                Total: {getWorkedHoursFromForm().toFixed(1)}hrs • Allocated: {(
                  (dutyAllocations[0]?.duty.trim() ? getFirstDutyAutoHours() : 0) + getManualDutyHoursTotal()
                ).toFixed(1)}hrs
              </ThemedText>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Date</ThemedText>
              <View style={[styles.dateButton, { opacity: 0.6 }]}>
                <ThemedText style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </ThemedText>
              </View>
            </View>

            {/* Period Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Period *</ThemedText>
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
                    <ThemedText style={[
                      styles.periodButtonText,
                      selectedPeriod === option.value && styles.periodButtonTextSelected
                    ]}>
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time Selection */}
            {selectedPeriod === 'other' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Custom Time</ThemedText>
                <View style={styles.timeRow}>
                  <View style={styles.timeInputContainer}>
                    <ThemedText style={styles.timeLabel}>From</ThemedText>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openTimePicker('start')}
                    >
                      <ThemedText style={styles.timeButtonText}>
                        {customStartTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeInputContainer}>
                    <ThemedText style={styles.timeLabel}>To</ThemedText>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openTimePicker('end')}
                    >
                      <ThemedText style={styles.timeButtonText}>
                        {customEndTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Update Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateTimesheet}
            >
              <ThemedText style={styles.saveButtonText}>Update Work Time</ThemedText>
            </TouchableOpacity>
          </ScrollView>

          <TimeWheelPickerModal
            visible={showTimeWheelPicker}
            hour={timeWheelTarget === 'start' ? customStartTime.getHours() : customEndTime.getHours()}
            minute={timeWheelTarget === 'start' ? customStartTime.getMinutes() : customEndTime.getMinutes()}
            title={timeWheelTarget === 'start' ? 'Start Time' : 'End Time'}
            onConfirm={handleTimeConfirm}
            onCancel={() => { setShowTimeWheelPicker(false); setTimeWheelTarget(null); }}
          />
        </SafeAreaView>
      </Modal>

      {/* Salary Detail Panel */}
      <Animated.View
        style={[
          styles.salaryDetailOverlay,
          { transform: [{ translateX: salaryDetailAnim }] },
        ]}
      >
        <SafeAreaView style={styles.salaryDetailContainer}>
          <View style={styles.salaryDetailHeader}>
            <ThemedText style={styles.salaryDetailTitle}>
              {selectedWorkerForSalary} - Salary Breakdown
            </ThemedText>
            <View style={styles.salaryDetailHeaderActions}>
              <TouchableOpacity onPress={handleDownloadCSV} style={styles.downloadButton}>
                <Download size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleSalaryDetail(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.salaryDetailContent} showsVerticalScrollIndicator={false}>
            <View>
            {timesheets
              .filter(entry => entry.worker_name === selectedWorkerForSalary)
              .filter(entry => salaryCalculationType === 'total' || entry.confirmed)
              .map((entry, index) => (
                <View key={entry.id} style={styles.salaryDetailEntryContainer}>
                  <View style={styles.salaryDetailRow}>
                    <View style={styles.salaryDetailDateSection}>
                      <ThemedText style={styles.salaryDetailDate}>
                        {new Date(entry.work_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </ThemedText>
                    </View>
                    <View style={styles.salaryDetailHourSection}>
                      <ThemedText style={styles.salaryDetailHours}>
                        {calculateWorkedHours(entry).toFixed(1)} hrs
                      </ThemedText>
                    </View>
                    <View style={styles.salaryDetailAmountSection}>
                      <ThemedText style={styles.salaryDetailAmount}>
                        HKD ${(calculateWorkedHours(entry) * 70).toFixed(1)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}

            <View style={styles.salaryDetailSeparator} />

            <View style={styles.salaryDetailTotal}>
              <View>
                <ThemedText style={styles.salaryDetailTotalLabel}>Total Salary:</ThemedText>
                <ThemedText style={styles.salaryDetailTotalHours}>
                  {calculateWorkerHours(selectedWorkerForSalary, salaryCalculationType).toFixed(1)} hrs
                </ThemedText>
              </View>
              <ThemedText style={styles.salaryDetailTotalAmount}>
                HKD ${calculateSalary().toFixed(1)}
              </ThemedText>
            </View>

            {/* Duty Summary */}
            {(() => {
              const dutyMap: Record<string, number> = {};
              timesheets
                .filter(entry => entry.worker_name === selectedWorkerForSalary)
                .filter(entry => salaryCalculationType === 'total' || entry.confirmed)
                .forEach(entry => {
                  resolveEntryDuties(entry).forEach(d => {
                    dutyMap[d.duty] = (dutyMap[d.duty] || 0) + d.hours;
                  });
                });
              const duties = Object.entries(dutyMap);
              if (duties.length === 0) return null;
              return (
                <View style={styles.dutySummarySection}>
                  <ThemedText style={styles.dutySummaryTitle}>Duty Summary</ThemedText>
                  {duties.map(([name, hours]) => (
                    <View key={name} style={styles.dutySummaryRow}>
                      <ThemedText style={styles.dutySummaryName}>{name}</ThemedText>
                      <ThemedText style={styles.dutySummaryHours}>{roundToTenth(hours).toFixed(1)} hrs</ThemedText>
                    </View>
                  ))}
                </View>
              );
            })()}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerPlaceholder: {
    width: 40,
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
    textAlign: 'center',
    textAlignVertical: 'center',
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
    width: '100%',
  },
  calendarDay: {
    width: '14.28%', // Exactly 100/7 for 7 columns
    minWidth: 0, // Prevent overflow
    padding: 2,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    justifyContent: 'space-between',
    height: 56,
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
  confirmedSymbol: {
    borderWidth: 2,
    borderColor: '#334155',
    shadowColor: '#334155',
    shadowOpacity: 0.6,
  },
  symbolCircle: {
    borderRadius: 9,  // Circle
  },
  symbolSquare: {
    borderRadius: 2,  // Nearly square with slight rounded corners
  },
  symbolTriangle: {
    borderRadius: 0,
  },
  triangleContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starContainer: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  symbolText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  symbolTextOverlay: {
    position: 'absolute',
    zIndex: 10,

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
  legendSiteSymbol: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  legendSiteIconScale: {
    transform: [{ scale: 1.3 }],
  },
  legendSiteSymbolText: {
    position: 'absolute',
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
    justifyContent: 'center',
  },
  memberButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  memberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    textAlignVertical: 'center',
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
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F3F4F6',
  },
  dutyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addDutyInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  addDutyInputButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  dutyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dutyTextInput: {
    flex: 1,
  },
  dutyHoursInput: {
    width: 100,
    textAlign: 'center',
  },
  dutyHoursSelector: {
    width: 110,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dutyHoursSelectorText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  removeDutyButton: {
    width: 32,
    height: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  autoDutyHoursBadge: {
    width: 100,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
  },
  autoDutyHoursText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  dutyHintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    textAlignVertical: 'center',
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
    textAlignVertical: 'center',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
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
  adminConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  confirmCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  checkboxUnchecked: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  confirmLabel: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  addNewWorkTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  addNewWorkTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Salary Calculator Toggle Button
  salaryToggleButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  // Salary Calculator Styles
  salaryCalculatorSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  salaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  salaryGroup: {
    marginBottom: 16,
  },
  salaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  workerSelectionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workerSelectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerSelectionButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  workerSelectionButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  workerSelectionButtonTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  hourTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  hourTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourTypeButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  hourTypeButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  hourTypeButtonTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  salaryResultBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  salaryResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  salaryResultRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    paddingTop: 12,
    marginTop: 4,
  },
  salaryResultLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  salaryResultValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  salaryTotalLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  salaryTotalValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  // Salary Detail Panel Styles
  salaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  salaryInfoButton: {
    padding: 8,
  },
  salaryDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  salaryDetailContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  salaryDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  salaryDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  salaryDetailContent: {
    flex: 1,
    padding: 16,
  },
  salaryDetailEntryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  salaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryDetailDateSection: {
    flex: 1,
  },
  salaryDetailDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  salaryDetailHourSection: {
    flex: 1,
    alignItems: 'center',
  },
  salaryDetailHours: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  salaryDetailAmountSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  salaryDetailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  salaryDetailDuty: {
    fontSize: 12,
    color: '#6B7280',
  },
  salaryDetailSeparator: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  salaryDetailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  salaryDetailTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  salaryDetailTotalHours: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  salaryDetailTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  salaryDetailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    padding: 8,
  },
  dutySummarySection: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dutySummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  dutySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dutySummaryName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  dutySummaryHours: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  dutySuggestionList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dutySuggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dutySuggestionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});
