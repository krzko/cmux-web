import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CmuxGateway } from '#/domain/ports/cmux-gateway'
import type { EventsSource } from '#/domain/ports/events-source'
import { type AuthConfig, loadAuthConfig } from '#/infrastructure/auth/session'
import { CmuxCliGateway } from '#/infrastructure/cmux/cmux-cli-gateway'
import { loadCmuxConfig } from '#/infrastructure/cmux/config'
import { CmuxEventsSource } from '#/infrastructure/cmux/events-source'
import { CmuxCliTransport } from '#/infrastructure/cmux/transport'

// Composition root: the only place concretes are constructed. Everything above
// depends on ports (DIP). Singletons live for the server process lifetime.
const cmuxConfig = loadCmuxConfig()
const authConfig = loadAuthConfig()
const gateway: CmuxGateway = new CmuxCliGateway(
  new CmuxCliTransport(cmuxConfig),
)

let eventsSource: EventsSource | undefined

export function getGateway(): CmuxGateway {
  return gateway
}

export function getAuthConfig(): AuthConfig {
  return authConfig
}

export function getEventsSource(): EventsSource {
  if (!eventsSource) {
    const cursorFile =
      process.env.CMUX_EVENTS_CURSOR ?? join(tmpdir(), 'cmux-web-events.seq')
    eventsSource = new CmuxEventsSource(cmuxConfig, cursorFile)
  }
  return eventsSource
}
