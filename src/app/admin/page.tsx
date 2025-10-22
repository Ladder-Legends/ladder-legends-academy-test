import { redirect } from "next/navigation";

// Redirect to the videos admin page by default
export default function AdminPage() {
  redirect("/admin/videos");
}
