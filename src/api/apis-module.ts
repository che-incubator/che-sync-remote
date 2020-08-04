import { ContainerModule, interfaces } from 'inversify';

import { ScheduleListener } from './schedule-listener';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

const apisModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, ScheduleListener);
});

export { apisModule };
