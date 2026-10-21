import {
  ArrowRight, BadgeCheck, Brush, CalendarDays, Cake, Camera, Car, Check, ChevronLeft, ChevronRight, Flower2, Headphones, Heart,
  MapPin, Menu, Mic, MicVocal, Moon, Music, Palette, Plus, Search, Shirt, Sparkles, Star, Sun, Users, UtensilsCrossed, Video, X,
  type LucideProps,
} from 'lucide-react';

const icons = {
  search: Search,
  arrow: ArrowRight,
  pin: MapPin,
  users: Users,
  check: Check,
  moon: Moon,
  sun: Sun,
  menu: Menu,
  close: X,
  heart: Heart,
  camera: Camera,
  music: Music,
  flower: Flower2,
  calendar: CalendarDays,
  star: Star,
  verified: BadgeCheck,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  plus: Plus,
  sparkles: Sparkles,
  mic: Mic,
  micVocal: MicVocal,
  video: Video,
  utensils: UtensilsCrossed,
  headphones: Headphones,
  palette: Palette,
  cake: Cake,
  car: Car,
  brush: Brush,
  shirt: Shirt,
} as const;

export type IconName = keyof typeof icons;
export default function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Glyph = icons[name];
  return <Glyph size={20} strokeWidth={1.6} aria-hidden="true" {...props} />;
}
