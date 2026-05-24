/** Crea un mock parcial de PrismaClient con métodos jest.fn() */
export function createPrismaMock() {
  const mock: Record<string, unknown> = {
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
  };

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

export type PrismaMock = ReturnType<typeof createPrismaMock>;
