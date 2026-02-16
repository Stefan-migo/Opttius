import { redirect } from "next/navigation";

export default function LensFamiliesPage() {
  redirect("/admin/products?tab=lens-families");
}
