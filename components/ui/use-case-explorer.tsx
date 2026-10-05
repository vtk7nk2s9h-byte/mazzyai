'use client';

import * as React from 'react';
import {
  Briefcase,
  Building2,
  Car,
  GraduationCap,
  Landmark,
  PackageOpen,
  Plane,
  Scissors,
  ShoppingCart,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { cn } from "@/app/lib/utils.ts"
import CallRecording from '@/components/ui/call-recording';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

type Business = {
  name: string;
  tagline: string;
  points: string[];
};

type Category = {
  /** Stands in for the sector everywhere its name appears. */
  icon: LucideIcon;
  label: string;
  /** Sector-wide caveat, shown above the detail where one applies. */
  note?: string;
  businesses: Business[];
};

const categories: Category[] = [
  {
    icon: UtensilsCrossed,
    label: 'Food & Hospitality',
    businesses: [
      {
        name: 'Restaurant',
        tagline: 'Every ring is a table waiting to be filled.',
        points: [
          'Takes reservations during the dinner rush while your staff focus on the guests already seated.',
          'Answers the classics instantly: opening hours, parking, vegetarian options, allergens, group bookings.',
          'Books tables at 2 a.m. for guests planning tomorrow’s anniversary dinner.',
          'Reduces no-shows with automatic reminder calls.',
        ],
      },
      {
        name: 'Takeaway & Food Delivery',
        tagline: 'A busy line is a lost order.',
        points: [
          'Takes phone orders in parallel, so no one hangs up after the fifth ring.',
          'Reads back every order to confirm it and suggests add-ons (“Would you like drinks with that?”), which raises average order value.',
          'Gives delivery-time estimates and handles “where’s my order?” calls.',
          'Gives callers the same menu, prices and promotions every time.',
        ],
      },
      {
        name: 'Café & Bakery',
        tagline: 'Fresh bread, fresh answers.',
        points: [
          'Takes pre-orders for birthday cakes, pastry platters and bulk bread orders.',
          'Tells callers what’s still available today, so they don’t come in for nothing.',
          'Handles catering and office breakfast enquiries while you bake.',
          'Captures special requests (gluten-free, custom lettering) accurately.',
        ],
      },
      {
        name: 'Catering & Events Kitchen',
        tagline: 'Win the booking before the competitor calls back.',
        points: [
          'Qualifies leads instantly: date, guest count, budget, dietary needs.',
          'Replies within seconds, when event planners are comparing three caterers at once.',
          'Schedules tastings and consultation calls directly in your calendar.',
          'Sends every enquiry to your inbox as a structured summary.',
        ],
      },
      {
        name: 'Hotel, B&B & Guesthouse',
        tagline: 'A 24/7 front desk that never sleeps, and never needs to.',
        points: [
          'Handles availability, rates, check-in times, breakfast and parking questions around the clock.',
          'Captures direct bookings, saving commission you’d otherwise pay to booking platforms.',
          'Answers international guests in their own language.',
          'Takes late-night guest requests and routes real issues to the night manager.',
        ],
      },
      {
        name: 'Bar, Club & Nightlife Venue',
        tagline: 'Fill the guest list while you’re still setting up.',
        points: [
          'Handles table reservations, bottle-service packages and group bookings.',
          'Answers dress code, age policy, event line-up and entry price questions.',
          'Collects details for private party enquiries.',
          'Works during the afternoon, when you’re asleep and people are planning their night.',
        ],
      },
    ],
  },
  {
    icon: ShoppingCart,
    label: 'Retail & E-commerce',
    businesses: [
      {
        name: 'Grocery, Greengrocer & Fresh Produce',
        tagline: 'From the field to the phone to the doorstep.',
        points: [
          'Takes phone orders for delivery or pickup, which is especially useful for elderly customers who don’t order online.',
          'Tells callers what’s in season and in stock today.',
          'Handles delivery slot bookings and “where’s my delivery?” questions.',
          'Builds loyalty through friendly, patient service on every call.',
        ],
      },
      {
        name: 'Online Shop / E-commerce',
        tagline: 'The voice behind your website.',
        points: [
          'Answers order-status, shipping-time and return-policy questions at any hour.',
          'Keeps your support inbox for the complex cases.',
          'Recovers hesitant buyers by answering product questions before they abandon the cart.',
          'Scales instantly during Black Friday, sales and holidays.',
        ],
      },
      {
        name: 'Electronics & Smart Accessories',
        tagline: 'Specs, stock and setup help, instantly.',
        points: [
          'Explains product differences and compatibility (“Does this charger work with my phone?”).',
          'Handles warranty, return and order-tracking questions.',
          'Talks callers through basic setup steps before they give up and return the product.',
          'Records upsell interest (cases, insurance, accessories) for your sales team.',
        ],
      },
      {
        name: 'Fashion & Clothing Store',
        tagline: 'Style questions answered, even after closing.',
        points: [
          'Checks sizes, colours and availability, and reserves items for in-store pickup.',
          'Explains return, exchange and alteration policies clearly.',
          'Announces sales and new collections to callers.',
          'Books personal-shopping and styling appointments.',
        ],
      },
      {
        name: 'Furniture & Home Store',
        tagline: 'Big purchases start with a phone call.',
        points: [
          'Answers delivery, assembly and lead-time questions.',
          'Books showroom visits and design consultations.',
          'Handles order-tracking and delivery rescheduling without tying up staff.',
          'Captures custom-order and measurement enquiries in detail.',
        ],
      },
      {
        name: 'Florist',
        tagline: 'Never miss a Valentine’s Day order again.',
        points: [
          'Takes flower orders with delivery address, card message and timing.',
          'Handles peak-day volume (Valentine’s, Mother’s Day) without extra staff.',
          'Suggests arrangements by occasion and budget.',
          'Takes wedding and funeral-flower enquiries with care and sensitivity.',
        ],
      },
    ],
  },
  {
    icon: Stethoscope,
    label: 'Health & Care',
    note: 'Every health agent handles administration only and never gives medical advice. Emergencies are directed to 112 immediately.',
    businesses: [
      {
        name: 'General Practice / Medical Clinic',
        tagline: 'Free your assistants from the 8 a.m. phone storm.',
        points: [
          'Books, moves and cancels appointments, cutting the morning phone queue dramatically.',
          'Answers practical questions: opening hours, repeat-prescription process, test-result procedures.',
          'Sends urgent-sounding calls to staff right away.',
          'Lowers no-shows with reminder calls.',
        ],
      },
      {
        name: 'Dental Clinic',
        tagline: 'A full chair schedule, every day.',
        points: [
          'Books check-ups, cleanings and treatments around the clock.',
          'Fills last-minute cancellations by calling patients on a waiting list.',
          'Answers insurance, pricing and first-visit questions.',
          'Welcomes new patients warmly and collects their intake details.',
        ],
      },
      {
        name: 'Physiotherapy & Rehabilitation',
        tagline: 'Keep patients moving, and keep them booked.',
        points: [
          'Schedules follow-up sessions so treatment plans don’t lapse.',
          'Explains referral requirements and insurance coverage.',
          'Handles rescheduling without interrupting a therapist mid-session.',
          'Takes new-patient enquiries in the evening, when patients have time to call.',
        ],
      },
      {
        name: 'Pharmacy',
        tagline: 'Your counter stays for the customers in front of it.',
        points: [
          'Tells callers whether their prescription is ready for pickup.',
          'Answers opening hours, on-duty pharmacy and delivery questions.',
          'Takes repeat-prescription requests and passes them to the pharmacist.',
          'Sends clinical questions to a pharmacist straight away.',
        ],
      },
      {
        name: 'Optician',
        tagline: 'See more clients, literally.',
        points: [
          'Books eye tests and contact-lens fittings.',
          'Tells callers when their glasses are ready for pickup.',
          'Answers frame, pricing and insurance questions.',
          'Handles repair and adjustment requests.',
        ],
      },
      {
        name: 'Mental Health & Therapy Practice',
        tagline: 'A calm, patient first voice when someone reaches out.',
        points: [
          'Responds to new-client enquiries with warmth and without judgement, at any hour.',
          'Handles scheduling and rescheduling confidentially.',
          'Explains intake procedures, waiting times and insurance coverage.',
          'Directs callers in crisis to crisis lines and emergency services immediately.',
        ],
      },
      {
        name: 'Home Care & Elderly Care',
        tagline: 'Families get answers; carers keep caring.',
        points: [
          'Answers families’ questions about services, visit schedules and availability.',
          'Records care requests and schedule changes for coordinators.',
          'Speaks slowly and clearly, which suits elderly callers.',
          'Handles intake enquiries from new families 24/7.',
        ],
      },
      {
        name: 'Veterinary Clinic',
        tagline: 'Because pets don’t get sick on schedule.',
        points: [
          'Books vaccinations, check-ups and surgeries.',
          'Tells worried owners after hours where the emergency vet is.',
          'Sends vaccination and check-up reminders.',
          'Answers pricing, pet food and medication-pickup questions.',
        ],
      },
    ],
  },
  {
    icon: Scissors,
    label: 'Beauty, Wellness & Fitness',
    businesses: [
      {
        name: 'Hair Salon & Barbershop',
        tagline: 'Hands in the hair, not on the phone.',
        points: [
          'Books appointments while stylists keep cutting, with no more “sorry, one moment.”',
          'Matches the right service and time to the right stylist.',
          'Fills gaps by offering open slots to callers.',
          'Cuts no-shows with confirmation calls.',
        ],
      },
      {
        name: 'Beauty & Nail Salon',
        tagline: 'A fully booked calendar, beautifully managed.',
        points: [
          'Books treatments by duration, including combinations like mani + pedi.',
          'Explains treatments, prices and aftercare.',
          'Promotes packages and seasonal offers during calls.',
          'Takes bookings in the evening, when clients plan their week.',
        ],
      },
      {
        name: 'Spa & Massage Studio',
        tagline: 'The calm starts with the first call.',
        points: [
          'Speaks in a soothing, unhurried tone that matches your brand.',
          'Books treatments, couples’ packages and gift vouchers.',
          'Answers questions about facilities, what to bring and how to prepare.',
          'Keeps treatment rooms quiet, with no ringing phones.',
        ],
      },
      {
        name: 'Gym & Fitness Studio',
        tagline: 'Turn “just asking” into a signed membership.',
        points: [
          'Explains membership options, class schedules and trial passes.',
          'Books intro sessions and personal-training appointments.',
          'Handles freeze, cancellation and billing questions consistently.',
          'Captures leads from January’s rush of new-year resolutions.',
        ],
      },
    ],
  },
  {
    icon: Wrench,
    label: 'Repair & Home Services',
    businesses: [
      {
        name: 'Phone & Electronics Repair',
        tagline: 'Diagnose the need, book the fix.',
        points: [
          'Gives quote ranges by device and fault (screen, battery, water damage).',
          'Books drop-off slots and tells customers when their repair is ready.',
          'Answers “Can you fix this model?” instantly.',
          'Captures intake details so the technician is prepared.',
        ],
      },
      {
        name: 'Plumbing & Heating',
        tagline: 'The leak won’t wait until Monday.',
        points: [
          'Takes emergency call-outs 24/7 and alerts the on-call engineer right away.',
          'Books routine maintenance and boiler servicing.',
          'Collects the address, fault description and urgency before dispatch.',
          'Keeps you on the tools, not on the phone.',
        ],
      },
      {
        name: 'Electrician',
        tagline: 'Power to the calendar.',
        points: [
          'Qualifies jobs by size, from socket repair to full rewiring.',
          'Books inspections and quotes with the right information attached.',
          'Sends real emergencies to the on-call electrician.',
          'Makes one-person businesses sound as professional as large firms.',
        ],
      },
      {
        name: 'Locksmith',
        tagline: 'When someone’s locked out, the first answer wins.',
        points: [
          'Answers every call instantly, day or night, which in this trade means winning the job.',
          'Collects the location and situation, then dispatches fast.',
          'Gives callers upfront price ranges.',
          'Takes security-upgrade and lock-replacement bookings.',
        ],
      },
      {
        name: 'Cleaning Services',
        tagline: 'Spotless scheduling.',
        points: [
          'Quotes by property size, frequency and type (home, office, end-of-tenancy).',
          'Books, reschedules and confirms appointments.',
          'Handles recurring-client changes without paperwork.',
          'Captures special requests and access instructions accurately.',
        ],
      },
      {
        name: 'Moving Company',
        tagline: 'Win the move before the competitor calls back.',
        points: [
          'Qualifies the move: date, volume, distance, floors, packing needs.',
          'Books survey visits or video quotes.',
          'Answers insurance and storage questions.',
          'Handles moving-day questions from anxious customers.',
        ],
      },
      {
        name: 'Garden & Landscaping',
        tagline: 'Grow your client list in every season.',
        points: [
          'Books quotes, maintenance rounds and seasonal jobs.',
          'Handles weather rescheduling calmly and consistently.',
          'Captures project details (size, design ideas, budget).',
          'Sells maintenance contracts to one-off clients.',
        ],
      },
    ],
  },
  {
    icon: Car,
    label: 'Automotive & Mobility',
    businesses: [
      {
        name: 'Car Garage & Workshop',
        tagline: 'Mechanics fix cars, not phone queues.',
        points: [
          'Books services, MOT/APK inspections and tyre changes.',
          'Tells customers when their car is ready.',
          'Gives service price estimates consistently.',
          'Remembers returning customers and their vehicles.',
        ],
      },
      {
        name: 'Car Dealership',
        tagline: 'Every call is a potential sale.',
        points: [
          'Answers stock, price and financing questions, and books test drives.',
          'Qualifies trade-in enquiries before handing them to sales.',
          'Sends hot leads straight to the right salesperson.',
          'Captures evening and weekend buyers who’d otherwise go elsewhere.',
        ],
      },
      {
        name: 'Taxi & Chauffeur Service',
        tagline: 'Booked in seconds, on the road in minutes.',
        points: [
          'Takes ride bookings, including airport transfers and scheduled pickups.',
          'Gives fare estimates and confirms pickup details.',
          'Handles peak demand without a dispatcher overload.',
          'Handles corporate and recurring bookings accurately.',
        ],
      },
      {
        name: 'Driving School',
        tagline: 'Keep students on the road to passing.',
        points: [
          'Books lessons and exams, and fills cancelled slots.',
          'Explains packages, prices and exam procedures.',
          'Takes new-student enquiries at any hour.',
          'Frees instructors from phone calls between lessons.',
        ],
      },
      {
        name: 'Bike Shop & Repair',
        tagline: 'Fewer interruptions in the workshop.',
        points: [
          'Books repairs and services, and tells customers when bikes are ready.',
          'Answers stock, e-bike and pricing questions.',
          'Takes rental bookings.',
          'Handles busy seasons (spring, holidays) without extra staff.',
        ],
      },
    ],
  },
  {
    icon: Briefcase,
    label: 'Professional Services',
    businesses: [
      {
        name: 'Law Firm',
        tagline: 'Serious clients expect an immediate answer.',
        points: [
          'Screens new client enquiries by practice area and urgency.',
          'Books intake consultations directly.',
          'Answers practical questions confidentially: fees, documents to bring.',
          'Stops lawyers losing billable hours to routine calls.',
        ],
      },
      {
        name: 'Accounting & Tax Advisory',
        tagline: 'Tax season without the phone chaos.',
        points: [
          'Handles the deadline rush of “What do I need to send you?” calls.',
          'Books consultations and document-review meetings.',
          'Collects new-client details: business type, size, needs.',
          'Sends document and deadline reminders.',
        ],
      },
      {
        name: 'Insurance Agency',
        tagline: 'Faster answers, stronger loyalty.',
        points: [
          'Takes the first notice of a claim 24/7, when accidents actually happen.',
          'Answers coverage and policy questions consistently.',
          'Qualifies quote requests for advisors.',
          'Keeps clients during renewals with proactive calls.',
        ],
      },
      {
        name: 'Recruitment & Staffing Agency',
        tagline: 'Talent doesn’t wait.',
        points: [
          'Screens candidates with first-round questions at any hour.',
          'Takes client staffing requests, including urgent same-day needs.',
          'Books interviews and sends reminders.',
          'Keeps candidate pipelines moving while recruiters close placements.',
        ],
      },
      {
        name: 'IT Support & Managed Services',
        tagline: 'Level-1 support that never sleeps.',
        points: [
          'Logs support tickets with the details the tech needs.',
          'Talks users through common fixes (password resets, restarts, connectivity checks).',
          'Escalates critical outages to on-call engineers immediately.',
          'Makes SLA response times achievable without a 24/7 staffed desk.',
        ],
      },
    ],
  },
  {
    icon: Building2,
    label: 'Real Estate & Property',
    businesses: [
      {
        name: 'Real Estate Agency',
        tagline: 'The first agent to answer wins the listing.',
        points: [
          'Answers property questions instantly: price, size, availability, viewing times.',
          'Books viewings directly into agents’ calendars.',
          'Qualifies buyers and tenants (budget, timeline, mortgage status).',
          'Takes valuation requests from potential sellers 24/7.',
        ],
      },
      {
        name: 'Property Management & Housing Association',
        tagline: 'Tenants heard, repairs handled.',
        points: [
          'Logs maintenance requests with the details, urgency and access information.',
          'Sends emergencies (leaks, no heating, lockouts) to on-call staff.',
          'Answers rent, contract and procedure questions consistently.',
          'Handles the high call volume during storms and outages.',
        ],
      },
      {
        name: 'Coworking & Office Space',
        tagline: 'Fill every desk and meeting room.',
        points: [
          'Books tours, day passes and meeting rooms.',
          'Explains membership plans and amenities.',
          'Handles member questions: access, Wi-Fi, mail.',
          'Converts after-hours enquiries into booked visits.',
        ],
      },
    ],
  },
  {
    icon: GraduationCap,
    label: 'Education & Childcare',
    businesses: [
      {
        name: 'Primary & Secondary School',
        tagline: 'Parents informed, office staff relieved.',
        points: [
          'Takes absence reports every morning, the most repetitive call at any school.',
          'Answers questions about schedules, holidays, events and enrolment.',
          'Books parent-teacher meetings.',
          'Communicates in parents’ native languages, so every family gets the same access.',
        ],
      },
      {
        name: 'University & College',
        tagline: 'Thousands of questions, one tireless voice.',
        points: [
          'Handles admissions, deadline and programme questions at peak times.',
          'Sends callers to the right department first time.',
          'Answers international applicants across time zones.',
          'Supports open-day registrations and campus-tour bookings.',
        ],
      },
      {
        name: 'Language School & Tutoring Centre',
        tagline: 'Every enquiry becomes a student.',
        points: [
          'Explains courses, levels, schedules and prices.',
          'Books placement tests and trial lessons.',
          'Handles rescheduling for busy students.',
          'Can talk to prospective students in the language they’re learning — a great demo of your school.',
        ],
      },
      {
        name: 'Daycare & Childcare Centre',
        tagline: 'Parents get answers, children get attention.',
        points: [
          'Handles waiting-list, availability and enrolment enquiries.',
          'Takes absence and pickup-change calls.',
          'Answers questions about fees, subsidies and daily routines.',
          'Keeps staff with the children, not on the phone.',
        ],
      },
    ],
  },
  {
    icon: Landmark,
    label: 'Public Sector & Community',
    businesses: [
      {
        name: 'Municipality / City Hall',
        tagline: 'Citizen service without the queue.',
        points: [
          'Answers questions about permits, documents, waste collection and opening hours.',
          'Books appointments for passports, ID cards and registrations.',
          'Sends each case to the right department.',
          'Serves citizens in multiple languages, making services more accessible.',
        ],
      },
      {
        name: 'Police (Non-Emergency Line)',
        tagline: 'Free up officers for what matters.',
        points: [
          'Handles non-urgent reports and information requests only. Emergencies always go to 112.',
          'Takes lost-property, noise-complaint and minor-incident reports in a structured way.',
          'Answers procedural questions (how to file a report, station hours).',
          'Cuts wait times on non-emergency lines, so the public trusts the service more.',
        ],
      },
      {
        name: 'Library & Cultural Centre',
        tagline: 'Culture, always open.',
        points: [
          'Answers questions about opening hours, events, memberships and room bookings.',
          'Handles renewals and reservation questions.',
          'Promotes events and workshops to callers.',
          'Helps elderly and less digital visitors who prefer to call.',
        ],
      },
      {
        name: 'Nonprofit & Charity',
        tagline: 'More impact, less admin.',
        points: [
          'Answers donor questions and processes donation enquiries.',
          'Registers volunteers and schedules them.',
          'Shares programme information with people seeking help.',
          'Lets a small team sound like a large organisation.',
        ],
      },
      {
        name: 'Religious & Community Centre',
        tagline: 'A welcoming voice for everyone.',
        points: [
          'Shares service times, events and community programmes.',
          'Books halls and ceremonies (weddings, memorials) sensitively.',
          'Records requests for pastoral contact.',
          'Serves members in multiple languages.',
        ],
      },
    ],
  },
  {
    icon: Plane,
    label: 'Travel, Leisure & Events',
    businesses: [
      {
        name: 'Travel Agency & Tour Operator',
        tagline: 'Dream trips start with a quick answer.',
        points: [
          'Handles availability, pricing and itinerary questions at any hour.',
          'Qualifies travel enquiries: dates, budget, group size.',
          'Helps travellers abroad across time zones.',
          'Books consultation calls with travel advisors.',
        ],
      },
      {
        name: 'Event Venue & Wedding Location',
        tagline: 'Book the date before someone else does.',
        points: [
          'Checks date availability and collects event details instantly.',
          'Books venue tours.',
          'Explains packages, capacity, catering and technical options.',
          'Follows up leads that went cold.',
        ],
      },
      {
        name: 'Cinema, Theatre & Attractions',
        tagline: 'Sell more tickets, answer fewer repeat questions.',
        points: [
          'Answers questions about schedules, prices, accessibility and parking.',
          'Handles group bookings and school visits.',
          'Promotes upcoming shows and memberships.',
          'Handles peak-day call volume effortlessly.',
        ],
      },
      {
        name: 'Sports Club & Recreation Centre',
        tagline: 'More members, less admin.',
        points: [
          'Explains memberships, training times and trial sessions.',
          'Books courts, fields and lanes.',
          'Handles cancellations when the weather changes plans.',
          'Answers volunteer and youth-programme questions.',
        ],
      },
    ],
  },
  {
    icon: PackageOpen,
    label: 'Logistics & Pets',
    businesses: [
      {
        name: 'Courier & Parcel Delivery',
        tagline: '“Where’s my parcel?” answered in seconds.',
        points: [
          'Handles tracking, delivery-window and redelivery requests 24/7.',
          'Books pickups with the right parcel details.',
          'Handles peak season volume without temporary staff.',
          'Reports complaints and damage in a structured way.',
        ],
      },
      {
        name: 'Wholesale & Distribution',
        tagline: 'Keep B2B clients stocked and satisfied.',
        points: [
          'Takes repeat orders from regular trade customers.',
          'Answers stock, lead-time and pricing questions.',
          'Tracks order and delivery status.',
          'Frees account managers to grow key accounts.',
        ],
      },
      {
        name: 'Pet Grooming & Boarding',
        tagline: 'Happy pets, happy owners, a full schedule.',
        points: [
          'Books grooming sessions and boarding stays.',
          'Explains vaccination requirements and what to bring.',
          'Answers holiday-season enquiries early and fills peak periods.',
          'Reassures anxious owners at any hour.',
        ],
      },
      {
        name: 'Other / My business isn’t listed',
        tagline: 'Every organisation that answers a phone can use a voice agent.',
        points: [
          'Trained on your own information, whatever your sector.',
          'Answers calls 24/7, so none go unanswered.',
          'Gives consistent, accurate answers.',
          'Grows with your business.',
        ],
      },
    ],
  },
];

/**
 * The sector → business choices this selector offers, names only, so a form
 * (the Create organization dialog) can offer the same industries without
 * copying the list.
 */
export const industryOptions = categories.map((c) => ({
  sector: c.label,
  businesses: c.businesses.map((b) => b.name),
}));

/** Each sector's icon by its label, for lists beside the selector (the intro's ticker). */
export const sectorIcons: Record<string, LucideIcon> = Object.fromEntries(
  categories.map((c) => [c.label, c.icon]),
);


/**
 * One row of a dropdown panel — the header's ListItem without the link:
 * icon in a bordered square, title, and a line of detail under it.
 */
function Option({
  icon: Icon,
  title,
  description,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active || undefined}
      className={cn(
        // The border is always there but transparent, so lighting it on hover
        // shifts nothing by a pixel.
        'flex w-full flex-row gap-x-2 rounded-lg border border-transparent p-2 text-left',
        'transition-colors hover:border-brand-red focus-visible:border-brand-red focus-visible:outline-none',
        active && 'border-brand-red bg-accent/50 text-accent-foreground',
      )}
    >
      <div className="bg-background/40 flex aspect-square size-10 shrink-0 items-center justify-center rounded-md border shadow-sm">
        <Icon className="text-foreground size-5" />
      </div>
      <div className="flex flex-col items-start justify-center">
        <span className="text-sm font-medium">{title}</span>
        {description ? (
          <span className="text-muted-foreground text-xs">{description}</span>
        ) : null}
      </div>
    </button>
  );
}

const stopHover = (e: React.PointerEvent) => e.preventDefault();

type OptionItem = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

/**
 * A labelled field whose panel is the header's Company dropdown: same
 * NavigationMenu primitive, same chevron flip on open, same bordered popover
 * grid of icon rows. The trigger wears the section's glass instead of the
 * bar's underline, since here it is a form control rather than a nav item.
 *
 * Controlled so picking a row can close the panel — Radix keeps it open on
 * click otherwise.
 */
function Selector({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: OptionItem[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = React.useState('');
  const active = options[selected] ?? options[0];
  const ActiveIcon = active.icon;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
        {label}
      </span>

      {/* max-w-none and the first-child override undo the primitive's
          max-w-max, so the trigger fills its column. Only the list's wrapper
          is widened: the panel's own wrapper (the last div) is left at its
          width, because forcing it to the column's made the viewport shrink
          and clip the list. */}
      <NavigationMenu
        value={open}
        onValueChange={setOpen}
        // The last div is the panel's viewport, opaque by default; this gives
        // it the system's glass (as in glass-select.tsx) instead.
        className="w-full max-w-none [&>div:first-child]:w-full [&>div:last-child>div]:!border-white/[0.07] [&>div:last-child>div]:!bg-[#140a0d]/70 [&>div:last-child>div]:backdrop-blur-xl"
      >
        <NavigationMenuList className="w-full space-x-0">
          <NavigationMenuItem value={label} className="w-full">
            <NavigationMenuTrigger
              // Radix opens on hover; cancelling its pointer handlers leaves
              // only the click, and keeps the panel from closing when the
              // pointer drifts off. Outside click and Escape still close it.
              onPointerEnter={stopHover}
              onPointerMove={stopHover}
              onPointerLeave={stopHover}
              className={cn(
                'h-auto w-full justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3',
                'text-sm font-medium text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl',
                'hover:border-maroon-400/50 hover:bg-white/[0.07] hover:text-gray-900',
                'focus:bg-white/[0.07] focus:text-gray-900',
                'data-[state=open]:border-maroon-400 data-[state=open]:bg-white/[0.07]',
                '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-[#ff6b78]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ActiveIcon
                  className="size-4 shrink-0 text-[#ff6b78]"
                  strokeWidth={1.75}
                />
                <span className="truncate">{active.title}</span>
              </span>
            </NavigationMenuTrigger>

            <NavigationMenuContent
              onPointerEnter={stopHover}
              onPointerLeave={stopHover}
              className="p-1 pb-1.5"
            >
              {/* One column, left-aligned under its trigger; the glass is on
                  the viewport around it. */}
              <ul className="grid w-[min(24rem,calc(100vw-3rem))] gap-1 p-2">
                {options.map((option, i) => (
                  <li key={option.title}>
                    <Option
                      {...option}
                      active={i === selected}
                      onSelect={() => {
                        onSelect(i);
                        setOpen('');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

/** "Takeaway & Food Delivery" → "takeaway-food-delivery". */
const demoSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The voice demo for one business. A demo is two files in public/audio/demos,
 * named after the business: <slug>.wav and <slug>.peaks.json (made with
 * `node scripts/audio-peaks.mjs public/audio/demos/<slug>.wav`). Dropping them
 * in is all it takes — a business with no files shows a "coming soon" note.
 * Keyed by business in the parent, so switching starts from a clean state.
 */
function BusinessDemo({ name }: { name: string }) {
  const slug = demoSlug(name);
  const [peaks, setPeaks] = React.useState<number[] | null | undefined>(undefined);

  React.useEffect(() => {
    let live = true;
    fetch(`/audio/demos/${slug}.peaks.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => live && setPeaks(Array.isArray(data) ? data : null))
      .catch(() => live && setPeaks(null));
    return () => {
      live = false;
    };
  }, [slug]);

  if (peaks) {
    return (
      <CallRecording
        embedded
        src={`/audio/demos/${slug}.wav`}
        peaks={peaks}
        title={name}
        subtitle={`A sample call: the agent answers for a ${name.toLowerCase()}.`}
      />
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-gray-400">
        Hear it live
      </p>
      <p className="mt-3 text-sm text-gray-500">
        {peaks === undefined
          ? 'Loading the demo…'
          : `A voice demo for ${name} is coming soon.`}
      </p>
    </div>
  );
}

/**
 * Two cascading dropdowns — sector, then business — over a glass panel
 * carrying what the agent does for the chosen one.
 *
 * The panel repeats GlassCard's layer recipe rather than reusing the component
 * itself: GlassCard takes an icon and a single description string, and this
 * needs a heading block plus a bullet list.
 */
export default function UseCaseExplorer() {
  const [categoryIndex, setCategoryIndex] = React.useState(0);
  const [businessIndex, setBusinessIndex] = React.useState(0);

  const category = categories[categoryIndex];
  const business = category.businesses[businessIndex] ?? category.businesses[0];
  const CategoryIcon = category.icon;

  return (
    <div className="mb-16">
      {/* Above the cards' own glow rings, which share z-10 and come later. */}
      <div className="relative z-30 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Selector
          label="Sector"
          options={categories.map((c) => ({
            icon: c.icon,
            title: c.label,
            description: `${c.businesses.length} businesses`,
          }))}
          selected={categoryIndex}
          onSelect={(next) => {
            setCategoryIndex(next);
            setBusinessIndex(0);
          }}
        />

        <Selector
          label="Business"
          options={category.businesses.map((b) => ({
            icon: category.icon,
            title: b.name,
            description: b.tagline,
          }))}
          selected={businessIndex}
          onSelect={setBusinessIndex}
        />
      </div>

      <div className="group relative mt-8 rounded-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] rounded-[inherit] opacity-60 blur-[10px]"
        >
          <div className="glow-ring h-full w-full rounded-[inherit] [--ring-w:3px]" />
        </div>

        <div
          aria-hidden="true"
          className="glow-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        />

        <div
          aria-live="polite"
          className="relative overflow-hidden rounded-[inherit] border border-white/[0.07] bg-white/[0.035] p-7 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:p-9"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-24 h-48 w-48 rounded-full bg-maroon-400/20 blur-3xl"
          />

          <p className="relative flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-gray-400">
            <CategoryIcon
              aria-hidden="true"
              className="size-4 text-[#ff6b78]"
              strokeWidth={1.75}
            />
            {category.label}
          </p>

          <h3 className="relative mt-3 text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
            {business.name}
          </h3>

          <p className="relative mt-2 text-sm text-[#ff8a95] md:text-base">
            {business.tagline}
          </p>

          {category.note ? (
            <p className="relative mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-gray-500">
              {category.note}
            </p>
          ) : null}

          <ul className="relative mt-6 space-y-3">
            {business.points.map((point) => (
              <li
                key={point}
                className="flex gap-3 text-sm leading-relaxed text-gray-500"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff2e43] shadow-[0_0_10px_rgba(255,46,67,0.7)]"
                />
                {point}
              </li>
            ))}
          </ul>

          <div className="relative mt-7 border-t border-white/[0.07] pt-6">
            <BusinessDemo key={business.name} name={business.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
