import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Project, Venue, Part, PartType, PartStatus, Event, Comment } from '@/types';
import { Alert } from 'react-native';
import * as h from '@/lib/supabaseHelpers';

// Custom hook for interacting with Supabase data
export function useData() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ 
        { data: projectsData, error: projectsError },
        { data: venuesData, error: venuesError },
        { data: partsData, error: partsError },
        { data: eventsData, error: eventsError },
        { data: commentsData, error: commentsError },
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('venues').select('*'),
        supabase.from('parts').select('*'),
        supabase.from('events').select('*'),
        supabase.from('comments').select('*'),
      ]);

      if (projectsError) throw new Error(`Projects Error: ${projectsError.message}`);
      if (venuesError) throw new Error(`Venues Error: ${venuesError.message}`);
      if (partsError) throw new Error(`Parts Error: ${partsError.message}`);
      if (eventsError) throw new Error(`Events Error: ${eventsError.message}`);
      if (commentsError) throw new Error(`Comments Error: ${commentsError.message}`);
      
      // Convert date strings back to Date objects and snake_case to camelCase
      const typedProjects = projectsData?.map(p => ({ ...p, createdAt: new Date(p.created_at) })) || [];
      const typedVenues = venuesData?.map(v => ({
        ...v,
        projectId: v.project_id,
        partQuantities: (v.part_quantities as Record<string, number>) || {},
        createdAt: new Date(v.created_at)
      })) || [];
      const typedParts = partsData?.map(p => ({
        ...p,
        projectId: p.project_id,
        parentPartId: p.parent_part_id,
        createdAt: new Date(p.created_at),
        comments: []
      })) || [];
      const typedEvents = eventsData?.map(e => ({
        id: e.id,
        date: e.date,
        type: e.type,
        parts: e.parts || [],
        description: e.description,
        projectId: e.project_id,
      })) || [];
      const typedComments = commentsData?.map(c => ({
        id: c.id,
        partId: c.part_id,
        author: c.author,
        text: c.text,
        isPending: c.is_pending,
        isCompleted: c.is_completed,
        venueId: c.venue_id,
        venueName: c.venue_name,
        createdAt: new Date(c.created_at)
      })) || [];

      // Associate comments with parts
      typedParts.forEach(part => {
        part.comments = typedComments.filter(c => c.partId === part.id);
      });

      setProjects(typedProjects);
      setVenues(typedVenues);
      setParts(typedParts);
      setEvents(typedEvents);
      setComments(typedComments);

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error fetching data', error.message);
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [refreshKey, fetchData]);

  const refresh = () => setRefreshKey(prev => prev + 1);

  // --- Helper Functions ---
  const handleSupabaseError = (error: any, entity: string) => {
    if (error) {
      Alert.alert(`Error with ${entity}`, error.message);
      console.error(`Error with ${entity}:`, error);
      return true;
    }
    return false;
  }

  const triggerRefresh = (setter: Function, item: any, updateFn?: (prev: any[]) => any[]) => {
    if (updateFn) {
      setter(updateFn);
    } else { // Default is to add the new item
      setter((prev: any[]) => [item, ...prev]);
    }
    return item;
  }

  // --- Projects ---
  const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('projects').insert(project).select().single();
    if (handleSupabaseError(error, 'project')) return null;
    return triggerRefresh(setProjects, { ...data, createdAt: new Date(data.created_at) });
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (handleSupabaseError(error, 'project update')) return null;
    return triggerRefresh(setProjects, data, prev => prev.map(p => p.id === id ? { ...p, ...data, createdAt: new Date(data.created_at) } : p));
  };

  const deleteProject = async (id: string) => {
    try {
      await h.deleteProject(id);
      setProjects(current => current.filter(p => p.id !== id));
      return true;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error deleting project', error.message);
        console.error('Error deleting project:', error);
      }
      return false;
    }
  };

  // --- Venues ---
  const getVenuesByProject = (projectId: string) => venues.filter(v => v.projectId === projectId);
  const getVenue = (id: string) => venues.find(v => v.id === id) || null;

  const createVenue = async (venue: Omit<Venue, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('venues').insert(venue).select().single();
    if (handleSupabaseError(error, 'venue')) return null;
    return triggerRefresh(setVenues, { ...data, createdAt: new Date(data.created_at) });
  };

  const updateVenue = async (id: string, updates: Partial<Venue>) => {
    const { data, error } = await supabase.from('venues').update(updates).eq('id', id).select().single();
    if (handleSupabaseError(error, 'venue update')) return null;
    return triggerRefresh(setVenues, data, prev => prev.map(v => v.id === id ? { ...v, ...data, createdAt: new Date(data.created_at) } : v));
  };

  const deleteVenue = async (id: string) => {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (handleSupabaseError(error, 'venue delete')) return false;
    triggerRefresh(setVenues, null, prev => prev.filter(v => v.id !== id));
    return true;
  };
  
  // --- Parts ---
  const getPartsByProject = (projectId: string) => parts.filter(p => p.projectId === projectId);
  const getAllPartsWithProjects = () => parts.map(part => {
    const project = projects.find(p => p.id === part.projectId);
    return { ...part, project };
  });

  const getNextPartNumber = async (type: PartType): Promise<number> => {
    const typeInitials: Record<PartType, string> = {
      'U shape': 'U', 'Straight': 'S', 'Knob': 'K', 'Button': 'B', 'Push Pad': 'P',
      'Cover': 'C', 'X - Special Design': 'X', 'Gadget': 'G',
    };
    const prefix = typeInitials[type];
    const { data, error } = await supabase.rpc('get_next_part_number', { p_prefix: prefix });
    if (handleSupabaseError(error, 'part number generation')) return 0;
    return data;
  };

  const findDuplicatePart = async (newPart: { type: PartType; dimensions: Record<string, any>; }) => {
    const { data, error } = await supabase.from('parts').select('id, name, project:projects(id, name)').eq('type', newPart.type).eq('dimensions', JSON.stringify(newPart.dimensions));
    if (handleSupabaseError(error, 'duplicate check') || !data || data.length === 0) return null;
    return data[0];
  };

  const createPart = async (part: Omit<Part, 'id' | 'createdAt' | 'name' | 'comments'>) => {
    const nextNumber = await getNextPartNumber(part.type);
    const typeInitials: Record<PartType, string> = {
      'U shape': 'U', 'Straight': 'S', 'Knob': 'K', 'Button': 'B', 'Push Pad': 'P',
      'Cover': 'C', 'X - Special Design': 'X', 'Gadget': 'G',
    };
    const name = `${typeInitials[part.type]}${nextNumber}`;

    const partPayload: any = {
      name,
      type: part.type,
      description: part.description,
      pictures: part.pictures,
      project_id: part.projectId,
    };
    if (part.parentPartId) {
      partPayload.parent_part_id = part.parentPartId;
    }
    const { data, error } = await supabase.from('parts').insert(partPayload).select().single();
    if (handleSupabaseError(error, 'part')) return null;

    const result = {
      ...data,
      projectId: data.project_id,
      parentPartId: data.parent_part_id,
      createdAt: new Date(data.created_at),
      comments: []
    };
    setParts(prev => [...prev, result]);
    return result;
  };
  
  const createSubPart = async (parentPartId: string, part: Omit<Part, 'id' | 'createdAt' | 'name' | 'comments'>) => {
    const parentPart = parts.find(p => p.id === parentPartId);
    if (!parentPart) return null;

    const { count, error: countError } = await supabase.from('parts').select('id', { count: 'exact' }).eq('parent_part_id', parentPartId);
    if (handleSupabaseError(countError, 'sub-part count')) return null;

    const subPartName = `${parentPart.name}${String.fromCharCode(97 + (count || 0))}`;
    const partPayload: any = {
      name: subPartName,
      type: part.type,
      description: part.description,
      pictures: part.pictures,
      project_id: part.projectId,
      parent_part_id: parentPartId,
    };

    const { data, error } = await supabase.from('parts').insert(partPayload).select().single();
    if (handleSupabaseError(error, 'sub-part')) return null;

    const result = {
      ...data,
      projectId: data.project_id,
      parentPartId: data.parent_part_id,
      createdAt: new Date(data.created_at),
      comments: []
    };
    setParts(prev => [...prev, result]);
    return result;
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    const updatePayload: any = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.pictures !== undefined) updatePayload.pictures = updates.pictures;
    if (updates.projectId !== undefined) updatePayload.project_id = updates.projectId;
    if (updates.parentPartId !== undefined) updatePayload.parent_part_id = updates.parentPartId;

    const { data, error } = await supabase.from('parts').update(updatePayload).eq('id', id).select().single();
    if (handleSupabaseError(error, 'part update')) return null;

    const result = {
      ...data,
      projectId: data.project_id,
      parentPartId: data.parent_part_id,
      createdAt: new Date(data.created_at),
      comments: []
    };
    setParts(prev => prev.map(p => p.id === id ? result : p));
    return result;
  };
  
  const deletePart = async (id: string) => {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (handleSupabaseError(error, 'part delete')) return false;
    triggerRefresh(setParts, null, prev => prev.filter(p => p.id !== id && p.parentPartId !== id));
    return true;
  };

  // --- Part Quantities ---
  const updatePartQuantityInVenue = async (venueId: string, partId: string, delta: number) => {
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;
    const currentQuantity = venue.partQuantities?.[partId] || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    const newQuantities = { ...venue.partQuantities, [partId]: newQuantity };
    return await updateVenue(venueId, { partQuantities: newQuantities });
  };
  
  const getPartQuantityInVenue = (venueId: string, partId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.partQuantities?.[partId] || 0;
  };

  // --- Events ---
  const getEventsByProject = (projectId: string) => events.filter(e => e.projectId === projectId);
  
  const createEvent = async (event: Omit<Event, 'id'>) => {
    const eventPayload = {
      date: event.date,
      type: event.type,
      parts: event.parts,
      description: event.description,
      project_id: event.projectId,
    };
    const { data, error } = await supabase.from('events').insert(eventPayload).select().single();
    if (handleSupabaseError(error, 'event')) return null;

    const result = {
      id: data.id,
      date: data.date,
      type: data.type,
      parts: data.parts || [],
      description: data.description,
      projectId: data.project_id,
    };
    setEvents(prev => [...prev, result]);
    return result;
  };
  
  const updateEvent = async (id: string, updates: Partial<Event>) => {
    const updatePayload: any = {};
    if (updates.date !== undefined) updatePayload.date = updates.date;
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.parts !== undefined) updatePayload.parts = updates.parts;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.projectId !== undefined) updatePayload.project_id = updates.projectId;

    const { data, error } = await supabase.from('events').update(updatePayload).eq('id', id).select().single();
    if (handleSupabaseError(error, 'event update')) return null;

    const result = {
      id: data.id,
      date: data.date,
      type: data.type,
      parts: data.parts || [],
      description: data.description,
      projectId: data.project_id,
    };
    setEvents(prev => prev.map(e => e.id === id ? result : e));
    return result;
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (handleSupabaseError(error, 'event delete')) return false;
    triggerRefresh(setEvents, null, prev => prev.filter(e => e.id !== id));
    return true;
  };

  // --- Comments ---
  const getCommentsByPart = (partId: string) => comments.filter(c => c.partId === partId);
  const getPendingCommentsCountByPart = (partId: string) => comments.filter(c => c.partId === partId && c.isPending).length;

  const createComment = async (comment: Omit<Comment, 'id' | 'createdAt' | 'isPending' | 'isCompleted'>) => {
    const newComment = {
      part_id: comment.partId,
      author: comment.author,
      text: comment.text,
      venue_id: comment.venueId,
      venue_name: comment.venueName,
      is_pending: true,
      is_completed: false
    };
    const { data, error } = await supabase.from('comments').insert(newComment).select().single();
    if (handleSupabaseError(error, 'comment')) return null;

    const result = {
      ...data,
      partId: data.part_id,
      venueId: data.venue_id,
      venueName: data.venue_name,
      isPending: data.is_pending,
      isCompleted: data.is_completed,
      createdAt: new Date(data.created_at)
    };
    // Add comment to local state immediately
    setComments(prev => [result, ...prev]);
    setParts(prevParts => prevParts.map(p => p.id === result.partId ? { ...p, comments: [result, ...p.comments] } : p));
    return result;
  };
  
  const updateComment = async (id: string, updates: Partial<Comment>) => {
    const updatePayload: any = {};
    if (updates.text !== undefined) updatePayload.text = updates.text;
    if (updates.author !== undefined) updatePayload.author = updates.author;
    if (updates.isPending !== undefined) updatePayload.is_pending = updates.isPending;
    if (updates.isCompleted !== undefined) updatePayload.is_completed = updates.isCompleted;
    if (updates.venueId !== undefined) updatePayload.venue_id = updates.venueId;
    if (updates.venueName !== undefined) updatePayload.venue_name = updates.venueName;

    const { data, error } = await supabase.from('comments').update(updatePayload).eq('id', id).select().single();
    if (handleSupabaseError(error, 'comment update')) return null;

    const result = {
      id: data.id,
      partId: data.part_id,
      author: data.author,
      text: data.text,
      isPending: data.is_pending,
      isCompleted: data.is_completed,
      venueId: data.venue_id,
      venueName: data.venue_name,
      createdAt: new Date(data.created_at)
    };
    setComments(prev => prev.map(c => c.id === id ? result : c));
    setParts(prevParts => prevParts.map(p => {
      if (p.comments.some(c => c.id === id)) {
        return { ...p, comments: p.comments.map(c => c.id === id ? result : c) };
      }
      return p;
    }));
    return result;
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (handleSupabaseError(error, 'comment delete')) return false;
    setComments(prev => prev.filter(c => c.id !== id));
    setParts(prevParts => prevParts.map(p => ({ ...p, comments: p.comments.filter(c => c.id !== id) })));
    return true;
  };

  const toggleCommentCompletion = async (id: string) => {
    const comment = comments.find(c => c.id === id);
    if (!comment) return null;

    const newCompletedStatus = !comment.isCompleted;
    const { data, error } = await supabase.from('comments').update({ is_completed: newCompletedStatus }).eq('id', id).select().single();
    if (handleSupabaseError(error, 'toggle comment completion')) return null;

    const result = {
      ...data,
      partId: data.part_id,
      venueId: data.venue_id,
      venueName: data.venue_name,
      isPending: data.is_pending,
      isCompleted: data.is_completed,
      createdAt: new Date(data.created_at)
    };
    setComments(prev => prev.map(c => c.id === id ? result : c));
    setParts(prevParts => prevParts.map(p => {
      if (p.comments.some(c => c.id === id)) {
        return { ...p, comments: p.comments.map(c => c.id === id ? result : c) };
      }
      return p;
    }));
    return result;
  };

  const getUnfinishedCommentsCountByPart = (partId: string) =>
    comments.filter(c => c.partId === partId && !c.isCompleted).length;
  
  return {
    loading,
    refresh,
    projects,
    venues,
    parts,
    events,
    comments,
    createProject,
    updateProject,
    deleteProject,
    getVenuesByProject,
    getVenue,
    createVenue,
    updateVenue,
    deleteVenue,
    getPartsByProject,
    getAllPartsWithProjects,
    createPart,
    createSubPart,
    updatePart,
    findDuplicatePart,
    updatePartQuantityInVenue,
    getPartQuantityInVenue,
    deletePart,
    getEventsByProject,
    createEvent,
    updateEvent,
    deleteEvent,
    createComment,
    getCommentsByPart,
    getPendingCommentsCountByPart,
    getUnfinishedCommentsCountByPart,
    updateComment,
    deleteComment,
    toggleCommentCompletion,
  };
}
