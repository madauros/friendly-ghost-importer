import { createFileRoute } from "@tanstack/react-router";
import { SpaceAuth, SpaceShell } from "@/components/SpaceAuth";

export const Route = createFileRoute("/taleem")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "فضاء التعليم — مداوروس" },
      { name: "description", content: "تسجيل الدخول وإنشاء حساب لأساتذة مداوروس، بجلسة مستقلة عن باقي الفضاءات." },
      { property: "og:title", content: "فضاء التعليم — مداوروس" },
      { property: "og:description", content: "دخول الأساتذة لإدارة الأقسام والدروس على منصة مداوروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SpaceAuth space="taleem">
      {({ session, signOut }) => (
        <SpaceShell space="taleem">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-foreground">مرحباً أستاذ(ة)</h1>
            <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
              {session.user.email}
            </p>
            <p className="mt-6 text-sm text-foreground">
              تمت المصادقة على حسابك. هذه لوحة الأستاذ الخاصة بك.
            </p>
            <div className="mt-8 flex justify-end">
              <button type="button" onClick={signOut} className="btn-text">
                تسجيل الخروج
              </button>
            </div>
          </div>
        </SpaceShell>
      )}
    </SpaceAuth>
  );
}
