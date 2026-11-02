import "server-only";
import type { Actor } from "@/lib/actor";
import { customerWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type CustomerFilters = {
  q?: string;
  city?: string;
  operationsManagerId?: string;
};

export async function listCustomers(actor: Actor, filters: CustomerFilters = {}) {
  const query = filters.q?.trim() ?? "";
  const city = filters.city?.trim() ?? "";
  const managerId = filters.operationsManagerId?.trim() ?? "";

  return prisma.customer.findMany({
    where: {
      AND: [
        customerWhere(actor),
        query
          ? {
              OR: [
                { companyName: { contains: query, mode: "insensitive" } },
                { contactPerson: { contains: query, mode: "insensitive" } },
                { city: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                {
                  contacts: {
                    some: {
                      OR: [
                        { fullName: { contains: query, mode: "insensitive" } },
                        { email: { contains: query, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ],
            }
          : {},
        city ? { city: { contains: city, mode: "insensitive" } } : {},
        managerId ? { operationsManagerId: managerId } : {},
      ],
    },
    include: {
      operationsManager: { select: { id: true, name: true } },
      _count: { select: { equipment: true, visits: true, contacts: true } },
    },
    orderBy: { companyName: "asc" },
    take: 100,
  });
}

export async function getCustomer(actor: Actor, id: string) {
  return prisma.customer.findFirst({
    where: { AND: [{ id }, customerWhere(actor)] },
    include: {
      operationsManager: { select: { id: true, name: true, email: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }] },
      equipment: { orderBy: { name: "asc" } },
      visits: {
        include: {
          equipment: { select: { id: true, name: true } },
          assignments: { include: { user: { select: { name: true } } } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { plannedDate: "desc" },
      },
    },
  });
}

export async function listOperationsManagers(actor: Actor) {
  return prisma.user.findMany({
    where: {
      memberships: {
        some: {
          organizationId: actor.organizationId,
          role: { in: ["OPERATIONS_MANAGER", "ADMIN"] },
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function listCustomerCities(actor: Actor) {
  const rows = await prisma.customer.findMany({
    where: { AND: [customerWhere(actor), { city: { not: null } }] },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((row) => row.city).filter((city): city is string => Boolean(city));
}
