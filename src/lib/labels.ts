import type {
  AnnouncementAudience,
  AnnouncementStatus,
  DocumentType,
  MembershipRole,
  Priority,
  ServiceStatus,
  ServiceType,
} from "@prisma/client";

export const roleLabel: Record<MembershipRole, string> = {
  ADMIN: "Yönetici",
  OPERATIONS_MANAGER: "Operasyon sorumlusu",
  TEAM_LEADER: "Ekip lideri",
  SERVICE_ENGINEER: "Servis mühendisi",
};

export const membershipRoles = Object.keys(roleLabel) as MembershipRole[];

/** Yönetici ekibe personel eklerken seçebileceği roller */
export const assignableMembershipRoles: MembershipRole[] = [
  "OPERATIONS_MANAGER",
  "TEAM_LEADER",
  "SERVICE_ENGINEER",
  "ADMIN",
];


export const serviceTypeLabel: Record<ServiceType, string> = {
  MAINTENANCE: "Bakım",
  BREAKDOWN: "Arıza",
  INSTALLATION: "Kurulum",
};

export const serviceStatusLabel: Record<ServiceStatus, string> = {
  PLANNED: "Planlandı",
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Devam ediyor",
  WAITING: "Beklemede",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const priorityLabel: Record<Priority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const documentTypeLabel: Record<DocumentType, string> = {
  SERVICE_REPORT: "Servis formu",
  OTHER: "Diğer",
};

export const announcementStatusLabel: Record<AnnouncementStatus, string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
};

export const announcementAudienceLabel: Record<AnnouncementAudience, string> = {
  ALL: "Tüm çalışanlar",
  TEAMS: "Seçili ekipler",
};

export const serviceTypes = Object.keys(serviceTypeLabel) as ServiceType[];
export const serviceStatuses = Object.keys(serviceStatusLabel) as ServiceStatus[];
export const priorities = Object.keys(priorityLabel) as Priority[];
