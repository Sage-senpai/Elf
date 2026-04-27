import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "./UserMenu";

type Props = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

/**
 * The signed-in header's right-side cluster: notification bell + user menu.
 * Every authenticated page renders <HeaderActions user={session.user} />
 * instead of <UserMenu /> so the bell is automatically present.
 */
export function HeaderActions({ user }: Props) {
  return (
    <div className="flex items-center gap-1">
      <NotificationBell />
      <UserMenu user={user} />
    </div>
  );
}
