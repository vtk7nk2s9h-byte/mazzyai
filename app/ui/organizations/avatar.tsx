import { Avatar } from '@/components/ui/avatar';
import { cn, initialsOf } from '@/app/lib/utils';

/**
 * The org's mark next to its name, as the customer photo sits in the invoices
 * table — and, since a user has the same two inputs (a name and maybe an
 * image), the one avatar the rest of the app uses too. Orgs rarely have a logo
 * uploaded, so the initials carry most rows.
 *
 * `sm` is HeroUI's 40px shrunk to 28px for a table row; `lg` is its 64px.
 * Pass `className` to override the size where a row needs something else.
 */
export default function OrgAvatar({
  name,
  logoUrl,
  size = 'sm',
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <Avatar
      size={size}
      alt={name}
      className={cn(size === 'sm' && 'size-7', className)}
    >
      <Avatar.Image src={logoUrl} alt={`${name} logo`} />
      <Avatar.Fallback>{initialsOf(name)}</Avatar.Fallback>
    </Avatar>
  );
}
