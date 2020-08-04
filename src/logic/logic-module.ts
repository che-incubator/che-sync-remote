import { ContainerModule, interfaces } from 'inversify';

import { Logic } from '../api/logic';
import { ScheduleListener } from '../api/schedule-listener';
import { SyncMilestoneLogic } from './sync-milestone-logic';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';
import { PushListener } from '../api/push-listener';

const logicModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Logic);

  bind(SyncMilestoneLogic).to(SyncMilestoneLogic).inSingletonScope();
  bind(ScheduleListener).toService(SyncMilestoneLogic);
  bind(PushListener).toService(SyncMilestoneLogic);
  bind(Logic).toService(SyncMilestoneLogic);
});

export { logicModule };
