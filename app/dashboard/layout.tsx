import { currentUser } from '@/auth';
import SideNav from '@/app/ui/dashboard/sidenav';
import VoiceAgentWidget from '@/components/ui/voice-agent-widget';
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Dashboard',
};
 
export default async function Layout({ children }: { children: React.ReactNode }) {
  // The widget knows who is calling, so it doesn't ask for a name and email.
  const me = await currentUser();
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="w-full flex-none md:w-48">
        {/* `fixed`, not `sticky`: a sticky box is re-placed on every scroll
            step, and at fractional zoom (110%, 175%…) that lands on a
            fractional pixel. The sidebar's blurred glass pieces (logo,
            account, sign-out) are their own compositor layers and snap to the
            pixel grid differently from the plain-text links, so a few items
            sat a device pixel off the rest while the page scrolled. A fixed
            box never moves, so nothing has anything to round. The parent
            stays in the flex row as the 12rem spacer that keeps the content
            from sliding under it. */}
        <div className="md:fixed md:inset-y-0 md:left-0 md:w-48">
          <SideNav />
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