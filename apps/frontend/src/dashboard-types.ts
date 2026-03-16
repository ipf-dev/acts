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

export interface AuthUserView {
  email: string;
  displayName: string;
  departmentId: number | null;
  departmentName: string | null;
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
  positionTitle: string;
}
