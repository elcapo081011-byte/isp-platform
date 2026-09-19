export interface Plan {
  id: string;
  name: string;
  downloadMbps: number;
  uploadMbps: number;
  price: string;
  currency: string;
  technology: string;
  mikrotikProfile: string | null;
  burstLimit: string | null;
  priority: number;
  vlan: number | null;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isDemo: boolean;
}

export interface Router {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  useTls: boolean;
  location: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  lastCheckedAt: string | null;
  lastError: string | null;
  isDemo: boolean;
}

export interface Olt {
  id: string;
  name: string;
  vendor: 'HUAWEI' | 'ZTE' | 'FIBERHOME' | 'GENERIC_SNMP' | 'MOCK';
  model: string | null;
  host: string;
  location: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  lastCheckedAt: string | null;
  isDemo: boolean;
}

export interface Onu {
  id: string;
  oltId: string;
  ponPort: string;
  serial: string;
  mac: string | null;
  model: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
}

export interface PonPort {
  ponId: string;
  status: 'ONLINE' | 'OFFLINE';
  onuCount: number;
  onlineOnuCount: number;
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
