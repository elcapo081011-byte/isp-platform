export interface Plan {
  id: string;
  name: string;
  downloadMbps: number;
  uploadMbps: number;
  price: string;
  currency: string;
  technology: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDemo: boolean;
}

export interface Service {
  id: string;
  planId: string;
  plan: Plan;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  pppoeUsername: string | null;
  ipAddress: string | null;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED' | 'PENDING_INSTALLATION';
  technician: { id: string; firstName: string; lastName: string } | null;
  services: Service[];
  isDemo?: boolean;
}
