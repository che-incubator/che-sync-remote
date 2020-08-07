/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { PullRequestInfo, PullRequestInfoBuilder } from '../../src/info/pull-request-info';

import { Container } from 'inversify';
import { IssueMilestoneHelper } from '../../src/helpers/issue-milestone-helper';
import { IssuesHelper } from '../../src/helpers/issue-helper';
import { Octokit } from '@octokit/rest';
import { PullRequestInfoLinkedIssuesExtractor } from '../../src/info/pull-request-info-linked-issues-extractor';

describe('Test Helper IssuesMilestoneHelper', () => {
  let container: Container;

  let pullRequestInfoLinkedIssuesExtractor: PullRequestInfoLinkedIssuesExtractor;
  let issuesHelper: IssuesHelper;

  beforeEach(() => {
    container = new Container();
    container.bind(IssueMilestoneHelper).toSelf().inSingletonScope();

    pullRequestInfoLinkedIssuesExtractor = {} as any;
    container.bind(PullRequestInfoLinkedIssuesExtractor).toConstantValue(pullRequestInfoLinkedIssuesExtractor);

    issuesHelper = {} as any;
    container.bind(IssuesHelper).toConstantValue(issuesHelper);

    container.bind(PullRequestInfoBuilder).toSelf().inSingletonScope();
  });

  // check with label existing
  test('test call correct API if milestone exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit: any = {
      issues: { listMilestonesForRepo: jest.fn(), update: jest.fn(), createMilestone: jest.fn() },
    };

    container.bind(Octokit).toConstantValue(octokit);
    const addMilestoneHelper = container.get(IssueMilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneNumber = 2503;
    // merged = true
    const issueInfo: PullRequestInfo = container
      .get(PullRequestInfoBuilder)
      .build()
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(123)
      .withMergedState(true);

    const firstItem = { title: 'foo', number: milestoneNumber };
    const secondItem = { title: milestoneToAdd, number: milestoneNumber };
    const mockListResponse = { data: [firstItem, secondItem] };
    (octokit.issues.listMilestonesForRepo as jest.Mock).mockReturnValue(mockListResponse);

    await addMilestoneHelper.setMilestone(milestoneToAdd, issueInfo);

    expect(octokit.issues.listMilestonesForRepo).toBeCalled();
    const listParams: Octokit.IssuesListMilestonesForRepoParams = octokit.issues.listMilestonesForRepo.mock.calls[0][0];
    expect(listParams.owner).toBe(issueInfo.owner);
    expect(listParams.repo).toBe(issueInfo.repo);

    // do not create as it exists
    expect(octokit.issues.createMilestone).toBeCalledTimes(0);

    expect(octokit.issues.update).toBeCalled();
    const issueUpdateParams: Octokit.IssuesUpdateParams = octokit.issues.update.mock.calls[0][0];
    expect(issueUpdateParams.milestone).toBe(milestoneNumber);
    expect(issueUpdateParams.repo).toBe(issueInfo.repo);
    expect(issueUpdateParams.owner).toBe(issueInfo.owner);
    expect(issueUpdateParams.issue_number).toBe(issueInfo.number);
  });

  // check if label does not exist on the issue
  test('test call correct API if milestone does not exist', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit: any = {
      issues: { listMilestonesForRepo: jest.fn(), update: jest.fn(), createMilestone: jest.fn() },
    };

    container.bind(Octokit).toConstantValue(octokit);
    const addMilestoneHelper = container.get(IssueMilestoneHelper);

    const milestoneToAdd = 'milestone-to-add';
    const milestoneNumber = 2503;
    // merged = true
    const issueInfo: PullRequestInfo = container
      .get(PullRequestInfoBuilder)
      .build()
      .withOwner('my-owner')
      .withRepo('repository')
      .withNumber(123)
      .withMergedState(true);

    const firstItem = { title: 'foo', number: 1 };
    const secondItem = { title: 'bar', number: 2 };
    const mockListResponse = { data: [firstItem, secondItem] };
    (octokit.issues.listMilestonesForRepo as jest.Mock).mockReturnValue(mockListResponse);

    const createMilestoneResponse = { data: { number: milestoneNumber } };
    (octokit.issues.createMilestone as jest.Mock).mockReturnValue(createMilestoneResponse);

    await addMilestoneHelper.setMilestone(milestoneToAdd, issueInfo);

    expect(octokit.issues.listMilestonesForRepo).toBeCalled();
    const listParams: Octokit.IssuesListMilestonesForRepoParams = octokit.issues.listMilestonesForRepo.mock.calls[0][0];
    expect(listParams.owner).toBe(issueInfo.owner);
    expect(listParams.repo).toBe(issueInfo.repo);

    expect(octokit.issues.createMilestone).toBeCalled();
    const createMilestoneParams: Octokit.IssuesCreateMilestoneParams = octokit.issues.createMilestone.mock.calls[0][0];
    expect(createMilestoneParams.title).toBe(milestoneToAdd);
    expect(createMilestoneParams.owner).toBe(issueInfo.owner);
    expect(createMilestoneParams.repo).toBe(issueInfo.repo);
    // do not create as it exists

    expect(octokit.issues.update).toBeCalled();
    const issueUpdateParams: Octokit.IssuesUpdateParams = octokit.issues.update.mock.calls[0][0];
    expect(issueUpdateParams.milestone).toBe(milestoneNumber);
    expect(issueUpdateParams.repo).toBe(issueInfo.repo);
    expect(issueUpdateParams.owner).toBe(issueInfo.owner);
    expect(issueUpdateParams.issue_number).toBe(issueInfo.number);
  });
});
