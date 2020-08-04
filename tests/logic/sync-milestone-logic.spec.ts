/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-null/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { CheRepositoriesFetcher } from '../../src/fetchers/che-repositories-fetcher';
import { Container } from 'inversify';
import { MilestoneHelper } from '../../src/helpers/milestone-helper';
import { Octokit } from '@octokit/rest';
import { SyncMilestoneLogic } from '../../src/logic/sync-milestone-logic';
import axios from 'axios';
import { graphql } from '@octokit/graphql';

describe('Test Sync Milestone Logic', () => {
  let container: Container;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let octokit: any;

  beforeEach(() => {
    container = new Container();
    container.bind(CheRepositoriesFetcher).toSelf().inSingletonScope();
    container.bind(MilestoneHelper).toSelf().inSingletonScope();
    container.bind(SyncMilestoneLogic).toSelf().inSingletonScope();
    octokit = {
      issues: { createMilestone: jest.fn(), updateMilestone: jest.fn() },
    };

    container.bind(Octokit).toConstantValue(octokit);
    container.bind('string').toConstantValue('fooToken').whenTargetNamed('GRAPHQL_READ_TOKEN');
  });

  test('test no che milestone', async () => {
    container.bind('number').toConstantValue(50).whenTargetNamed('MAX_CREATE_MILESTONE_PER_RUN');
    container.bind('number').toConstantValue(50).whenTargetNamed('MAX_UPDATE_MILESTONE_PER_RUN');
    const syncMilestoneLogic = container.get(SyncMilestoneLogic);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'search-milestone-no-che-milestones.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    // mock got
    const yaml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-repositories-fetcher.yaml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, yaml);

    await syncMilestoneLogic.execute();
    expect(octokit.issues.createMilestone).toHaveBeenCalledTimes(0);
    expect(octokit.issues.updateMilestone).toHaveBeenCalledTimes(0);
  });

  test('test milestone logic call limited to zero', async () => {
    // limit the number to zero
    container.bind('number').toConstantValue(0).whenTargetNamed('MAX_CREATE_MILESTONE_PER_RUN');
    container.bind('number').toConstantValue(0).whenTargetNamed('MAX_UPDATE_MILESTONE_PER_RUN');

    const syncMilestoneLogic = container.get(SyncMilestoneLogic);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'search-milestone-no-next-page.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    // mock got
    const yaml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-repositories-fetcher.yaml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, yaml);

    await syncMilestoneLogic.execute();

    expect(octokit.issues.createMilestone).toHaveBeenCalledTimes(0);
    expect(octokit.issues.updateMilestone).toHaveBeenCalledTimes(0);
  });

  test('test milestone logic call no max', async () => {
    container.bind('number').toConstantValue(50).whenTargetNamed('MAX_CREATE_MILESTONE_PER_RUN');
    container.bind('number').toConstantValue(50).whenTargetNamed('MAX_UPDATE_MILESTONE_PER_RUN');
    const syncMilestoneLogic = container.get(SyncMilestoneLogic);
    jest.mock('@octokit/graphql');
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'helper', 'search-milestone-no-next-page.json'), 'utf8');
    const parsedJSON = JSON.parse(json);
    (graphql as any).__setDefaultExports(parsedJSON);

    // mock got
    const yaml = await fs.readFile(path.join(__dirname, '..', '_data', 'fetcher', 'che-repositories-fetcher.yaml'), 'utf8');
    jest.mock('axios');
    (axios as any).__setContent(CheRepositoriesFetcher.CHE_REPOSITORIES_YAML, yaml);

    await syncMilestoneLogic.execute();

    expect(octokit.issues.createMilestone).toBeCalled();
    expect(octokit.issues.updateMilestone).toBeCalled();

    // grab call for 7.17
    const calls: any[] = octokit.issues.createMilestone.mock.calls;
    const createCalls = calls.filter(call => {
      const createMilestoneParams: Octokit.IssuesCreateMilestoneParams = call[0];
      return createMilestoneParams.repo === 'che-sidecar-java' && createMilestoneParams.title === '7.20';
    });
    expect(createCalls).toBeDefined();
    expect(createCalls.length).toBe(1);
    const createCall = createCalls[0][0] as Octokit.IssuesCreateMilestoneParams;

    expect(createCall.owner).toBe('che-dockerfiles');
    expect(createCall.title).toBe('7.20');
    expect(createCall.repo).toBe('che-sidecar-java');
    expect(createCall.due_on).toBe('2020-10-07T00:00:00Z');
    expect(createCall.state).toBe('open');
  });
});
