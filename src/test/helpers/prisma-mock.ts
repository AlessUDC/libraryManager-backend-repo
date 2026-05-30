import { PrismaClient } from "@prisma/client";

export type PrismaMock = {
  [K in keyof PrismaClient]: PrismaClient[K] extends Function
    ? jest.Mock<any, any>
    : {
        [M in keyof PrismaClient[K]]: jest.Mock<any, any>;
      } & Record<string, any>;
} & {
  $transaction: jest.Mock<any, any>;
} & Record<string, any>;

/** Crea un mock parcial de PrismaClient con métodos jest.fn() */
export function createPrismaMock() {
  const mock = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    copy: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    fine: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sanction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaMock;

  mock.$transaction.mockImplementation(
    async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mock) => Promise<unknown>)(mock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    },
  );

  return mock;
}
