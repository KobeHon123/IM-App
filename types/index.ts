export type PartStatus = 'measured' | 'designed' | 'tested' | 'printed' | 'installed';

export type PartType = 'U shape' | 'Straight' | 'Knob' | 'Button' | 'Push Pad' | 'Cover' | 'X - Special Design' | 'Gadget';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAuthorized: boolean;
  phoneNumber?: string | null;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BasePart {
  id: string;
  name: string;
  type: PartType;
  description: string;
  pictures: string[]; // URLs to pictures, first one is thumbnail
  cadDrawing?: string; // URL to CAD drawing picture
  status: PartStatus;
  createdAt: Date;
  designer?: string;
  projectId: string;
  parentPartId?: string; // For sub-parts
  comments?: any[]; // Comments associated with this part (Comment type defined below)
}

export interface UShapePart extends BasePart {
  type: 'U shape';
  dimensions: {
    length: number;
    radius: number;
    depth: number;
    oFillet: number;
    iFillet: number;
  };
}

export interface StraightPart extends BasePart {
  type: 'Straight';
  dimensions: {
    length: number;
    radius: number;
  };
}

export interface KnobPart extends BasePart {
  type: 'Knob';
  dimensions: {
    frontRadius: number;
    middleRadius: number;
    backRadius: number;
    depth: number;
    middleToBackDepth: number;
  };
}

export interface ButtonPart extends BasePart {
  type: 'Button';
  dimensions: {
    shape: 'Circle' | 'Rectangular' | 'Slot';
    radius?: number; // Not for Rectangular
    length?: number; // Not for Circle
    width?: number; // Not for Circle
    fillet?: number; // Not for Circle
    thickness: number;
  };
}

export interface PushPadPart extends BasePart {
  type: 'Push Pad';
  dimensions: {
    length: number;
    width: number;
    radius: number;
  };
}

export interface SimplePart extends BasePart {
  type: 'Cover' | 'X - Special Design' | 'Gadget';
  dimensions: Record<string, never>; // No specific dimensions
}

export type Part = UShapePart | StraightPart | KnobPart | ButtonPart | PushPadPart | SimplePart;

export interface Venue {
  id: string;
  name: string;
  description: string;
  pic: string; // Person in charge
  projectId: string;
  thumbnail?: string; // Optional venue thumbnail
  partQuantities: Record<string, number>; // partId -> quantity
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  pic: string; // Person in charge
  thumbnail?: string; // Optional project thumbnail
  createdAt: Date;
}

export interface VenuePartQuantity {
  partId: string;
  quantity: number;
}

export interface Event {
  id: string;
  date: string;
  type: 'Measurement' | 'Test-Fit' | 'Installation' | 'Meeting' | 'Other' | 'Delivery';
  parts: string[];
  description: string;
  projectId: string;
}

export interface Comment {
  id: string;
  partId: string;
  author: string;
  text: string;
  isPending: boolean;
  isCompleted: boolean;
  createdAt: Date;
  venueId?: string;
  venueName?: string;
}