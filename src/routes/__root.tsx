import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { HideContentProvider } from '#/hooks/use-hide-content'
import appCss from '#/styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

// Applies the stored theme before first paint to avoid a flash (no-flash gate).
const THEME_INIT = `(function(){try{var s=localStorage.getItem('theme');var m=(s==='light'||s==='dark'||s==='auto')?s:'auto';var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=m==='auto'?(d?'dark':'light'):m;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);if(m==='auto'){e.removeAttribute('data-theme')}else{e.setAttribute('data-theme',m)}e.style.colorScheme=r;}catch(x){}})();`

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#0a0e14' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      { name: 'apple-mobile-web-app-title', content: 'cmux' },
      { title: 'cmux-web' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', type: 'image/png', href: '/icon.png', sizes: '32x32' },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/logo192.png',
        sizes: '192x192',
      },
      { rel: 'apple-touch-icon', href: '/apple-icon.png' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static no-flash theme script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <HeadContent />
      </head>
      <body>
        <HideContentProvider>{children}</HideContentProvider>
        <Scripts />
      </body>
    </html>
  )
}
