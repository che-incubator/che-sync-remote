import * as yaml from 'yaml';

import axios from 'axios';
import { injectable } from 'inversify';

export class Repositories {
  name: string;
  url: string;
  useCheReleaseLifecycle: boolean;
}

@injectable()
export class CheRepositoriesFetcher {
  public static readonly CHE_REPOSITORIES_YAML = 'https://raw.githubusercontent.com/eclipse/che/master/.repositories.yaml';

  private repositories: Promise<Repositories[]>;

  async init(): Promise<Repositories[]> {
    const response = await axios.get(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML);
    const data = response.data;
    const repositories: Repositories[] = [];

    // yaml
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = yaml.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRepositories: any[] = parsed.repositories;
    if (parsedRepositories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedRepositories.forEach((repoDef: any) => {
        repositories.push({ name: repoDef.name, url: repoDef.url, useCheReleaseLifecycle: repoDef.useCheReleaseLifecycle });
      });
    } else {
      throw new Error(`Unable to get list of the repositories from ${CheRepositoriesFetcher.CHE_REPOSITORIES_YAML}: ${response.data}`);
    }
    return repositories;
  }

  public getRepositories(): Promise<Repositories[]> {
    if (!this.repositories) {
      this.repositories = this.init();
    }

    return this.repositories;
  }
}
