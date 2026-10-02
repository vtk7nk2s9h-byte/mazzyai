// cn now lives alongside the other formatters in app/lib/utils. Re-exported
// here because components.json points the shadcn `utils` alias at @/lib/utils,
// which is what every component in components/ui imports.
export { cn } from '@/app/lib/utils';
