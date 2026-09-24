import { redirect } from "next/navigation";
import { ADMIN_FORMATION_PATH } from "@/lib/formation/paths";

export default function AdminBatirSurLeRocIndex() {
  redirect(ADMIN_FORMATION_PATH);
}
