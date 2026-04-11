"use client";

import dynamic from "next/dynamic";

// Lazy load ChatbotContent to reduce initial bundle size
const ChatbotContent = dynamic(
  () =>
    import("@/components/admin/ChatbotContent").then((mod) => ({
      default: mod.ChatbotContent,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-profundo mx-auto" />
          <p className="text-tierra-media">Cargando chatbot...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-azul-profundo">
          Chatbot IA
        </h1>
        <p className="text-sm md:text-base text-tierra-media">
          Asistente inteligente para gestionar tu negocio
        </p>
      </div>
      <div className="flex-1 min-h-0 border border-admin-border-primary rounded-lg bg-admin-bg-primary overflow-hidden">
        <ChatbotContent className="h-full" />
      </div>
    </div>
  );
}
