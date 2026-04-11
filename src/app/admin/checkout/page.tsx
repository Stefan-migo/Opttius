"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminCheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/checkout");
  }, [router]);

  return null;
}
