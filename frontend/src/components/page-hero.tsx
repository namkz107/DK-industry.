type HeroVariant = "services" | "products" | "projects" | "contact" | "about" | "factory"

const heroImages: Record<HeroVariant, string> = {
  services: "/images/heroes/services-hero.jpg",
  products: "/images/heroes/products-hero.jpg",
  projects: "/images/heroes/projects-hero.jpg",
  contact: "/images/heroes/contact-hero.jpg",
  about: "/images/heroes/about-hero.jpg",
  factory: "/images/heroes/services-hero.jpg",
}

export function PageHero({ eyebrow, title, description, variant = "factory" }: { eyebrow: string; title: string; description: string; variant?: HeroVariant }) {
  return <section className="industrial-hero text-white">
    <img className="industrial-hero__image" src={heroImages[variant]} alt="" fetchPriority="high" />
    <div className="industrial-hero__shade"/><div className="industrial-hero__noise"/><div className="industrial-hero__beam"/><div className="industrial-hero__rings"><i/><i/><i/></div>
    <div className="container-page relative z-10 flex min-h-[420px] items-center py-16 lg:py-20">
      <div className="max-w-[760px]"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">{eyebrow}</p><h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/75">{description}</p></div>
    </div>
  </section>
}
