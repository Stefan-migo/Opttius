"use client";

import { Package } from "lucide-react";
import Image from "next/image";

interface Props {
  name: string;
  featuredImage: string | null;
  gallery: string[] | null;
  selectedImage: string | null;
  onSelectImage: (image: string) => void;
}

export function ProductViewImages({ name, featuredImage, gallery, selectedImage, onSelectImage }: Props) {
  const images = [];
  if (featuredImage) images.push(featuredImage);
  if (gallery) images.push(...gallery);
  const uniqueImages = [...new Set(images)];

  return (
    <div className="space-y-4">
      <div className="relative aspect-square bg-white rounded-lg overflow-hidden border-2 border-gray-200">
        {selectedImage ? (
          <Image fill priority alt={name} className="object-contain p-4" src={selectedImage} />
        ) : (
          <div className="flex items-center justify-center h-full"><Package className="h-24 w-24 text-gray-300" /></div>
        )}
      </div>
      {uniqueImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uniqueImages.map((image, index) => (
            <button
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${selectedImage === image ? "border-azul-profundo" : "border-gray-200"}`}
              key={index}
              onClick={() => onSelectImage(image)}
            >
              <Image fill alt={`${name} - ${index + 1}`} className="object-cover" src={image} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
