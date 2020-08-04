/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { CheRepositoriesFetcher, Repositories } from '../../src/fetchers/che-repositories-fetcher';

import { Container } from 'inversify';
import axios from 'axios';

describe('Test CheRepositoriesFetcher', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(CheRepositoriesFetcher).toSelf().inSingletonScope();
  });

  test('test get repositories', async () => {
    // mock got
    const yaml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-repositories-fetcher.yaml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, yaml);

    const cheRepositoriesFetcher = await container.get(CheRepositoriesFetcher);

    const repositories: Repositories[] = await cheRepositoriesFetcher.getRepositories();
    expect(repositories).toBeDefined();
    expect(repositories.length).toBe(47);

    // Change the content, so it shouldn't be call it anymore
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, 'invalid');

    expect(axios.get).toBeCalled();
    const anotherCallRepositories: Repositories[] = await cheRepositoriesFetcher.getRepositories();
    expect(anotherCallRepositories).toBeDefined();
    // should be the same than previous call
    expect(anotherCallRepositories).toEqual(repositories);
  });

  test('test unable to get version', async () => {
    // mock got
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, 'empty');

    const cheRepositoriesFetcher = await container.get(CheRepositoriesFetcher);

    await expect(cheRepositoriesFetcher.getRepositories()).rejects.toThrow(/Unable to get list of the repositories from/);
  });
});
