"use client";

import { Star, Quote, Sparkles } from "lucide-react";
import businessConfig from "@/config/business";

const testimonials = [
  {
    name: "Dra. María González",
    role: "Directora, Óptica Visión Clara",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    content:
      "Opttius ha transformado completamente nuestra operación. El nivel de precisión en las órdenes de laboratorio es algo que nunca habíamos experimentado.",
    rating: 5,
  },
  {
    name: "Carlos Ramírez",
    role: "Propietario, Óptica Centro",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
    content:
      "La gestión multi-sucursal nos permite tener el control total de nuestro inventario en tiempo real. La IA de Opttius es simplemente brillante.",
    rating: 5,
  },
  {
    name: "Ana Martínez",
    role: "Gerente, Laboratorio Óptico Premium",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
    content:
      "El flujo de trabajo es impecable. Desde el presupuesto hasta la entrega final, todo está perfectamente sincronizado y libre de errores.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-32 bg-gray-50/30" id="testimonios">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Casos de Éxito</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-cormorant text-gray-900 mb-6 leading-tight">
            Confianza de{" "}
            <span className="text-primary italic">Líderes Ópticos</span>
          </h2>
          <p className="text-lg text-gray-500 font-body">
            Descubre por qué las mejores ópticas de la región eligen nuestra
            tecnología.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-10 bg-white rounded-[3rem] shadow-premium hover:shadow-premium-lg transition-all duration-500 border border-gray-100 group overflow-hidden"
            >
              <Quote className="absolute -top-4 -right-4 h-24 w-24 text-gray-50 opacity-50 transition-colors group-hover:text-primary/10" />

              <div className="flex items-center gap-1 mb-8">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-gray-600 mb-10 leading-relaxed font-body italic relative z-10 text-lg">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/10">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {testimonial.name}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
