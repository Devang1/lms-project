import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bot,
  Flame,
  Home,
  PlusSquare,
  ShieldCheck,
  Users,
  UserCircle2
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navByRole = {
  STUDENT: [
    ["Home", "/feed", Home],
    ["Courses", "/courses", BookOpen],
    ["Create", "/feed/create", PlusSquare],
    ["AI Tools", "/ai-tools", Bot],
    ["Tests", "/weekly-tests", ShieldCheck],
    ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", UserCircle2]
  ],
  TEACHER: [
    ["Home", "/feed", Home],
    ["Courses", "/teacher/courses", BookOpen],
    ["Create", "/feed/create", PlusSquare],
    ["AI Tools", "/ai-tools", Bot],
    ["Tests", "/weekly-tests", ShieldCheck],
    ["Notifications", "/notifications", Bell],
    ["Teacher Ops", "/teacher", Users]
  ],
  ADMIN: [
    ["Home", "/feed", Home],
    ["Users", "/admin/users", Users],
    ["Courses", "/courses", BookOpen],
    ["AI Tools", "/ai-tools", Bot],
    ["Tests", "/weekly-tests", ShieldCheck],
    ["Notifications", "/notifications", Bell],
    ["Admin", "/admin", ShieldCheck]
  ]
} as const;

const mobileNav = [
  ["Home", "/feed", Home],
  ["Courses", "/courses", BookOpen],
  ["Create", "/feed/create", PlusSquare],
  ["AI", "/ai-tools", Bot],
  ["Tests", "/weekly-tests", ShieldCheck]
] as const;

export function AppShell({
  role,
  children,
  className,
  showMobileHeader = true,
  hasUnreadNotifications = false
}: {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  children: React.ReactNode;
  className?: string;
  showMobileHeader?: boolean;
  hasUnreadNotifications?: boolean;
}) {
  const nav = navByRole[role];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/80 p-4 backdrop-blur lg:block">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Flame size={20} />
            </div>

            <div>
              <p className="font-semibold">Star Study Point</p>
              <p className="text-xs text-muted-foreground">
                Social learning LMS
              </p>
            </div>
          </Link>

          <ThemeToggle />
        </div>

        <nav className="mt-6 grid gap-1">
          {nav.map(([label, href, Icon]) => (
            <Link
              href={href}
              key={href}
              className="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon size={18} />

              {label}

              {/* Desktop Notification Dot */}
              {label === "Notifications" &&
              hasUnreadNotifications ? (
                <span className="ml-auto flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <form
          action={logoutAction}
          className="absolute bottom-4 left-4 right-4"
        >
          <Button
            className="w-full"
            variant="outline"
            type="submit"
          >
            Log out
          </Button>
        </form>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "pb-20 lg:pb-0 lg:pl-64",
          className
        )}
      >
        {/* Mobile Header */}
        {showMobileHeader ? (
          <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Flame size={18} />
              </span>

              Star Study Point
            </Link>

            <div className="flex items-center gap-1">
              {/* Notifications */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
              >
                <Link href="/notifications">
                  <Bell size={19} />

                  {hasUnreadNotifications ? (
                    <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                    </span>
                  ) : null}
                </Link>
              </Button>

              {/* Profile */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Profile"
              >
                <Link href="/profile">
                  <UserCircle2 size={21} />
                </Link>
              </Button>

              <ThemeToggle />
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t bg-card/95 px-2 pb-2 pt-1 backdrop-blur lg:hidden">
        {mobileNav.map(([label, href, Icon]) => (
          <Link
            href={
              role === "TEACHER" &&
              href === "/courses"
                ? "/teacher/courses"
                : href
            }
            key={label}
            className="grid min-h-14 min-w-16 place-items-center rounded-md px-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Icon size={20} />
            <span className="mt-0.5 truncate">
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}