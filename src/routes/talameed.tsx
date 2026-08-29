import { createFileRoute } from "@tanstack/react-router";
import { SpaceAuth, SpaceShell } from "@/components/SpaceAuth";

export const Route = createFileRoute("/talameed")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "فضاء التلاميذ — مداوروس" },
      { name: "description", content: "تسجيل الدخول وإنشاء حساب لتلاميذ مداوروس، بجلسة مستقلة عن باقي الفضاءات." },
      { property: "og:title", content: "فضاء التلاميذ — مداوروس" },
      { property: "og:description", content: "دخول التلاميذ إلى دروسهم وواجباتهم على منصة مداوروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SpaceAuth space="talameed">
      {({ session, signOut }) => (
        <SpaceShell space="talameed">
          <div className="text-center">
            <h1 className="text-2xl font-normal text-foreground">مرحباً بك</h1>
            <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
              {session.user.email}
            </p>
            <p className="mt-6 text-sm text-foreground">
              تمت المصادقة على حسابك. هذه لوحة التلميذ الخاصة بك.
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
