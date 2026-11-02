import "server-only";
import type { Actor } from "@/lib/actor";
import { equipmentWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function listEquipment(actor: Actor, query: string) {
  return prisma.equipment.findMany({
    where: {
      AND: [
        equipmentWhere(actor),
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { brand: { contains: query, mode: "insensitive" } },
                { model: { contains: query, mode: "insensitive" } },
                { serialNumber: { contains: query, mode: "insensitive" } },
                { customer: { companyName: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      teamLinks: { include: { team: { select: { id: true, name: true } } } },
      _count: { select: { visits: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function getEquipment(actor: Actor, id: string) {
  return prisma.equipment.findFirst({
    where: { AND: [{ id }, equipmentWhere(actor)] },
    include: {
      customer: true,
      teamLinks: { include: { team: { select: { id: true, name: true } } } },
      visits: {
        include: {
          assignments: { include: { user: { select: { name: true } } } },
        },
        orderBy: { plannedDate: "desc" },
      },
    },
  });
}

export async function listCustomerChoices(organizationId: string) {
  return prisma.customer.findMany({
    where: { organizationId },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
}

export async function listTeamChoices(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
