"use client";

import { Award, Badge as BadgeIcon, Sparkles } from "lucide-react";

import AvatarUpload from "@/components/ui/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileHeaderCardProps {
  title: string;
  subtitle: string;
  profile: {
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    is_member?: boolean;
  } | null;
  user: { email?: string | null };
  showRoleBadge?: boolean;
  adminData?: { adminCheck?: { role?: string } } | null;
  memberSince: string;
  onAvatarUpload: (url: string) => void;
}

export function ProfileHeaderCard({
  title,
  subtitle,
  profile,
  user,
  showRoleBadge,
  adminData,
  memberSince,
  onAvatarUpload,
}: ProfileHeaderCardProps) {
  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email?.split("@")[0];

  return (
    <>
      <div className="mb-6 sm:mb-8 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium font-body">
          {subtitle}
        </p>
      </div>

      <Card
        className="mb-6 sm:mb-8 md:mb-10 overflow-hidden border-white/20 dark:border-slate-800/50 shadow-2xl animate-in zoom-in-95 duration-500 bg-[var(--admin-bg-tertiary)] backdrop-blur-xl"
        rounded="lg"
        variant="glass"
      >
        <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
            <div className="relative group shrink-0 flex flex-col items-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500 scale-75 pointer-events-none" />
              <div className="relative z-10">
                <AvatarUpload
                  currentAvatarUrl={profile?.avatar_url || undefined}
                  isEditing={true}
                  size="lg"
                  onUploadSuccess={onAvatarUpload}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left space-y-3 sm:space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-center md:justify-start gap-2 sm:gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                    {displayName}
                  </h2>
                  {showRoleBadge && (
                    <Badge
                      className="w-fit mx-auto md:mx-0 bg-green-500/10 text-green-600 border-none px-2 sm:px-3 py-1 font-bold text-[9px] sm:text-[10px] uppercase"
                      variant="healty"
                    >
                      {adminData?.adminCheck?.role || "ADMINISTRADOR"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm sm:text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                  {user.email}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-start">
                {profile?.is_member && (
                  <Badge className="gap-1.5 sm:gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 sm:px-4 py-1.5 rounded-full transition-all">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="font-bold tracking-wide text-[9px] sm:text-[10px] uppercase">
                      MIEMBRO GOLD
                    </span>
                  </Badge>
                )}
                <Badge
                  className="gap-1.5 sm:gap-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-3 sm:px-4 py-1.5 rounded-full transition-all"
                  variant="outline"
                >
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-500" />
                  <span className="text-slate-600 dark:text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase">
                    Desde {memberSince}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
