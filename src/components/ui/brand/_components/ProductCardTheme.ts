export const cardVariants: Record<string, string> = {
  default: "bg-white border-border",
  elegant: "bg-gradient-to-br from-[#f6fbd6] to-[white] border-gold-200 shadow-elegant",
  artisanal: "bg-cream border-earth-200 shadow-artisanal",
  glass: "bg-white/80 backdrop-blur-md border-white/20 shadow-glass",
};

export const lineThemeClasses: Record<string, { accent: string; badge: string; button: string; star: string }> = {
  "alma-terra": { accent: "text-alma-primary", badge: "bg-alma-primary/10 text-alma-primary border-alma-primary/20", button: "bg-alma-primary hover:bg-alma-primary/90 text-white", star: "fill-alma-secondary text-alma-secondary" },
  ecos: { accent: "text-ecos-primary", badge: "bg-ecos-primary/10 text-ecos-primary border-ecos-primary/20", button: "bg-ecos-primary hover:bg-ecos-primary/90 text-white", star: "fill-ecos-secondary text-ecos-secondary" },
  "jade-ritual": { accent: "text-jade-primary", badge: "bg-jade-primary/10 text-jade-primary border-jade-primary/20", button: "bg-jade-primary hover:bg-jade-primary/90 text-white", star: "fill-jade-secondary text-jade-secondary" },
  umbral: { accent: "text-umbral-primary", badge: "bg-umbral-primary/10 text-umbral-primary border-umbral-primary/20", button: "bg-umbral-primary hover:bg-umbral-primary/90 text-white", star: "fill-umbral-secondary text-umbral-secondary" },
  utopica: { accent: "text-utopica-primary", badge: "bg-utopica-primary/10 text-utopica-primary border-utopica-primary/20", button: "bg-utopica-primary hover:bg-utopica-primary/90 text-white", star: "fill-utopica-secondary text-utopica-secondary" },
  default: { accent: "text-brand-primary", badge: "bg-brand-primary/10 text-brand-primary border-brand-primary/20", button: "bg-brand-primary hover:bg-brand-primary/90 text-white", star: "fill-gold-500 text-gold-500" },
};
