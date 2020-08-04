import 'reflect-metadata';

import { AddLabelHelper } from '../src/helpers/add-label-helper';
import { Analysis } from '../src/analysis';
import { CheRepositoriesFetcher } from '../src/fetchers/che-repositories-fetcher';
import { CheVersionFetcher } from '../src/fetchers/che-version-fetcher';
import { Container } from 'inversify';
import { Handler } from '../src/api/handler';
import { InversifyBinding } from '../src/inversify-binding';
import { Logic } from '../src/api/logic';
import { MilestoneHelper } from '../src/helpers/milestone-helper';
import { OctokitBuilder } from '../src/github/octokit-builder';
import { ScheduleHandler } from '../src/handler/schedule-handler';
import { ScheduleListener } from '../src/api/schedule-listener';
import { SyncMilestoneLogic } from '../src/logic/sync-milestone-logic';

describe('Test InversifyBinding', () => {
  test('test bindings', async () => {
    const inversifyBinding = new InversifyBinding('foo', 'bar');
    const container: Container = inversifyBinding.initBindings();

    expect(inversifyBinding).toBeDefined();

    // Handler
    const handlers: Handler[] = container.getAll(Handler);
    expect(handlers.find(handler => handler.constructor.name === ScheduleHandler.name)).toBeTruthy();

    const scheduleListeners: ScheduleListener[] = container.getAll(ScheduleListener);
    expect(scheduleListeners).toBeDefined();
    expect(scheduleListeners.find(listener => listener.constructor.name === SyncMilestoneLogic.name)).toBeTruthy();

    // fetcher
    expect(container.get(CheVersionFetcher)).toBeDefined();
    expect(container.get(CheRepositoriesFetcher)).toBeDefined();

    // helpers
    expect(container.get(AddLabelHelper)).toBeDefined();
    expect(container.get(MilestoneHelper)).toBeDefined();

    // logic
    const logics: Logic[] = container.getAll(Logic);
    expect(logics).toBeDefined();
    expect(logics.find(logic => logic.constructor.name === SyncMilestoneLogic.name)).toBeTruthy();

    const octokitBuilder = container.get(OctokitBuilder);
    expect(octokitBuilder).toBeDefined();

    const analysis = container.get(Analysis);
    expect(analysis).toBeDefined();
  });
});
