import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const logPushDebug = async (message: string) => {
  try {
    const { error } = await supabase.from("debug_logs").insert({ message });
    if (error) console.error("Не удалось записать лог Push-уведомлений:", error);
  } catch (e) {
    console.error("Не удалось записать лог Push-уведомлений:", e);
  }
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#7c3aed" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Chatora" },
      {
        name: "description",
        content: "Anonymous one-to-one messenger with voice messages and calls.",
      },
      { name: "author", content: "Chatora" },
      { property: "og:title", content: "Chatora" },
      {
        property: "og:description",
        content: "Anonymous one-to-one messenger with voice messages and calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupPush = async () => {
      await logPushDebug("Старт настройки Push-уведомлений");

      // 1. Разрешения
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== "granted") {
        await logPushDebug("Пользователь не предоставил разрешение на уведомления");
        return;
      }
      await logPushDebug("Разрешение на уведомления получено");

      // 2. Слушатели
      PushNotifications.addListener("registration", async (token) => {
        await logPushDebug("Токен push-уведомлений получен");

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("device_tokens")
            .upsert({ user_id: user.id, token: token.value }, { onConflict: "token" });
          if (error) {
            console.error("Не удалось сохранить токен push-уведомлений:", error);
            await logPushDebug("Не удалось сохранить токен push-уведомлений");
          } else {
            await logPushDebug("Токен push-уведомлений сохранен");
          }
        } else {
          await logPushDebug("Токен получен, но пользователь не авторизован");
        }
      });

      PushNotifications.addListener("registrationError", async (error) => {
        console.error("Ошибка регистрации Push-уведомлений:", error);
        await logPushDebug("Ошибка регистрации Push-уведомлений");
      });

      // 3. Регистрация
      await logPushDebug("Вызов регистрации Push-уведомлений");
      await PushNotifications.register();
    };

    setupPush().catch((error: unknown) => {
      console.error("Критическая ошибка настройки Push-уведомлений:", error);
      void logPushDebug("Критическая ошибка настройки Push-уведомлений");
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
