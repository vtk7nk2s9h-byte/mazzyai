import { currentUser } from '@/auth';
import SideNav from '@/app/ui/dashboard/sidenav';
import VoiceAgentWidget from '@/components/ui/voice-agent-widget';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { toggleSidebarAction } from '@/app/lib/sidebar-actions';
 
export const metadata: Metadata = {
  title: 'Dashboard',
};
 
export default async function Layout({ children }: { children: React.ReactNode }) {
  // The widget knows who is calling, so it doesn't ask for a name and email.
  const me = await currentUser();
  // Set by toggleSidebarAction; read here so the first paint is already the
  // right width.
  const collapsed = (await cookies()).get('sidebar')?.value === 'collapsed';
  return (
    // One scroller: the document's. This used to be an h-screen shell with
    // `overflow-hidden` and a `overflow-y-auto` content pane inside it, which
    // gave the page a second, nested scrollbar — and once the document itself
    // grew past the viewport, the whole 100vh shell scrolled away and took the
    // sidebar with it, leaving the account block stranded mid-page.
    //
    // min-h-screen lets the page be as tall as its content, and the sidebar is
    // pinned with `fixed` rather than by clipping: it holds its own 100vh
    // column while the content scrolls past. Below md it's a plain row at the
    // top, so there's nothing to pin.
    <div
      data-sidebar={collapsed ? 'collapsed' : 'expanded'}
      className="group/sb flex min-h-screen flex-col md:flex-row"
    >
      <div className="w-full flex-none transition-[width] duration-200 motion-reduce:transition-none md:w-48 md:group-data-[sidebar=collapsed]/sb:w-16">
        {/* `fixed`, not `sticky`: a sticky box is re-placed on every scroll
            step, and at fractional zoom (110%, 175%…) that lands on a
            fractional pixel. The sidebar's blurred glass pieces (logo,
            account, sign-out) are their own compositor layers and snap to the
            pixel grid differently from the plain-text links, so a few items
            sat a device pixel off the rest while the page scrolled. A fixed
            box never moves, so nothing has anything to round. The parent
            stays in the flex row as the 12rem spacer that keeps the content
            from sliding under it. */}
        <div className="transition-[width] duration-200 motion-reduce:transition-none md:fixed md:inset-y-0 md:left-0 md:w-48 md:group-data-[sidebar=collapsed]/sb:w-16">
          <SideNav />
          {/* Straddles the sidebar's right edge, near the top and level with
              the logo plate's top edge — outside the sidebar proper, so it
              never competes with the nav. Grey at rest, red on hover. A form
              rather than a client component: the action flips a cookie and
              the layout re-renders with the new width. */}
          <form
            action={toggleSidebarAction}
            className="absolute -right-3 top-1.5 z-20 hidden md:block"
          >
            <button
              type="submit"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.12] bg-ink-900/80 text-gray-500 backdrop-blur-xl transition-colors hover:border-brand-red-lit/60 hover:text-brand-red-lit"
            >
              <ChevronLeftIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none md:group-data-[sidebar=collapsed]/sb:rotate-180"
              />
            </button>
          </form>
        </div>
      </div>
      {/* min-w-0: a flex item won't shrink below its content by default, so a
          wide table would stretch this pane past the viewport and put a
          horizontal scrollbar on the document. The tables scroll sideways
          inside their own wrapper instead. */}
      <div className="min-w-0 grow p-6 md:p-12">{children}</div>
      <VoiceAgentWidget
        caller={
          me ? { name: me.name ?? '', email: me.email ?? '' } : undefined
        }
      />
    </div>
  );
}