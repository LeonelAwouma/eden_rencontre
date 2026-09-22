import { redirect } from "next/navigation";

// La formation se présente sur la page d'accueil de l'Académie.
export default function BatirSurLeRocIndex() {
  redirect("/dashboard/academie");
}
