export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DriverAvailabilityStatus = 'offline' | 'online' | 'busy';

export interface DriverOperationalProfile {
  id: string;
  approvalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  ratingAverage: number;
  ratingCount: number;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverVehicle {
  id: string;
  driverId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  seatCount?: number;
  vehicleType?: string;
  chassisNumber?: string;
  engineNumber?: string;
  status?: string;
  approvedAt?: string | null;
}

export interface DriverMeData {
  driverProfile: DriverOperationalProfile;
  vehicle: DriverVehicle | null;
}

export interface DriverMeResponse {
  data: DriverMeData;
}
