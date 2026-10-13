import { currentUser } from '@/auth';
import SideNav from '@/app/ui/dashboard/sidenav';
import SidebarResizer from '@/app/ui/dashboard/sidebar-resizer';
import VoiceAgentWidget from '@/components/ui/voice-agent-widget';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
 
export const metadata: Metadata = {
  title: 'Dashboard',
};
 
export default async function Layout({ children }: { children: React.ReactNode }) {
  // The widget knows who is calling, so it doesn't ask for a name and email.
  const me = await currentUser();
  // Set by the sidebar actions and read here, so the first paint is already
  // the right width — no flash from expanded to collapsed, or from the
  // default width to the one you dragged to.
  const store = await cookies();
  const collapsed = store.get('sidebar')?.value === 'collapsed';
  // 192px is the old fixed w-48, so an account that has never dragged the
  // edge sees exactly what it saw before.
  const width = Number(store.get('sidebar-w')?.value) || 192;
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
      // The dragged width, as a custom property both the spacer and the fixed
      // panel below read. SidebarResizer rewrites it on this element during a
      // drag, which is what makes the sidebar track the pointer without a
      // server round trip per frame.
      style={{ '--sb-w': `${width}px` } as React.CSSProperties}
      className="group/sb flex min-h-screen flex-col md:flex-row"
    >
      <div className="w-full flex-none transition-[width] duration-200 motion-reduce:transition-none md:group-data-[dragging=true]/sb:transition-none md:w-[var(--sb-w)] md:group-data-[sidebar=collapsed]/sb:w-16">
        {/* `fixed`, not `sticky`: a sticky box is re-placed on every scroll
            step, and at fractional zoom (110%, 175%…) that lands on a
            fractional pixel. The sidebar's blurred glass pieces (logo,
            account, sign-out) are their own compositor layers and snap to the
            pixel grid differently from the plain-text links, so a few items
            sat a device pixel off the rest while the page scrolled. A fixed
            box never moves, so nothing has anything to round. The parent
            stays in the flex row as the 12rem spacer that keeps the content
            from sliding under it. */}
        <div className="transition-[width] duration-200 motion-reduce:transition-none md:group-data-[dragging=true]/sb:transition-none md:fixed md:inset-y-0 md:left-0 md:w-[var(--sb-w)] md:group-data-[sidebar=collapsed]/sb:w-16">
          <SideNav />
          {/* The sidebar's right edge: drag it to any width, or click the
              glass pill at its midpoint to snap it open or shut. A client
              island, because a pointer drag needs handlers — the sidebar
              itself stays a Server Component. */}
          <SidebarResizer collapsed={collapsed} width={width} />
        </div>
      </div>
      {/* min-w-0: a flex item won't shrink below its content by default, so a
          wide table would stretch this pane past the viewport and put a
          horizontal scrollbar on the document. The tables scroll sideways
          inside their own wrapper instead. */}
      {/* While a side panel is open (it sets data-panel on the shell) the page
          leaves room for it on the right, so the table's last columns and
          their controls stay in view instead of sliding under the card. */}
      <div className="min-w-0 grow p-6 transition-[padding] duration-300 motion-reduce:transition-none md:p-12 md:group-data-[panel=open]/sb:pr-[calc(max(var(--sb-w),20rem)+3rem)]">
        {children}
      </div>
      <VoiceAgentWidget
        caller={
          me ? { name: me.name ?? '', email: me.email ?? '' } : undefined
        }
      />
    </div>
  );
}