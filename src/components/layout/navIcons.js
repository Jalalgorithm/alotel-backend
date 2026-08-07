import {
  Banknote,
  Brush,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  FileSignature,
  FileText,
  Landmark,
  LayoutDashboard,
  LogIn,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';

/**
 * Name -> component map for the sidebar.
 *
 * The nav config stores icon *names* rather than components so it stays plain
 * serialisable data — which is what lets the command palette and any future
 * server-driven navigation reuse it.
 */
export const NAV_ICONS = {
  LayoutDashboard,
  TrendingUp,
  Building2,
  DoorOpen,
  Sparkles,
  Tags,
  Star,
  CalendarCheck,
  Users,
  LogIn,
  ClipboardCheck,
  FileSignature,
  FileText,
  BrushCleaning: Brush,
  CalendarDays,
  CalendarX,
  CreditCard,
  Banknote,
  ReceiptText,
  Landmark,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings,
  CircleHelp,
};
