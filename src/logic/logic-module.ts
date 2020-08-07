import { ContainerModule, interfaces } from 'inversify';

import { ApplyMilestoneOnPullRequestsLogic } from './apply-milestone-on-pull-requests-logic';
import { Logic } from '../api/logic';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';
import { SyncMilestoneLogic } from './sync-milestone-logic';
import { bindMultiInjectProvider } from '../api/multi-inject-provider';

const logicModule = new ContainerModule((bind: interfaces.Bind) => {
  bindMultiInjectProvider(bind, Logic);

  bind(SyncMilestoneLogic).to(SyncMilestoneLogic).inSingletonScope();
  bind(ScheduleListener).toService(SyncMilestoneLogic);
  bind(PushListener).toService(SyncMilestoneLogic);
  bind(Logic).toService(SyncMilestoneLogic);

  bind(ApplyMilestoneOnPullRequestsLogic).to(ApplyMilestoneOnPullRequestsLogic).inSingletonScope();
  bind(ScheduleListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(PushListener).toService(ApplyMilestoneOnPullRequestsLogic);
  bind(Logic).toService(ApplyMilestoneOnPullRequestsLogic);
});

export { logicModule };
