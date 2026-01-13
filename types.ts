
export enum Equipment {
  BED = '纹身床',
  ARM_REST = '手臂架',
  INNER_ROOM = '里屋'
}

export interface Booking {
  id: string;
  artistName: string;
  date: string; // ISO format: yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  equipments: Equipment[];
  notes?: string;
  createdAt: number;
}

export interface StudioState {
  artistName: string | null;
  bookings: Booking[];
}
