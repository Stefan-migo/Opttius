"use client";

interface FrameSpecs {
  frame_type?: string | null;
  frame_material?: string | null;
  frame_shape?: string | null;
  frame_color?: string | null;
}

export function ProductViewFrameSpecs({ product }: { product: Record<string, unknown> }) {
  const frame = product as FrameSpecs;
  if (!frame.frame_type && !frame.frame_material && !frame.frame_shape && !frame.frame_color) return null;
  return (
    <div className="space-y-2 p-4 bg-white/50 rounded-lg">
      <h3 className="font-semibold text-azul-profundo mb-2">Especificaciones del Marco</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {frame.frame_type && <div><span className="text-tierra-media">Tipo: </span><span className="font-medium">{frame.frame_type}</span></div>}
        {frame.frame_material && <div><span className="text-tierra-media">Material: </span><span className="font-medium">{frame.frame_material}</span></div>}
        {frame.frame_shape && <div><span className="text-tierra-media">Forma: </span><span className="font-medium">{frame.frame_shape}</span></div>}
        {frame.frame_color && <div><span className="text-tierra-media">Color: </span><span className="font-medium">{frame.frame_color}</span></div>}
      </div>
    </div>
  );
}

export function ProductViewLensSpecs({ product }: { product: Record<string, unknown> }) {
  const lens = product as { lens_type?: string | null; lens_material?: string | null };
  if (!lens.lens_type && !lens.lens_material) return null;
  return (
    <div className="space-y-2 p-4 bg-white/50 rounded-lg">
      <h3 className="font-semibold text-azul-profundo mb-2">Especificaciones de la Lente</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {lens.lens_type && <div><span className="text-tierra-media">Tipo: </span><span className="font-medium">{lens.lens_type}</span></div>}
        {lens.lens_material && <div><span className="text-tierra-media">Material: </span><span className="font-medium">{lens.lens_material}</span></div>}
      </div>
    </div>
  );
}
