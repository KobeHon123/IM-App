import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface Task {
  id?: string;
  title: string;
  description: string;
  dueDate: string;
  visibility: 'public' | 'private';
  tags: string[];
  createdBy: string;
  createdAt: Timestamp;
  status: 'pending' | 'completed';
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  dateTime: Timestamp;
  tags: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface Memo {
  id?: string;
  content: string;
  recipient: string;
  duration?: string;
  color: string;
  font: string;
  fontSize: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  pic: string;
  venues: Venue[];
  parts: Part[];
  createdBy: string;
  createdAt: Timestamp;
  tags: string[];
}

export interface Venue {
  id: string;
  name: string;
  pic: string;
  description?: string;
  photo?: string;
  parts: VenuePart[];
}

export interface Part {
  id?: string;
  name: string;
  type: 'U shape' | 'Straight' | 'Knob' | 'Button' | 'Push Pad' | 'Cover' | 'X' | 'Custom';
  status: 'Measured' | 'Designed' | 'Tested' | 'Installed';
  fileUrls: string[];
  specifications: Record<string, any>;
  description?: string;
  tags: string[];
  createdAt: Timestamp;
}

export interface VenuePart {
  partId: string;
  quantity: number;
}

// Generic CRUD operations
export class FirestoreService {
  // Tasks
  static async createTask(task: Omit<Task, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tasks'), task);
    return docRef.id;
  }

  static async getTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, updates);
  }

  static async deleteTask(id: string): Promise<void> {
    await deleteDoc(doc(db, 'tasks', id));
  }

  // Calendar Events
  static async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'events'), event);
    return docRef.id;
  }

  static async getEvents(userId: string): Promise<CalendarEvent[]> {
    const q = query(
      collection(db, 'events'),
      where('createdBy', '==', userId),
      orderBy('dateTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
  }

  static async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<void> {
    const eventRef = doc(db, 'events', id);
    await updateDoc(eventRef, updates);
  }

  static async deleteEvent(id: string): Promise<void> {
    await deleteDoc(doc(db, 'events', id));
  }

  // Memos
  static async createMemo(memo: Omit<Memo, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'memos'), memo);
    return docRef.id;
  }

  static async getMemos(userId: string): Promise<Memo[]> {
    const q = query(
      collection(db, 'memos'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memo));
  }

  static async updateMemo(id: string, updates: Partial<Memo>): Promise<void> {
    const memoRef = doc(db, 'memos', id);
    await updateDoc(memoRef, updates);
  }

  static async deleteMemo(id: string): Promise<void> {
    await deleteDoc(doc(db, 'memos', id));
  }

  // Projects
  static async createProject(project: Omit<Project, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'projects'), project);
    return docRef.id;
  }

  static async getProjects(userId: string): Promise<Project[]> {
    const q = query(
      collection(db, 'projects'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  static async getProject(id: string): Promise<Project | null> {
    const docRef = doc(db, 'projects', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Project : null;
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const projectRef = doc(db, 'projects', id);
    await updateDoc(projectRef, updates);
  }

  static async deleteProject(id: string): Promise<void> {
    await deleteDoc(doc(db, 'projects', id));
  }

  // Parts (for Design Library)
  static async createPart(part: Omit<Part, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'parts'), part);
    return docRef.id;
  }

  static async getParts(): Promise<Part[]> {
    const q = query(collection(db, 'parts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part));
  }

  static async updatePart(id: string, updates: Partial<Part>): Promise<void> {
    const partRef = doc(db, 'parts', id);
    await updateDoc(partRef, updates);
  }

  static async deletePart(id: string): Promise<void> {
    await deleteDoc(doc(db, 'parts', id));
  }

  // Search parts by name, tags, or status
  static async searchParts(searchTerm: string, status?: string): Promise<Part[]> {
    let q = query(collection(db, 'parts'), orderBy('createdAt', 'desc'));
    
    if (status && status !== 'All') {
      q = query(collection(db, 'parts'), where('status', '==', status), orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const parts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part));
    
    // Client-side filtering for search term (Firebase doesn't support full-text search)
    if (searchTerm) {
      return parts.filter(part => 
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return parts;
  }
}