import {
  Boxes,
  Briefcase,
  Building2,
  Code2,
  Gauge,
  LineChart,
  ShieldCheck,
  UserRound,
  Zap,
  ArrowUpRight,
  Phone
} from 'lucide-react';

import CardSection, { type CardItem } from '@/components/ui/glass-card';

// Placeholder copy throughout — the shape is right, the words are yours.

const features: CardItem[] = [
  {
    icon: Gauge,
    title: 'Live dashboards',
    description:
      'Revenue, invoices and customers update as the data lands — no refresh, no nightly batch, no stale numbers in a meeting.',
  },
  {
    icon: Zap,
    title: 'Invoice automation',
    description:
      'Draft, send and reconcile in one pass. Overdue accounts chase themselves and settle back into the ledger on payment.',
  },
  {
    icon: ShieldCheck,
    title: 'Access you control',
    description:
      'Session-backed auth with per-role permissions, so finance sees the ledger and everyone else sees only their own work.',
  },
];

const useCases: CardItem[] = [
  {
    icon: Briefcase,
    title: 'Upgrade Your Business',
    description:
      'A voice that answers on the first ring, knows your prices, hours and policies, and never puts a caller on hold — a front desk your size of business could not otherwise staff.',
  },
  {
    icon: Phone,
    title: 'Log All Incoming Calls',
    description:
      'Every call arrives written down: who rang, what they wanted and what was agreed, summarised in your inbox so nothing survives only in someone’s memory.',
  },
  {
    icon: ArrowUpRight,
    title: 'Boost Your Growth',
    description:
      'The calls you miss today are bookings someone else takes. Answering all of them, at any hour, turns enquiries into appointments and orders into repeat customers.',
  },
];


const services: CardItem[] = [
  {
    icon: Code2,
    title: 'Web development',
    description:
      'Production Next.js builds with the routing, auth and data layers wired up — not a template you have to finish yourself.',
    href: '#',
  },
  {
    icon: Boxes,
    title: 'Cloud infrastructure',
    description:
      'Deploys, databases and edge caching set up to scale quietly, with the monitoring already in place when traffic arrives.',
    href: '#',
  },
  {
    icon: LineChart,
    title: 'Data & analytics',
    description:
      'Dashboards that answer the questions you actually ask, built on your own data rather than a vendor’s idea of a metric.',
    href: '#',
  },
];

export function FeaturesSection() {
  return (
    <CardSection
      id="features"
      eyebrow="The product"
      title="Features"
      description="Everything the dashboard does out of the box, before you write a line of your own."
      items={features}
    />
  );
}

export function UseCasesSection() {
  return (
    // No heading: "Use cases" now sits above the explorer in the globe's last
    // chapter, and these cards follow it.
    // Pulled up under the "Hear it live" card, with wider gaps between cards.
    <CardSection
      id="use-cases"
      items={useCases}
      className="-mt-12 max-w-none pt-0 md:px-16"
      gridClassName="gap-8 md:gap-12"
      compact
    />
  );
}

export function ServicesSection() {
  return (
    <CardSection
      id="services"
      eyebrow="What we do"
      title="Services"
      description="Where the product stops and we pick it up — built, deployed and handed over."
      items={services}
    />
  );
}
