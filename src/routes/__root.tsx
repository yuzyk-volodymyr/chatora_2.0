import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import OneSignal from '@onesignal/capacitor-plugin';
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Функция для логов (оставляем для отладки)
const logToSupabase = async (message: string) => {
  try { await supabase.from('debug_logs').insert({ message }); } catch (e) {}
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#7c3aed" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Chatora" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <div>404</div>,
  errorComponent: ErrorComponent,
});

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return <div>Error: {error.message} <button onClick={reset}>Reset</button></div>;
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initOneSignal = async () => {
      await logToSupabase("🚀 Старт OneSignal");

      // 1. Инициализация (ВСТАВЬТЕ ВАШ ONESIGNAL APP ID СЮДА)
      OneSignal.initialize("a61f1a1b-ef1f-4dec-a711-b3dac2221f79");

      // 2. Запрос разрешения
      const accepted = await OneSignal.Notifications.requestPermission(true);
      await logToSupabase(`✅ OneSignal Разрешение: ${accepted}`);

      // 3. Привязываем ID пользователя Supabase к устройству в OneSignal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await OneSignal.login(user.id);
        await logToSupabase(`🎉 OneSignal: Привязан юзер ${user.id}`);
      }
    };

    initOneSignal();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}