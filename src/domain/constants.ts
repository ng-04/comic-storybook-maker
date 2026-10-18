import type { PurusharthaKey, Role } from './types';

export const INSPIRATIONS = ['Panchatantra', 'Jataka tales', 'Hitopadesha', 'Ramayana', 'Mahabharata', 'Puranas', 'Original tale'];
export const ERAS = ['Long, long ago', 'Satya Yuga', 'Treta Yuga', 'Dvapara Yuga', 'Vedic age', 'Mauryan era', 'Gupta era', 'Present day'];
export const RITUS = ['Vasant · spring', 'Grishma · summer', 'Varsha · monsoon', 'Sharad · autumn', 'Hemant · early winter', 'Shishir · winter'];
export const DARSHANS = ['None', 'Nyaya · clear reasoning', 'Vaisheshika · how things are made', 'Samkhya · mind and nature', 'Yoga · discipline and focus', 'Mimamsa · right action', 'Vedanta · we are all one'];
export const TONES = ['Adventurous', 'Funny', 'Heartwarming', 'Wise and calm', 'Gentle bedtime'];
export const AGES = ['3–5', '5–7', '7–10'];
export const COUNTS = [6, 8, 12];
export const STYLES = ['Comic', 'Watercolour', 'Crayon', 'Madhubani-inspired'];
export const COLORS = ['#1F4FB8', '#8A4FD1', '#2E9C5A', '#C98A4B', '#F28C28', '#D6457A'];
export const MAX_SUBLOCATIONS = 6;
export const MAX_PAGES = 14;

export const ROLE_LABELS: Record<Role, string> = {
  nayak: 'Nayak',
  sahayak: 'Sahayak',
  mitra: 'Mitra',
  guru: 'Guru',
  parivaar: 'Parivaar',
  pratinayak: 'Pratinayak',
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'nayak', label: 'Nayak (hero)' },
  { value: 'sahayak', label: 'Sahayak (helper)' },
  { value: 'mitra', label: 'Mitra (friend)' },
  { value: 'guru', label: 'Guru (mentor)' },
  { value: 'parivaar', label: 'Parivaar (family)' },
  { value: 'pratinayak', label: 'Pratinayak (rival)' },
];

export interface PurusharthaDef {
  k: PurusharthaKey;
  hint: string;
  bg: string;
  ink: string;
  icon: string;
  question: string;
  placeholder: string;
}

export const PURUSHARTHAS: PurusharthaDef[] = [
  { k: 'Dharma', hint: 'duty, righteousness, doing what is right', bg: '#1F4FB8', ink: '#FFFFFF', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4', question: 'What duty does {n} hold to?', placeholder: 'e.g. Keeping a promise to a friend' },
  { k: 'Artha', hint: 'resources, wealth, using things wisely', bg: '#FFD93B', ink: '#141414', icon: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM9 8.5h6M9 11.5h6M10 11.5c3 0 3 4 0 4l4 0', question: 'What does {n} need, protect or share?', placeholder: 'e.g. The jamun fruit that feeds the whole tree' },
  { k: 'Kaam', hint: 'wishes, ambition, love for family and friends', bg: '#FF4A3D', ink: '#141414', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', question: 'What does {n} wish for?', placeholder: 'e.g. To be accepted by the other monkeys' },
  { k: 'Moksh', hint: 'inner peace, letting go, spiritual freedom', bg: '#8A4FD1', ink: '#FFFFFF', icon: 'M12 20c-4 0-8-3-9-7 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 7-9 7zM12 17c-2-3-2-7 0-11 2 4 2 8 0 11z', question: 'What must {n} let go of, or come to understand?', placeholder: 'e.g. The fear of being left out' },
];

export const DESH_IDEAS = ['A forest on the banks of the Narmada', 'The kingdom of Kashi', 'A village by the Ganga', 'An ashram in the Himalayas', 'The Dandaka forest'];
export const SUB_IDEAS = ['Banyan tree', 'River ghat', 'Palace courtyard', 'Gurukul', 'Village well', 'Mango grove'];
export const LESSON_IDEAS = ['A promise is a small piece of dharma', 'True wealth is what we share', 'A calm mind sees clearly', 'Small and wise can beat big and proud'];

export const FALLBACK_NOTES = {
  sheetNoPhoto: 'The reference photo was declined, so this sheet was drawn from your description instead. It may look less like them.',
  pageNoPhoto: 'The first try was declined, so this was redrawn without your reference photos, using the approved character sheets. Faces may differ slightly.',
  textOnly: 'Reference images were declined, so this was drawn from the text only. Check that everyone still looks right.',
};
