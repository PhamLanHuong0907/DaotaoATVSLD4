import apiClient from './client';

export type FacilityType = 'room' | 'projector' | 'computer' | 'safety_gear' | 'other';

export interface Facility {
  id: string;
  name: string;
  code: string;
  facility_type: FacilityType;
  location: string | null;
  capacity: number | null;
  description: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FacilityCreate {
  name: string;
  code: string;
  facility_type: FacilityType;
  location?: string;
  capacity?: number;
  description?: string;
  department_id?: string;
}

export interface ConflictResponse {
  has_conflict: boolean;
  conflicting_rooms: {
    id: string;
    name: string;
    scheduled_start: string;
    scheduled_end: string;
  }[];
}

export const facilityApi = {
  list: (params: { facility_type?: FacilityType; department_id?: string; only_active?: boolean } = {}) =>
    apiClient.get<Facility[]>('/facilities', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Facility>(`/facilities/${id}`).then((r) => r.data),

  create: (data: FacilityCreate) =>
    apiClient.post<Facility>('/facilities', data).then((r) => r.data),

  update: (id: string, data: Partial<FacilityCreate & { is_active: boolean }>) =>
    apiClient.put<Facility>(`/facilities/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/facilities/${id}`).then((r) => r.data),

  checkConflict: (data: {
    facility_id: string;
    scheduled_start: string;
    scheduled_end: string;
    exclude_room_id?: string;
  }) =>
    apiClient.post<ConflictResponse>('/facilities/check-conflict', data).then((r) => r.data),
};
