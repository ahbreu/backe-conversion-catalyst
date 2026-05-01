const brands = ["Botrio", "HANSA", "ogie", "opplio", "BIKE"];

const BrandsSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6 md:px-16">
        <h2 className="text-outline text-5xl md:text-8xl lg:text-9xl font-heading font-bold uppercase text-center select-none mb-16">
          MARCAS
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-muted-foreground/40 hover:text-foreground font-heading font-bold text-2xl md:text-3xl tracking-wider transition-colors duration-500 cursor-default select-none"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;
