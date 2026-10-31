import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import OneSignal from '@onesignal/capacitor-plugin';
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Chatora" }, 
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" }
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <div className="p-4 text-center text-white bg-[#0a0a0a] h-screen">404 Not Found</div>,
  errorComponent: ({ reset }: ErrorComponentProps) => <div className="p-4 text-center text-white bg-[#0a0a0a] h-screen">Ошибка <button onClick={reset} className="text-purple-400 ml-2">Повторить</button></div>,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="bg-[#0a0a0a] text-white antialiased m-0 p-0 overflow-hidden">{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initOneSignal = async () => {
      // Инициализация OneSignal
      OneSignal.initialize("a61f1a1b-ef1f-4dec-a711-b3dac2221f79");
      await OneSignal.Notifications.requestPermission(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await OneSignal.login(user.id);
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