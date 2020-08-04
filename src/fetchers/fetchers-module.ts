import { ContainerModule, interfaces } from 'inversify';

import { CheRepositoriesFetcher } from './che-repositories-fetcher';
import { CheVersionFetcher } from './che-version-fetcher';

const fetchersModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(CheVersionFetcher).toSelf().inSingletonScope();
  bind(CheRepositoriesFetcher).toSelf().inSingletonScope();
});

export { fetchersModule };
