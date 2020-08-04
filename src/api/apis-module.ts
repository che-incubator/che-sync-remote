import { ContainerModule, interfaces } from 'inversify';

import { ScheduleListener } from './schedule-listener';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';
import { PushListener } from './push-listener';

const apisModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, ScheduleListener);
  bindMultiInjectProvider(bind, PushListener);
});

export { apisModule };
