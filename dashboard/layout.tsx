import SideNav from '@/app/ui/dashboard/sidenav';
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Dashboard',
};
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // One scroller: the document's. This used to be an h-screen shell with
    // `overflow-hidden` and a `overflow-y-auto` content pane inside it, which
    // gave the page a second, nested scrollbar — and once the document itself
    // grew past the viewport, the whole 100vh shell scrolled away and took the
    // sidebar with it, leaving the account block stranded mid-page.
    //
    // min-h-screen lets the page be as tall as its content, and the sidebar is
    // pinned with `sticky` rather than by clipping: it holds its own 100vh
    // column while the content scrolls past. Below md it's a plain row at the
    // top, so there's nothing to stick.
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="w-full flex-none md:sticky md:top-0 md:h-screen md:w-48">
        <SideNav />
      </div>
      {/* min-w-0: a flex item won't shrink below its content by default, so a
          wide table would stretch this pane past the viewport and put a
          horizontal scrollbar on the document. The tables scroll sideways
          inside their own wrapper instead. */}
      <div className="min-w-0 grow p-6 md:p-12">{children}</div>
    </div>
  );
}