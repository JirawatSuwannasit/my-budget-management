import { BarChart3, BellRing, CreditCard, LayoutDashboard, LineChart, ListChecks, Settings, Tag, WalletCards, type LucideIcon } from "lucide-react";
import { dictionaries, type Locale } from "../../lib/i18n/dictionaries";

export type NavigationItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  mobilePrimary: boolean;
  mobileMoreOrder: number | null;
};

export function getNavigationItems(locale: Locale): NavigationItem[] {
  const nav = dictionaries[locale].nav;
  return [
    { href: "/dashboard", label: nav.dashboard, short: nav.shortDashboard, icon: LayoutDashboard, mobilePrimary: true, mobileMoreOrder: null },
    { href: "/accounts", label: nav.accounts, short: nav.shortAccounts, icon: WalletCards, mobilePrimary: false, mobileMoreOrder: 0 },
    { href: "/transactions", label: nav.transactions, short: nav.shortTransactions, icon: ListChecks, mobilePrimary: true, mobileMoreOrder: null },
    { href: "/planning", label: nav.planning, short: nav.shortPlanning, icon: BarChart3, mobilePrimary: true, mobileMoreOrder: null },
    { href: "/categories", label: nav.categories, short: nav.shortCategories, icon: Tag, mobilePrimary: false, mobileMoreOrder: 2 },
    { href: "/debts-cards", label: nav.debtsCards, short: nav.shortDebtsCards, icon: CreditCard, mobilePrimary: false, mobileMoreOrder: 1 },
    { href: "/upcoming", label: nav.upcoming, short: nav.shortUpcoming, icon: BellRing, mobilePrimary: true, mobileMoreOrder: null },
    { href: "/reports", label: nav.reports, short: nav.shortReports, icon: LineChart, mobilePrimary: false, mobileMoreOrder: 3 },
    { href: "/settings", label: nav.settings, short: nav.shortSettings, icon: Settings, mobilePrimary: false, mobileMoreOrder: 4 }
  ];
}
