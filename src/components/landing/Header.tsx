import { getSession } from "@/lib/auth/session";
import { HeaderShell } from "./HeaderShell";

/**
 * Server wrapper — reads the session, hands a plain user object (or null)
 * to the client shell that owns scroll state, mobile-menu state, and
 * active-section highlighting.
 */
export async function Header() {
  const session = await getSession();
  const user = session
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image
      }
    : null;
  return <HeaderShell user={user} />;
}
