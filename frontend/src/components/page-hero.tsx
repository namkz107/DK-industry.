export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="bg-emerald-950 py-20 text-white"><div className="container-page"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">{eyebrow}</p><h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/70">{description}</p></div></section>
}
