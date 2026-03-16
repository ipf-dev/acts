export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";

export interface OrganizationOptionView {
  id: number;
  name: string;
}

export interface ViewerAllowlistEntryView {
  email: string;
  effectiveCompanyWideViewer: boolean;
  createdAt: string;
}

export interface AuditLogView {
  id: number;
  category: string;
  outcome: string;
  actorName: string | null;
  actorEmail: string;
  actionType: string;
  targetName: string | null;
  targetEmail: string;
  detail: string | null;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
}

export interface AuthUserView {
  email: string;
  displayName: string;
  organizationId: number | null;
  organizationName: string | null;
  positionTitle: string | null;
  mappingMode: UserMappingMode;
  role: UserRole;
  companyWideViewer: boolean;
  manualAssignmentRequired: boolean;
}

export interface AuthSessionView {
  authenticated: boolean;
  loginConfigured: boolean;
  allowedDomain: string;
  user: AuthUserView | null;
}

export interface ManualAssignmentInput {
  organizationId: number;
  positionTitle: string;
}

export interface ViewerAllowlistInput {
  email: string;
}
