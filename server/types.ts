export type ConnectorStatus = "fresh" | "stale" | "syncing" | "failed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type MissionStatus =
  | "idle"
  | "checking_data"
  | "awaiting_sync_approval"
  | "forecasting"
  | "awaiting_action_approval"
  | "completed";

export interface Connector {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: ConnectorStatus;
  lastSyncAt: string;
  recordsSynced: number;
  freshnessMinutes: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: "beverage" | "food" | "merch" | "supplies";
  unitsOnHand: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  packSize: number;
  leadTimeHours: number;
}

export interface SalesRecord {
  sku: string;
  weekday: string;
  hour: number;
  unitsSold: number;
}

export interface MatchEvent {
  id: string;
  venue: string;
  kickoffAt: string;
  expectedAttendance: number;
  visitorMultiplier: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  hourlyCost: number;
  availableHours: number[];
}

export interface SupplierContact {
  id: string;
  name: string;
  email: string;
  cutoffHour: number;
}

export interface PromotionTemplate {
  id: string;
  channel: "sms" | "social" | "window";
  copy: string;
}

export interface SeedData {
  businessName: string;
  location: string;
  weather: {
    summary: string;
    highFahrenheit: number;
    precipitationChance: number;
  };
  connectors: Connector[];
  inventory: InventoryItem[];
  sales: SalesRecord[];
  match: MatchEvent;
  staff: StaffMember[];
  suppliers: SupplierContact[];
  promotions: PromotionTemplate[];
}

export interface ForecastItem {
  sku: string;
  name: string;
  expectedDemand: number;
  unitsOnHand: number;
  reorderUnits: number;
  estimatedCost: number;
  expectedRevenue: number;
  risk: "low" | "medium" | "high";
}

export interface ForecastResult {
  items: ForecastItem[];
  totalRecommendedSpend: number;
  expectedRevenue: number;
  confidence: "low" | "medium" | "high";
  staffing: StaffingRecommendation[];
  summary: string;
}

export interface StaffingRecommendation {
  hour: number;
  role: string;
  needed: number;
  scheduled: string[];
  gap: number;
}

export interface ApprovalAction {
  id: string;
  type: "sync" | "reorder" | "staffing" | "campaign" | "supplier_email";
  title: string;
  reason: string;
  impact: string;
  status: ApprovalStatus;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: "agent" | "manager" | "system";
  tool: string;
  message: string;
}

export interface ActionPack {
  reorderItems: ForecastItem[];
  staffing: StaffingRecommendation[];
  campaignCopy: string;
  supplierEmail: {
    to: string;
    subject: string;
    body: string;
  };
  expectedSpend: number;
  expectedRevenue: number;
}

export interface MissionState {
  id: string;
  prompt: string;
  status: MissionStatus;
  budget: number;
  plan: string[];
  connectors: Connector[];
  pendingApprovals: ApprovalAction[];
  auditEvents: AuditEvent[];
  forecast?: ForecastResult;
  actionPack?: ActionPack;
}

export interface AppState {
  fivetranMode: "demo" | "live";
  mission: MissionState;
}
