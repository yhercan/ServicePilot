import type { MembershipRole } from "@prisma/client";

export type Actor = {
  userId: string;
  name: string;
  email: string;
  avatarPath: string | null;
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
};
