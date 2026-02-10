import { supabase } from './supabase';
import { Project, Venue, Part, Event, Comment } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// A single place to convert database snake_case to app camelCase
// and ensure data types are correct (e.g., creating Date objects)
const fromSupabase = {
  project: (p: any): Project => ({ id: p.id, name: p.name, description: p.description, pic: p.pic, thumbnail: p.thumbnail, createdAt: new Date(p.created_at) }),
  venue: (v: any): Venue => ({ id: v.id, projectId: v.project_id, name: v.name, description: v.description, pic: v.pic, thumbnail: v.thumbnail, partQuantities: v.part_quantities || {}, createdAt: new Date(v.created_at) }),
  part: (p: any): Part => ({ id: p.id, projectId: p.project_id, parentPartId: p.parent_part_id, name: p.name, type: p.type, status: p.status, description: p.description, designer: p.designer, dimensions: p.dimensions || {}, cadDrawing: p.cad_drawing, pictures: p.pictures || [], comments: [], createdAt: new Date(p.created_at) }),
  event: (e: any): Event => ({ id: e.id, projectId: e.project_id, date: e.date, type: e.type, description: e.description, parts: e.parts || [] }),
  comment: (c: any): Comment => ({ id: c.id, partId: c.part_id, author: c.author, text: c.text, isPending: c.is_pending, isCompleted: c.is_completed, createdAt: new Date(c.created_at), venueId: c.venue_id, venueName: c.venue_name }),
};

// --- Part Type Prefix Mapping ---
const partTypePrefix: Record<string, string> = {
    'U shape': 'U',
    'Straight': 'S',
    'Knob': 'K',
    'Button': 'B',
    'Push Pad': 'P',
    'Cover': 'C',
    'X - Special Design': 'X',
    'Gadget': 'G',
};

// --- Part Naming Helper ---
const generatePartName = (partType: string, partNumber: number): string => {
    const prefix = partTypePrefix[partType] || 'P';
    return `${prefix}${partNumber}`;
}

// --- Image Upload Helpers ---
const isLocalUri = (uri: string): boolean => {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
};

export const uploadPartImage = async (uri: string, folder: string = 'parts'): Promise<string> => {
  // If it's already a remote URL, return as-is
  if (!isLocalUri(uri)) {
    return uri;
  }

  try {
    // Normalize URI - ensure it starts with file://
    let normalizedUri = uri;
    if (uri.startsWith('/') && !uri.startsWith('file://')) {
      normalizedUri = `file://${uri}`;
    }

    console.log('Attempting to upload image from:', normalizedUri);

    // Check if file exists first
    const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
    if (!fileInfo.exists) {
      console.warn('File does not exist:', normalizedUri);
      return uri; // Return original URI as fallback
    }

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(normalizedUri, {
      encoding: 'base64',
    });

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Failed to read image file');
    }

    console.log('Read base64 data, length:', base64Data.length);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('parts')
      .upload(fileName, decode(base64Data), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('parts')
      .getPublicUrl(fileName);

    console.log('Uploaded successfully, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    // Return original URI as fallback (will work locally but not across devices)
    return uri;
  }
};

export const uploadPartImages = async (uris: string[]): Promise<string[]> => {
  const uploadPromises = uris.map(uri => uploadPartImage(uri, 'pictures'));
  return Promise.all(uploadPromises);
};

// --- NEW Data Fetching Functions ---
export const getProjects = async () => {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  return data.map(fromSupabase.project);
};

export const getVenues = async () => {
  const { data, error } = await supabase.from('venues').select('*');
  if (error) throw error;
  return data.map(fromSupabase.venue);
};

export const getVenuesByProject = async (projectId: string) => {
  const { data, error } = await supabase.from('venues').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data.map(fromSupabase.venue);
};

export const getVenue = async (id: string) => {
  const { data, error } = await supabase.from('venues').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? fromSupabase.venue(data) : null;
};

export const getParts = async () => {
  const { data, error } = await supabase.from('parts').select('*');
  if (error) throw error;
  return data.map(fromSupabase.part);
};

export const getPartsByProject = async (projectId: string) => {
  const { data, error } = await supabase.from('parts').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data.map(fromSupabase.part);
};

export const getComments = async () => {
  const { data, error } = await supabase.from('comments').select('*');
  if (error) throw error;
  return data.map(fromSupabase.comment);
};

export const getCommentsByPart = async (partId: string) => {
  const { data, error } = await supabase.from('comments').select('*').eq('part_id', partId).order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(fromSupabase.comment);
};

export const getEvents = async () => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return data.map(fromSupabase.event);
};

// --- Create/Update/Delete Functions ---

export const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase.from('projects').insert(project).select().single();
  if (error) throw error;
  return fromSupabase.project(data);
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
  const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return fromSupabase.project(data);
};

export const deleteProject = async (id: string) => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const createVenue = async (venue: Omit<Venue, 'id' | 'createdAt'>) => {
  const { projectId, partQuantities, ...rest } = venue;
  const payload = { ...rest, project_id: projectId, part_quantities: partQuantities || {} };
  const { data, error } = await supabase.from('venues').insert(payload).select().single();
  if (error) throw error;
  return fromSupabase.venue(data);
};

export const updateVenue = async (id: string, updates: Partial<Venue>) => {
  const { projectId, partQuantities, ...rest } = updates;
  const payload: Record<string, any> = { ...rest };
  if (projectId) payload.project_id = projectId;
  if (partQuantities) payload.part_quantities = partQuantities;

  const { data, error } = await supabase.from('venues').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return fromSupabase.venue(data);
};

export const deleteVenue = async (id: string) => {
  const { error } = await supabase.from('venues').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const getVenuePartQuantity = async (venueId: string, partId: string): Promise<number> => {
  const venue = await getVenue(venueId);
  return venue?.partQuantities?.[partId] || 0;
};

export const updateVenuePartQuantity = async (venueId: string, partId: string, quantity: number) => {
  const venue = await getVenue(venueId);
  if (!venue) throw new Error('Venue not found');

  const newQuantities = { ...venue.partQuantities, [partId]: quantity };
  return await updateVenue(venueId, { partQuantities: newQuantities });
};

export const getUsedPartNumbers = async (partType: string, projectId?: string): Promise<number[]> => {
  const prefix = partTypePrefix[partType] || 'P';
  // Query for parts that match the prefix globally (across all projects)
  const { data, error } = await supabase
    .from('parts')
    .select('name')
    .like('name', `${prefix}%`);
  
  if (error) throw error;
  
  // Extract numbers from part names (e.g., "U1" -> 1, "U23" -> 23)
  // Note: projectId parameter is kept for backwards compatibility but not used
  const usedNumbers = (data || [])
    .map(part => {
      const match = part.name.match(/^[A-Z]+(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null);
  
  return usedNumbers.sort((a, b) => a - b);
};

export const getNextPartNumber = async (partType: string, projectId?: string): Promise<number> => {
    // Use getUsedPartNumbers to get project-scoped used numbers
    const usedNumbers = await getUsedPartNumbers(partType, projectId);
    const maxUsedNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
    return maxUsedNumber + 1;
};

export const getCurrentPartNumber = async (partType: string): Promise<number> => {
    const prefix = partTypePrefix[partType] || 'P';
    const { data, error } = await supabase.rpc('get_current_part_number', { p_prefix: prefix });
    if (error) throw error;
    return data;
};

export const createPart = async (part: Omit<Part, 'id' | 'createdAt' | 'comments' | 'name'> & { existingPartName?: string }) => {
    // If existingPartName is provided, use it; otherwise generate a new name
    let name: string;
    if (part.existingPartName) {
        name = part.existingPartName;
        
        // Check if a part with this name already exists in the same project
        const { data: existingParts, error: checkError } = await supabase
            .from('parts')
            .select('id')
            .eq('project_id', part.projectId)
            .eq('name', name)
            .limit(1);
        
        if (checkError) {
            throw new Error('Failed to check for duplicate part names');
        }
        
        if (existingParts && existingParts.length > 0) {
            throw new Error(`A part named "${name}" already exists in this project. Please choose a different name or use the existing part instead.`);
        }
    } else {
        // Get next number filtered by project
        const nextNumber = await getNextPartNumber(part.type, part.projectId);
        name = generatePartName(part.type, nextNumber);
    }

    // Upload images to cloud storage
    let uploadedCadDrawing = part.cadDrawing;
    let uploadedPictures = part.pictures;

    if (part.cadDrawing) {
        uploadedCadDrawing = await uploadPartImage(part.cadDrawing, 'cad-drawings');
    }
    if (part.pictures && part.pictures.length > 0) {
        uploadedPictures = await uploadPartImages(part.pictures);
    }

    const { projectId, cadDrawing, parentPartId, existingPartName, pictures, ...rest } = part;
    const payload = { 
        ...rest, 
        name, 
        project_id: projectId, 
        cad_drawing: uploadedCadDrawing, 
        parent_part_id: parentPartId,
        pictures: uploadedPictures 
    };
    const { data, error } = await supabase.from('parts').insert(payload).select().single();
    if (error) throw error;
    return fromSupabase.part(data);
};

export const createSubPart = async (parentId: string, subPart: Omit<Part, 'id' | 'createdAt' | 'comments' | 'parentPartId' | 'name'>) => {
    const { data: parentPart, error: parentError } = await supabase.from('parts').select('name').eq('id', parentId).single();
    if (parentError) throw parentError;

    const { count, error: countError } = await supabase.from('parts').select('id', { count: 'exact', head: true }).eq('parent_part_id', parentId);
    if (countError) throw countError;

    // Generate letter suffix: a, b, c, etc.
    const subPartIndex = count || 0;
    const letterSuffix = String.fromCharCode(97 + subPartIndex); // 97 is 'a' in ASCII
    const name = `${parentPart.name}${letterSuffix}`;

    // Upload images to cloud storage
    let uploadedCadDrawing = subPart.cadDrawing;
    let uploadedPictures = subPart.pictures;

    if (subPart.cadDrawing) {
        uploadedCadDrawing = await uploadPartImage(subPart.cadDrawing, 'cad-drawings');
    }
    if (subPart.pictures && subPart.pictures.length > 0) {
        uploadedPictures = await uploadPartImages(subPart.pictures);
    }

    const { projectId, cadDrawing, pictures, ...rest } = subPart;
    const payload = { 
        ...rest, 
        name, 
        project_id: projectId, 
        cad_drawing: uploadedCadDrawing, 
        parent_part_id: parentId,
        pictures: uploadedPictures 
    };
    const { data, error } = await supabase.from('parts').insert(payload).select().single();
    if (error) throw error;
    return fromSupabase.part(data);
};

export const updatePart = async (id: string, updates: Partial<Part>) => {
    // Upload images to cloud storage if they're local URIs
    let uploadedCadDrawing = updates.cadDrawing;
    let uploadedPictures = updates.pictures;

    if (updates.cadDrawing && isLocalUri(updates.cadDrawing)) {
        uploadedCadDrawing = await uploadPartImage(updates.cadDrawing, 'cad-drawings');
    }
    if (updates.pictures && updates.pictures.length > 0) {
        uploadedPictures = await Promise.all(
            updates.pictures.map(pic => isLocalUri(pic) ? uploadPartImage(pic, 'pictures') : pic)
        );
    }

    const { projectId, cadDrawing, parentPartId, dimensions, designer, pictures, ...rest } = updates;
    const payload: Record<string, any> = { ...rest };
    if (projectId) payload.project_id = projectId;
    if (uploadedCadDrawing !== undefined) payload.cad_drawing = uploadedCadDrawing;
    if (parentPartId) payload.parent_part_id = parentPartId;
    if (dimensions) payload.dimensions = dimensions;
    if (designer !== undefined) payload.designer = designer;
    if (uploadedPictures !== undefined) payload.pictures = uploadedPictures;

    const { data, error } = await supabase.from('parts').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return fromSupabase.part(data);
};

export const deletePart = async (id: string) => {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const findDuplicatePart = async (projectId: string, type: string, dimensions: Record<string, any>) => {
    const { data, error } = await supabase
        .from('parts')
        .select('id, name')
        .eq('project_id', projectId)
        .eq('type', type)
        .eq('dimensions', JSON.stringify(dimensions))
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const checkPartNumberExists = async (partName: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('parts')
        .select('id')
        .eq('name', partName)
        .maybeSingle();

    if (error) throw error;
    return !!data;
};

export const createComment = async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    const { partId, isPending, venueId, venueName, ...rest } = comment;
    const payload = { ...rest, part_id: partId, is_pending: isPending, venue_id: venueId, venue_name: venueName };
    const { data, error } = await supabase.from('comments').insert(payload).select().single();
    if (error) throw error;
    return fromSupabase.comment(data);
};

export const updateComment = async (id: string, updates: Partial<Comment>) => {
    const { partId, isPending, venueId, venueName, ...rest } = updates;
    const payload: Record<string, any> = { ...rest };
    if (partId) payload.part_id = partId;
    if (isPending !== undefined) payload.is_pending = isPending;
    if (venueId) payload.venue_id = venueId;
    if (venueName) payload.venue_name = venueName;

    const { data, error } = await supabase.from('comments').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return fromSupabase.comment(data);
};

export const deleteComment = async (id: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const toggleCommentCompletion = async (id: string) => {
    const { data: comment, error: fetchError } = await supabase.from('comments').select('is_completed').eq('id', id).single();
    if (fetchError) throw fetchError;

    const newCompletedStatus = !comment.is_completed;
    const { data, error } = await supabase.from('comments').update({ is_completed: newCompletedStatus }).eq('id', id).select().single();
    if (error) throw error;
    return fromSupabase.comment(data);
};

// Event functions are not fully implemented in the UI yet, but helpers are here.
export const createEvent = async (event: Omit<Event, 'id'>) => {
  const { projectId, ...rest } = event;
  const payload = { ...rest, project_id: projectId };
  const { data, error } = await supabase.from('events').insert(payload).select().single();
  if (error) throw error;
  return fromSupabase.event(data);
};

export const updateEvent = async (id: string, updates: Partial<Event>) => {
  const { projectId, ...rest } = updates;
  const payload: Record<string, any> = { ...rest };
  if (projectId) payload.project_id = projectId;

  const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return fromSupabase.event(data);
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
  return true;
};
