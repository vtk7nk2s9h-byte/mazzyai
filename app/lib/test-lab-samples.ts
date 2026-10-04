// Canned requests for the Test lab. Each card sends one of these; its refresh
// button moves to another. Add a line to any list to add a variant. Plain
// data, no imports, so both the server action and the page can read it.
//
// Emails use Resend's test inbox (delivered+label@resend.dev), so a send never
// reaches a real person. Each variant has its own address because the mailer
// sends one email per address per day.

export const callSamples = [
  {
    name: 'Amira Haddad',
    phone: '+15550101',
    email: 'delivered+amira@resend.dev',
    minutes: 3,
    sentiment: 'Positive',
    summary: 'Asked about opening hours and booked a visit for Friday.',
    transcript:
      'Agent: Thanks for calling, how can I help?\nUser: Hi, what time do you open on Friday?\nAgent: We open at 9. Shall I book you in?\nUser: Yes please.',
  },
  {
    name: 'Daniel Okoye',
    phone: '+15550102',
    email: 'delivered+daniel@resend.dev',
    minutes: 6,
    sentiment: 'Negative',
    summary: 'Frustrated about a late delivery and asked for a manager.',
    transcript:
      'Agent: Thanks for calling, how can I help?\nUser: My order is a week late.\nAgent: I am sorry about that. Let me check.\nUser: I want to speak to a manager.',
  },
  {
    name: 'Sofia Marques',
    phone: '+15550103',
    email: 'delivered+sofia@resend.dev',
    minutes: 2,
    sentiment: 'Neutral',
    summary: 'Wanted pricing for the standard plan; will think it over.',
    transcript:
      'Agent: Thanks for calling, how can I help?\nUser: How much is the standard plan?\nAgent: It is 49 a month.\nUser: Okay, I will think about it.',
  },
  {
    name: 'Liam Becker',
    phone: '+15550104',
    email: 'delivered+liam@resend.dev',
    minutes: 1,
    sentiment: 'Neutral',
    summary: 'Short call: wrong number.',
    transcript: 'Agent: Thanks for calling, how can I help?\nUser: Oh, sorry, wrong number.',
  },
];

export const meetingSamples = [
  {
    title: 'Product demo',
    attendee: 'Amira Haddad',
    location: 'Video call',
    description: 'Walk through the dashboard and answer pricing questions.',
    minutes: 45,
    daysAhead: 1,
    hour: 10,
  },
  {
    title: 'Onboarding call',
    attendee: 'Daniel Okoye',
    location: 'Phone',
    description: 'First setup session for the new account.',
    minutes: 30,
    daysAhead: 2,
    hour: 14,
  },
  {
    title: 'Site visit',
    attendee: 'Sofia Marques',
    location: '12 Market Street',
    description: 'Look at the premises before the install.',
    minutes: 60,
    daysAhead: 3,
    hour: 9,
  },
  {
    title: 'Quick check-in',
    attendee: 'Liam Becker',
    location: 'Video call',
    description: '',
    minutes: 15,
    daysAhead: 1,
    hour: 16,
  },
];

export const emailSamples = [
  { name: 'Amira Haddad', email: 'delivered+amira@resend.dev' },
  { name: 'Daniel Okoye', email: 'delivered+daniel@resend.dev' },
  { name: 'Sofia Marques', email: 'delivered+sofia@resend.dev' },
  { name: 'Liam Becker', email: 'delivered+liam@resend.dev' },
];
