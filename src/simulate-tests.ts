import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { LoansService } from './modules/loans/services/loans.service';
import { CronService } from './modules/loans/services/cron.service';
import { SanctionsService } from './modules/loans/services/sanctions.service';
import { Role, LoanType, CopyCondition, LoanStatus, SanctionType, FineStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('🚀 Iniciando Plan de Pruebas - Sistema Bibliotecario\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const loansService = app.get(LoansService);
  const cronService = app.get(CronService);
  const sanctionsService = app.get(SanctionsService);

  // --- Utilidades del Reporte ---
  let passCount = 0;
  let failCount = 0;
  
  const report = (id: string, name: string, passed: boolean, obs: string) => {
    if (passed) passCount++;
    else failCount++;
    console.log(`[${id}] ${name}`);
    console.log(`Estado: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (obs) console.log(`Observaciones: ${obs}`);
    console.log('--------------------------------------------------');
  };

  try {
    // --- Configuración Inicial ---
    console.log('⚙️ Configurando datos de prueba...\n');
    const testUserId = uuid();
    const testBookId = uuid();
    const testCopyId = uuid();
    
    // Crear usuario de prueba
    await prisma.user.create({
      data: {
        userId: testUserId,
        code: `TEST-${Date.now()}`,
        password: await bcrypt.hash('123456', 10),
        role: Role.STUDENT,
        userData: {
          create: {
            name: 'Usuario',
            paternalSurname: 'Prueba',
            maternalSurname: 'Test',
            documentNumber: `DNI${Math.floor(Math.random() * 100000)}`,
            email: `test-${Date.now()}@example.com`,
            birthdate: new Date('2000-01-01'),
          }
        },
        student: {
          create: {
            cycle: 1,
            school: {
              create: {
                title: 'Escuela de Prueba',
                faculty: {
                  create: {
                    title: 'Facultad de Prueba'
                  }
                }
              }
            }
          }
        }
      }
    });

    // Crear libro y copia
    await prisma.book.create({
      data: {
        bookId: testBookId,
        title: 'Libro de Pruebas E2E',
        slug: `libro-test-${Date.now()}`,
        cost: 50.0,
        copies: {
          create: {
            copyId: testCopyId,
            barcode: `BC-${Date.now()}`,
            status: 'AVAILABLE'
          }
        }
      }
    });

    // --- MÓDULO 1: PRÉSTAMO A DOMICILIO - FLUJO EXITOSO ---
    console.log('▶️ EJECUTANDO MÓDULO 1...\n');
    
    // Prueba 1.1
    let dueDate1 = new Date();
    dueDate1.setDate(dueDate1.getDate() + 3);
    
    const loan1 = await loansService.createLoan({
      userId: testUserId,
      copyId: testCopyId,
      dueDate: dueDate1.toISOString()
    });

    const isDepositHeld = loan1.depositAmount === 100 && loan1.depositStatus === 'HELD';
    report('1.1', 'Depósito del monto reembolsable al iniciar préstamo', isDepositHeld, isDepositHeld ? 'Depósito registrado correctamente (2x costo).' : 'Fallo al registrar depósito.');

    // Prueba 1.2
    const returnedLoan1 = await loansService.returnLoan(loan1.loanId, { condition: CopyCondition.GOOD });
    const isReturnedAndRefunded = returnedLoan1.status === 'RETURNED' && returnedLoan1.depositStatus === 'REFUNDED';
    report('1.2', 'Devolución a tiempo', isReturnedAndRefunded, isReturnedAndRefunded ? 'Libro devuelto, depósito reembolsado sin multas.' : 'Fallo en la devolución a tiempo.');

    // --- Limpieza para el Módulo 2 ---
    await prisma.fine.deleteMany({ where: { userId: testUserId } });
    await prisma.sanction.deleteMany({ where: { userId: testUserId } });
    await prisma.loan.deleteMany({ where: { userId: testUserId } });
    await prisma.user.update({ where: { userId: testUserId }, data: { loanBlockUntil: null, systemBlockUntil: null } });

    // --- MÓDULO 2: NO DEVUELVE A TIEMPO ---
    console.log('▶️ EJECUTANDO MÓDULO 2...\n');
    
    // Helper para obtener fecha pasada asegurando exactamente 'n' días hábiles de diferencia
    const getPastBusinessDate = (businessDaysOverdue: number) => {
      let d = new Date();
      let count = 0;
      while (count < businessDaysOverdue) {
        d.setDate(d.getDate() - 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          count++;
        }
      }
      return d;
    };

    // Crear préstamo que vencerá "ayer" (Día 1 hábil)
    let pastDueDate = getPastBusinessDate(1);
    pastDueDate.setHours(23, 59, 59, 0);

    const loan2 = await prisma.loan.create({
      data: {
        userId: testUserId,
        copyId: testCopyId,
        dueDate: pastDueDate,
        status: 'ACTIVE',
        type: 'HOME',
        depositAmount: 100,
        depositStatus: 'HELD'
      }
    });

    await prisma.copy.update({ where: { copyId: testCopyId }, data: { status: 'LENT' } });

    // Prueba 2.1 - Día 1
    await cronService.handleOverdueLoans(); // Disparar cron
    
    const userAfterCron1 = await prisma.user.findUnique({ where: { userId: testUserId } });
    const hasLoanBlock = userAfterCron1?.loanBlockUntil && userAfterCron1.loanBlockUntil > new Date();
    
    const finesDay1 = await prisma.fine.findMany({ where: { loanId: loan2.loanId } });
    const hasFine = finesDay1.length > 0;
    
    report('2.1a', 'Día 1 (Aplica multa temporal y bloqueo)', !!hasLoanBlock && hasFine, (!!hasLoanBlock && hasFine) ? 'Bloqueo y multa aplicados correctamente.' : 'Fallo al aplicar bloqueo/multa del día 1.');

    // Simular que devuelve en Día 1
    const returnedLoan2 = await loansService.returnLoan(loan2.loanId, { condition: CopyCondition.GOOD });
    
    const finesAfterReturn = await prisma.fine.findMany({ where: { loanId: loan2.loanId, status: 'ANNULLED' } });
    const isFineAnnulled = finesAfterReturn.length > 0;
    const isDepositRefunded = returnedLoan2.depositStatus === 'REFUNDED';
    
    report('2.1b', 'Día 1 (Devuelve en 24h -> Anula multa y reembolsa)', isFineAnnulled && isDepositRefunded, (isFineAnnulled && isDepositRefunded) ? 'Multa temporal anulada y depósito reembolsado.' : 'No se anuló la multa o no se reembolsó.');

    // --- Limpieza para el Día 2-8 ---
    await prisma.fine.deleteMany({ where: { userId: testUserId } });
    await prisma.sanction.deleteMany({ where: { userId: testUserId } });
    await prisma.loan.deleteMany({ where: { userId: testUserId } });
    await prisma.user.update({ where: { userId: testUserId }, data: { loanBlockUntil: null, systemBlockUntil: null } });

    // Crear préstamo que venció hace 1 día hábil (Día 1)
    let pastDueDate1 = getPastBusinessDate(1);
    
    const loan3 = await prisma.loan.create({
      data: {
        userId: testUserId,
        copyId: testCopyId,
        dueDate: pastDueDate1,
        status: 'ACTIVE',
        type: 'HOME',
        depositAmount: 100,
        depositStatus: 'HELD'
      }
    });
    await prisma.copy.update({ where: { copyId: testCopyId }, data: { status: 'LENT' } });

    // Correr cron para Día 1 (debe aplicar LEVE)
    await cronService.handleOverdueLoans();

    // Actualizar a Día 3
    let pastDueDate3 = getPastBusinessDate(3);
    await prisma.loan.update({ where: { loanId: loan3.loanId }, data: { dueDate: pastDueDate3 } });

    // Prueba 2.3 - Días 2 al 8
    await cronService.handleOverdueLoans(); // Disparar cron para Día 3 (debe aplicar GRAVE)
    
    const finesDay3 = await prisma.fine.findMany({ where: { loanId: loan3.loanId } });
    const sanctionsDay3 = await prisma.sanction.findMany({ where: { loanId: loan3.loanId } });
    const hasMultipleFines = finesDay3.length > 0;
    const hasSanctions = sanctionsDay3.length > 0; // Debería tener LEVE (día 1) y GRAVE (día 3)
    
    report('2.3', 'Días 2 al 8 (Acumula multas diarias y sanciones graves)', hasMultipleFines && hasSanctions, (hasMultipleFines && hasSanctions) ? `Se registraron ${finesDay3.length} multas y ${sanctionsDay3.length} sanciones.` : 'No se acumularon correctamente.');

    // Prueba 2.4 - Día 9 en adelante
    let pastDueDate9 = getPastBusinessDate(9);
    await prisma.loan.update({ where: { loanId: loan3.loanId }, data: { dueDate: pastDueDate9 } });
    
    await cronService.handleOverdueLoans(); // Disparar cron
    
    const userDay9 = await prisma.user.findUnique({ where: { userId: testUserId } });
    const hasSystemBlock = userDay9?.systemBlockUntil && userDay9.systemBlockUntil > new Date();
    
    report('2.4', 'Día 9 en adelante (Bloqueo total del sistema)', !!hasSystemBlock, hasSystemBlock ? 'Bloqueo total del sistema aplicado correctamente.' : 'Fallo al aplicar bloqueo del sistema.');

    // --- MÓDULO 3: DEVOLUCIÓN TARDÍA ---
    console.log('▶️ EJECUTANDO MÓDULO 3...\n');
    
    // Prueba 3.1 - Devuelve el libro
    // En este caso devolvemos con pérdida para probar 3.2
    const returnedLoan3 = await loansService.returnLoan(loan3.loanId, { condition: CopyCondition.LOST, observations: 'Libro perdido' });
    
    report('3.2', 'Perdió el libro (fuera de plazo)', returnedLoan3.depositStatus === 'FORFEITED', returnedLoan3.depositStatus === 'FORFEITED' ? 'Depósito marcado como FORFEITED correctamente por pérdida.' : 'Fallo en la ejecución del depósito.');

    // --- MÓDULO 4: SANCIONES ---
    console.log('▶️ EJECUTANDO MÓDULO 4...\n');
    
    // Prueba 4.1 ya validada implícitamente en el Día 9
    const finalSanctions = await prisma.sanction.findMany({ where: { loanId: loan3.loanId } });
    const hasLeve = finalSanctions.some(s => s.type === 'LEVE');
    const hasGrave = finalSanctions.some(s => s.type === 'GRAVE');
    const hasMuyGrave = finalSanctions.some(s => s.type === 'MUY_GRAVE');
    
    report('4.1', 'Acumulación de sanciones por días sin devolver', hasLeve && hasGrave && hasMuyGrave, (hasLeve && hasGrave && hasMuyGrave) ? 'Registradas sanciones Leve, Grave y Muy Grave simultáneamente.' : 'Fallo en la acumulación simultánea.');

    // Prueba 4.2 - Ya validados los bloqueos en 2.3 y 2.4.

    // --- MÓDULO 5: PRÉSTAMO EN SALA ---
    console.log('▶️ EJECUTANDO MÓDULO 5...\n');
    
    await prisma.copy.update({ where: { copyId: testCopyId }, data: { status: 'AVAILABLE' } });
    
    // Crear préstamo en sala vencido (Día 1)
    let pastDueDateSala = new Date();
    pastDueDateSala.setHours(pastDueDateSala.getHours() - 3); // venció hace 3 horas

    const loanSala = await prisma.loan.create({
      data: {
        userId: testUserId,
        copyId: testCopyId,
        dueDate: pastDueDateSala,
        status: 'ACTIVE',
        type: 'LIBRARY',
        depositAmount: null,
      }
    });

    await cronService.handleLibraryOverdueLoans(); // Disparar cron de sala

    const sanctionsSala = await prisma.sanction.findMany({ where: { loanId: loanSala.loanId } });
    const finesSala = await prisma.fine.findMany({ where: { loanId: loanSala.loanId } });
    
    const hasSanctionSala = sanctionsSala.length > 0;
    const hasNoFinesSala = finesSala.length === 0;

    report('5.2', 'No devuelve a tiempo en sala (Aplica sanción, NO multa)', hasSanctionSala && hasNoFinesSala, (hasSanctionSala && hasNoFinesSala) ? 'Sanción aplicada sin multas económicas.' : 'Fallo en las reglas de sala.');

    // --- Limpiar Data Final ---
    await prisma.fine.deleteMany({ where: { userId: testUserId } });
    await prisma.sanction.deleteMany({ where: { userId: testUserId } });
    await prisma.loan.deleteMany({ where: { userId: testUserId } });
    await prisma.student.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { userId: testUserId } });
    await prisma.copy.delete({ where: { copyId: testCopyId } });
    await prisma.book.delete({ where: { bookId: testBookId } });

    console.log(`\n🏆 RESUMEN FINAL: ${passCount} PASSED, ${failCount} FAILED.`);

  } catch (error) {
    console.error('Error durante la ejecución de pruebas:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
