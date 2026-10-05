import { Inter } from 'next/font/google';
import { Lusitana } from 'next/font/google';
import { Bowlby_One } from 'next/font/google';
import { B612 } from 'next/font/google';
 
export const inter = Inter({ subsets: ['latin'] });

 
export const lusitana = Lusitana({
  weight: ['400', '700'],
  subsets: ['latin'],
});

// Display face for the header bar. Ships in a single weight only.
export const bowlby = Bowlby_One({
  weight: '400',
  subsets: ['latin'],
});

// The globe chapters' face (designed for aircraft cockpit displays). The globe
// loads it from Google at runtime; the intro's headline paints first, so it
// gets the self-hosted copy instead, with no swap or layout shift.
export const b612 = B612({
  weight: ['400', '700'],
  subsets: ['latin'],
});