import { Inter } from 'next/font/google';
import { Lusitana } from 'next/font/google';
import { Bowlby_One } from 'next/font/google';
 
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