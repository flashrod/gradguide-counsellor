"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/workspace", label: "Workspace", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  const { open, animate } = useSidebar();
  const showFull = animate ? open : true;
  return (
    <Link
      href="/workspace"
      className="relative z-20 flex items-center space-x-2.5 py-1"
      aria-label="GradGuide home"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
        <GraduationCap className="h-4.5 w-4.5" aria-hidden />
      </span>
      <motion.span
        animate={{
          display: animate ? (showFull ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (showFull ? 1 : 0) : 1,
        }}
        className="flex flex-col whitespace-pre leading-none"
      >
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          GradGuide
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Copilot
        </span>
      </motion.span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  const pathname = usePathname();
  const { open, animate } = useSidebar();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  const showLabel = animate ? open : true;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group/sidebar flex items-center justify-start gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-slate-900" : "text-slate-400"
        )}
        aria-hidden
      />
      <motion.span
        animate={{
          display: animate ? (showLabel ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (showLabel ? 1 : 0) : 1,
        }}
        className="whitespace-pre !m-0 !p-0 transition duration-150 group-hover/sidebar:translate-x-0.5"
      >
        {label}
      </motion.span>
    </Link>
  );
}

function CounsellorProfile({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const { open, animate } = useSidebar();
  const showDetails = animate ? open : true;
  const initials = user != null
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
        {initials}
      </span>
      <motion.span
        animate={{
          display: animate ? (showDetails ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (showDetails ? 1 : 0) : 1,
        }}
        className="min-w-0 flex-1 whitespace-pre leading-tight"
      >
        {user != null ? (
          <>
            <span className="block truncate text-sm font-medium text-slate-900">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {user.email}
            </span>
            <span className="mt-1 block">
              <LogoutButton />
            </span>
          </>
        ) : (
          <a
            href="/login"
            className="block truncate text-sm font-medium text-slate-900 underline"
          >
            Sign in
          </a>
        )}
      </motion.span>
    </div>
  );
}

export function Sidebar({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 border-r bg-white">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Brand />
          <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
              />
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <CounsellorProfile user={user} />
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
}
