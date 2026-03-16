export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";

export interface DepartmentOptionView {
  id: number;
  name: string;
}

export interface TeamOptionView {
  id: number;
  name: string;
  departmentId: number;
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
  departmentId: number | null;
  departmentName: string | null;
  teamId: number | null;
  teamName: string | null;
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
  departmentId: number;
  teamId: number;
  positionTitle: string;
}

export interface ViewerAllowlistInput {
  email: string;
}
