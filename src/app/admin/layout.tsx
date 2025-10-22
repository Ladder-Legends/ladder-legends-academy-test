import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isCoach } from "@/lib/permissions";
import Link from "next/link";
import { Settings, FileText, PlaySquare, Video, GraduationCap, Users } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Only coaches and owners can access admin
  if (!isCoach(session)) {
    redirect("/");
  }

  const navItems = [
    { href: "/admin/videos", label: "Videos", icon: Video },
    { href: "/admin/build-orders", label: "Build Orders", icon: FileText },
    { href: "/admin/replays", label: "Replays", icon: PlaySquare },
    { href: "/admin/masterclasses", label: "Masterclasses", icon: GraduationCap },
    { href: "/admin/coaches", label: "Coaches", icon: Users },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50">
        <div className="p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Admin CMS
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Content Management</p>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
