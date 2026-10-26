import {
  Accessibility,
  Ambulance,
  Baby,
  Beef,
  BookOpen,
  Droplet,
  Droplets,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  PencilRuler,
  Recycle,
  ShieldAlert,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Stethoscope,
  Trees,
  Trophy,
  Users,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

const map = {
  Accessibility,
  Ambulance,
  Baby,
  Beef,
  BookOpen,
  Droplet,
  Droplets,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  PencilRuler,
  Recycle,
  ShieldAlert,
  Shirt,
  ShoppingBasket,
  Stethoscope,
  Trees,
  Trophy,
  Users,
  UtensilsCrossed,
  Wrench,
} as const;

export function SevaIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && map[name as keyof typeof map]) || Sparkles;
  return <Icon className={className} />;
}
