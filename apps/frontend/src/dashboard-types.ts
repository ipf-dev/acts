export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";

export interface AuthUserView {
  email: string;
  displayName: string;
  teamName: string;
  departmentName: string;
  mappingMode: UserMappingMode;
  role: UserRole;
  manualAssignmentRequired: boolean;
}

export interface AuthSessionView {
  authenticated: boolean;
  loginConfigured: boolean;
  allowedDomain: string;
  user: AuthUserView | null;
}

export interface ManualAssignmentInput {
  teamName: string;
  departmentName: string;
}
