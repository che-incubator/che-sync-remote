import { ContainerModule, interfaces } from 'inversify';

import { AddLabelHelper } from './add-label-helper';
import { MilestoneHelper } from './milestone-helper';

const helpersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(AddLabelHelper).toSelf().inSingletonScope();
  bind(MilestoneHelper).toSelf().inSingletonScope();
});

export { helpersModule };
