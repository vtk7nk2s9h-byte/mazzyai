'use client';
import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import ThemeToggle from '@/app/ui/theme-toggle';
import LogoutButton from '@/app/ui/log-out-button';
import { useRouter } from 'next/navigation';
import { bowlby, inter } from '@/app/ui/fonts';
import { createPortal } from 'react-dom';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { LucideIcon } from 'lucide-react';
import {
    CodeIcon,
    GlobeIcon,
    LayersIcon,
    UserPlusIcon,
    Users,
    Star,
    FileText,
    Shield,
    RotateCcw,
    Handshake,
    Leaf,
    HelpCircle,
    BarChart,
    PlugIcon,
} from 'lucide-react';

type LinkItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    description?: string;
};

// Shared hover treatment for the text items on the bar: the label turns the
// system red and a red underline lights up beneath it. The border is always
// there but transparent, so nothing shifts by a pixel when it appears, and the
// padding is tight so the rule sits right under the letters rather than at the
// edge of a roomy hit area. The glow is offset downward to bloom off the rule.
const barItem =
    'rounded-none border-b-2 border-transparent px-1 pb-0.5 ' +
    'transition-[color,border-color,box-shadow] duration-200 ' +
    'hover:border-brand-red hover:text-brand-red hover:shadow-[0_5px_12px_-8px_rgba(140,25,37,0.95)]';

// Buttons keep their full outline — they are controls, not labels — so they get
// the colour shift without the underline.
const barButton =
    'transition-[color,border-color,box-shadow] duration-200 ' +
    'hover:border-brand-red hover:text-brand-red hover:bg-transparent';

export function Header() {
    const [open, setOpen] = React.useState(false);
    const scrolled = useScroll(10);
    const router = useRouter();

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    return (
        // text-white on the bar colours the wordmark, triggers and links; the
        // dropdown viewport re-asserts text-popover-foreground, so the panels
        // hanging below it are unaffected.
        <header
            className={cn(
                'sticky top-0 z-50 w-full text-white',
                // Frosted glass at 10% fill — 90% transparent. A white tint at
                // low alpha over a dark page desaturates into exactly the grey
                // scrim we had; tinting with the brand red instead keeps the
                // pane warm and lets the background's colour carry through.
                // The fill must stay translucent or the blur has nothing to
                // sample, and saturate stops what shows through going flat.
                // Light blur only: at 2xl the frosting smeared the grid and
                // streaks behind it into a flat wash. A few px still reads as
                // glass while letting the background pattern show through.
                'bg-brand-red/10 backdrop-blur-sm backdrop-saturate-200',
                // Lit top lip and a faint bottom edge: glass reads as a pane
                // with thickness, not a flat wash.
                'shadow-[inset_0_1px_0_rgba(255,214,219,0.3),inset_0_-1px_0_rgba(255,255,255,0.07),0_10px_30px_-24px_rgba(0,0,0,0.9)]',
                {
                    'bg-brand-red/[0.16] shadow-[inset_0_1px_0_rgba(255,214,219,0.3),inset_0_-1px_0_rgba(255,255,255,0.07),0_18px_40px_-22px_rgba(0,0,0,1)]':
                        scrolled,
                },
            )}
        >
            <nav
                className={cn(
                    bowlby.className,
                    'flex h-20 w-full items-center justify-between px-4 md:px-6 tracking-wider',
                )}
            >
                <div className="flex items-center gap-10">
                    <a href="#" className={cn(barItem, 'shrink-0')} aria-label="MazzyAI home">

                        <Image
                            src="/mazzyai-phone-logo.svg"
                            alt="MazzyAI"
                            width={794}
                            height={584}
                            priority
                            unoptimized
                            className="h-14 w-auto"
                        />
                    </a>
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList className="space-x-4">
                            <NavigationMenuItem>
                                <NavigationMenuTrigger
                                    className={cn(
                                        barItem,
                                        'h-auto py-0 text-white focus:text-brand-red data-[state=open]:text-brand-red data-[state=open]:border-brand-red bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                                    )}
                                >
                                    Product
                                </NavigationMenuTrigger>
                                <NavigationMenuContent
                                    className={cn(inter.className, 'bg-background p-1 pr-1.5')}
                                >
                                    <ul className="bg-popover grid w-[32rem] grid-cols-2 gap-2 rounded-md border p-2 shadow">
                                        {productLinks.map((item, i) => (
                                            <li key={i}>
                                                <ListItem {...item} />
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="p-2">
                                        <p className="text-muted-foreground text-sm">
                                            Interested?{' '}
                                            <a href="#" className="text-foreground font-medium hover:underline">
                                                Schedule a demo
                                            </a>
                                        </p>
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger
                                    className={cn(
                                        barItem,
                                        'h-auto py-0 text-white focus:text-brand-red data-[state=open]:text-brand-red data-[state=open]:border-brand-red bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                                    )}
                                >
                                    Company
                                </NavigationMenuTrigger>
                                <NavigationMenuContent
                                    className={cn(inter.className, 'bg-background p-1 pr-1.5 pb-1.5')}
                                >
                                    <div className="grid w-[32rem] grid-cols-2 gap-2">
                                        <ul className="bg-popover space-y-2 rounded-md border p-2 shadow">
                                            {companyLinks.map((item, i) => (
                                                <li key={i}>
                                                    <ListItem {...item} />
                                                </li>
                                            ))}
                                        </ul>
                                        <ul className="space-y-2 p-3">
                                            {companyLinks2.map((item, i) => (
                                                <li key={i}>
                                                    <NavigationMenuLink
                                                        href={item.href}
                                                        className="flex p-2 flex-row rounded-lg border border-transparent items-center gap-x-2 transition-colors hover:border-brand-red focus-visible:border-brand-red"
                                                    >
                                                        <item.icon className="text-foreground size-4" />
                                                        <span className="font-medium">{item.title}</span>
                                                    </NavigationMenuLink>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuLink className="px-4" asChild>
                                <a href="#" className={cn(barItem, 'text-white')}>
                                    Pricing
                                </a>
                            </NavigationMenuLink>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
                <div className="hidden items-center gap-10 md:flex">
                    {/* type="button" so the door animation runs first; the
                        navigation fires when the figure is through. */}
                    {/* onStart, not onLogout: navigation fires on the click so
                        /login begins loading straight away, and the figure
                        finishes walking on its own. The header lives in the
                        root layout and survives the navigation, so the button
                        has to reset itself — resetAfter does that, and it is
                        back to idle long before the user navigates back. */}
                    <LogoutButton
                        label="Log in"
                        variant="bar"
                        onStartAction={() => router.push('/login')}
                    />
                    <ThemeToggle></ThemeToggle>
                </div>
                <div className="flex items-center gap-5 md:hidden">
                    
                   
                    <Button
                        size="icon"
                        variant="outline"
                        className={cn(barButton, 'border-white/30 bg-transparent text-white')}
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                        aria-label="Toggle menu"
                    >
                        <MenuToggleIcon open={open} className="size-5" duration={300} />
                    </Button>
                </div>
            </nav>
            <MobileMenu open={open} className="flex flex-col justify-between gap-2 overflow-y-auto">
                <NavigationMenu className="max-w-full">
                    <div className="flex w-full flex-col gap-y-2">
                        <span className="text-sm">Product</span>
                        {productLinks.map((link) => (
                            <ListItem key={link.title} {...link} />
                        ))}
                        <span className="text-sm">Company</span>
                        {companyLinks.map((link) => (
                            <ListItem key={link.title} {...link} />
                        ))}
                        {companyLinks2.map((link) => (
                            <ListItem key={link.title} {...link} />
                        ))}
                    </div>
                </NavigationMenu>
                <div className="flex flex-col gap-2">
                    <LogoutButton
                        label="Log in"
                        variant="brand"
                        onStartAction={() => {
                            router.push('/login');
                            setOpen(false);
                        }}
                        className="w-full justify-between"
                    />
                </div>
            </MobileMenu>
        </header>
    );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
    open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
    if (!open || typeof window === 'undefined') return null;

    return createPortal(
        <div
            id="mobile-menu"
            className={cn(
                'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
                // top must track the header's h-20 or the sheet slides under it.
                'fixed top-20 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden',
            )}
        >
            <div
                data-slot={open ? 'open' : 'closed'}
                className={cn(
                    'data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 ease-out',
                    'size-full p-4',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

function ListItem({
    title,
    description,
    icon: Icon,
    className,
    href,
    ...props
}: React.ComponentProps<typeof NavigationMenuLink> & LinkItem) {
    return (
        <NavigationMenuLink className={cn('w-full flex flex-row gap-x-2 rounded-lg border border-transparent p-2 transition-colors hover:border-brand-red focus-visible:border-brand-red data-[active=true]:border-brand-red data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground', className)} {...props} asChild>
            <a href={href}>
                <div className="bg-background/40 flex aspect-square size-12 items-center justify-center rounded-md border shadow-sm">
                    <Icon className="text-foreground size-5" />
                </div>
                <div className="flex flex-col items-start justify-center">
                    <span className="font-medium">{title}</span>
                    <span className="text-muted-foreground text-xs">{description}</span>
                </div>
            </a>
        </NavigationMenuLink>
    );
}

const productLinks: LinkItem[] = [
    {
        title: 'Website Builder',
        href: '#',
        description: 'Create responsive websites with ease',
        icon: GlobeIcon,
    },
    {
        title: 'Cloud Platform',
        href: '#',
        description: 'Deploy and scale apps in the cloud',
        icon: LayersIcon,
    },
    {
        title: 'Team Collaboration',
        href: '#',
        description: 'Tools to help your teams work better together',
        icon: UserPlusIcon,
    },
    {
        title: 'Analytics',
        href: '#',
        description: 'Track and analyze your website traffic',
        icon: BarChart,
    },
    {
        title: 'Integrations',
        href: '#',
        description: 'Connect your apps and services',
        icon: PlugIcon,
    },
    {
        title: 'API',
        href: '#',
        description: 'Build custom integrations with our API',
        icon: CodeIcon,
    },
];

const companyLinks: LinkItem[] = [
    {
        title: 'About Us',
        href: '#',
        description: 'Learn more about our story and team',
        icon: Users,
    },
    {
        title: 'Customer Stories',
        href: '#',
        description: 'See how we’ve helped our clients succeed',
        icon: Star,
    },
    {
        title: 'Partnerships',
        href: '#',
        icon: Handshake,
        description: 'Collaborate with us for mutual growth',
    },
];

const companyLinks2: LinkItem[] = [
    {
        title: 'Terms of Service',
        href: '#',
        icon: FileText,
    },
    {
        title: 'Privacy Policy',
        href: '#',
        icon: Shield,
    },
    {
        title: 'Refund Policy',
        href: '#',
        icon: RotateCcw,
    },
    {
        title: 'Blog',
        href: '#',
        icon: Leaf,
    },
    {
        title: 'Help Center',
        href: '#',
        icon: HelpCircle,
    },
];


function useScroll(threshold: number) {
    const [scrolled, setScrolled] = React.useState(false);

    const onScroll = React.useCallback(() => {
        setScrolled(window.scrollY > threshold);
    }, [threshold]);

    React.useEffect(() => {
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [onScroll]);

    // also check on first load
    React.useEffect(() => {
        onScroll();
    }, [onScroll]);

    return scrolled;
}
