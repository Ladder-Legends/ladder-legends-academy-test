import { redirect } from "next/navigation";

// Redirect to home page - edit content in-place on existing pages
export default function AdminPage() {
  redirect("/");
}
