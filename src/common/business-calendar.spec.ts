import {
  countCalendarBusinessOverdueDays,
  countOverduePenaltyDays,
  isAfterLibraryClosing,
  canReserveLibraryLoan,
  isBusinessDay,
  shouldApplyDailyPenaltyLogic,
  resetHolidayCacheForTests,
} from './business-calendar';

describe('business-calendar', () => {
  beforeEach(() => {
    resetHolidayCacheForTests();
    delete process.env.HOLIDAY_DATES;
  });

  describe('isAfterLibraryClosing / canReserveLibraryLoan', () => {
    it('permite reserva en sala antes de las 19:00', () => {
      const d = new Date(2026, 4, 20, 18, 30, 0);
      expect(isAfterLibraryClosing(d)).toBe(false);
      expect(canReserveLibraryLoan(d)).toBe(true);
    });

    it('bloquea reserva en sala a las 19:00 o después', () => {
      const at19 = new Date(2026, 4, 20, 19, 0, 0);
      const after = new Date(2026, 4, 20, 21, 0, 0);
      expect(isAfterLibraryClosing(at19)).toBe(true);
      expect(canReserveLibraryLoan(at19)).toBe(false);
      expect(isAfterLibraryClosing(after)).toBe(true);
    });
  });

  describe('isBusinessDay', () => {
    it('sábado y domingo no son hábiles', () => {
      expect(isBusinessDay(new Date(2026, 4, 23))).toBe(false); // sábado
      expect(isBusinessDay(new Date(2026, 4, 24))).toBe(false); // domingo
    });

    it('lunes es hábil', () => {
      expect(isBusinessDay(new Date(2026, 4, 25))).toBe(true);
    });

    it('feriado configurado no es hábil', () => {
      process.env.HOLIDAY_DATES = '2026-05-25';
      resetHolidayCacheForTests();
      expect(isBusinessDay(new Date(2026, 4, 25))).toBe(false);
    });
  });

  describe('countCalendarBusinessOverdueDays', () => {
    it('no cuenta sábado ni domingo entre vencimiento y hoy', () => {
      const due = new Date(2026, 4, 22, 23, 0, 0); // viernes
      const monday = new Date(2026, 4, 25, 10, 0, 0);
      expect(countCalendarBusinessOverdueDays(due, monday)).toBe(1);
    });

    it('cuenta tres días hábiles consecutivos', () => {
      const due = new Date(2026, 4, 18, 12, 0, 0); // lunes
      const thu = new Date(2026, 4, 21, 12, 0, 0);
      expect(countCalendarBusinessOverdueDays(due, thu)).toBe(3);
    });
  });

  describe('countOverduePenaltyDays (simulación en tests)', () => {
    it('45 segundos en día hábil => día penalización 1', () => {
      const due = new Date(2026, 4, 20, 10, 0, 0);
      const now = new Date(due.getTime() + 45 * 1000);
      expect(countOverduePenaltyDays(due, now)).toBe(1);
    });

    it('en sábado el contador de días de penalización es 0', () => {
      const due = new Date(2026, 4, 22, 10, 0, 0);
      const saturday = new Date(2026, 4, 23, 10, 0, 45);
      expect(countOverduePenaltyDays(due, saturday)).toBe(0);
    });
  });

  describe('shouldApplyDailyPenaltyLogic', () => {
    it('es false en domingo', () => {
      expect(shouldApplyDailyPenaltyLogic(new Date(2026, 4, 24))).toBe(false);
    });

    it('es true en miércoles', () => {
      expect(shouldApplyDailyPenaltyLogic(new Date(2026, 4, 20))).toBe(true);
    });
  });
});
