export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Machine {
  id?: string;
  name: string;
  type: 'Offset' | 'Digital' | 'Flexography' | 'Large Format' | 'Serigraphy';
  costPerHour: number;
  setupCost: number;
  maxFormat: string;
}

export interface Material {
  id?: string;
  name: string;
  type: 'Paper' | 'Ink' | 'Plates' | 'Other';
  costPerUnit: number;
  stock: number;
}

export interface Quote {
  id?: string;
  customerId: string;
  machineId: string;
  materialId: string;
  quantity: number;
  totalCost: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  createdAt: string;
}

export interface Order {
  id?: string;
  quoteId: string;
  status: 'Planning' | 'Printing' | 'Finishing' | 'Delivered';
  deadline: string;
  assignedTo: string;
}

export interface KPI {
  id?: string;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  efficiency: number;
}
