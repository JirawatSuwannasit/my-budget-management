export type FinancialCycle = {
  start: Date;
  end: Date;
  label: string;
  daysRemaining: number;
};

function atLocalNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function formatCycleDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function getFinancialCycle(inputDate: Date): FinancialCycle {
  const date = atLocalNoon(inputDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = day >= 25 ? new Date(year, month, 25, 12) : new Date(year, month - 1, 25, 12);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 24, 12);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - date.getTime()) / millisecondsPerDay) + 1);

  return {
    start,
    end,
    label: formatCycleDate(start) + " - " + formatCycleDate(end),
    daysRemaining
  };
}

export function getSalaryPaymentForCycle(cycleStart: Date) {
  const salaryDate = atLocalNoon(cycleStart);
  const day = salaryDate.getDay();

  if (day === 6) {
    return new Date(salaryDate.getFullYear(), salaryDate.getMonth(), salaryDate.getDate() - 1, 12);
  }

  if (day === 0) {
    return new Date(salaryDate.getFullYear(), salaryDate.getMonth(), salaryDate.getDate() - 2, 12);
  }

  return salaryDate;
}

export function getCycleStartForSalaryPayment(actualPaymentDate: Date) {
  const paymentDate = atLocalNoon(actualPaymentDate);
  const normalCycle = getFinancialCycle(paymentDate).start;
  const possibleNextCycle = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 25, 12);
  const possibleNextPayment = getSalaryPaymentForCycle(possibleNextCycle);

  if (possibleNextPayment.toDateString() === paymentDate.toDateString()) {
    return possibleNextCycle;
  }

  return normalCycle;
}
