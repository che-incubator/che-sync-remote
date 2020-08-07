import * as moment from 'moment';

import { MilestoneDefinition, MilestoneHelper } from '../helpers/milestone-helper';
import { inject, injectable, named } from 'inversify';

import { CheRepositoriesFetcher } from '../fetchers/che-repositories-fetcher';
import { Logic } from '../api/logic';
import { PushListener } from '../api/push-listener';
import { ScheduleListener } from '../api/schedule-listener';

export interface MilestoneSyncRepository {
  owner: string;
  name: string;
}

export interface MilestoneSync {
  repository: MilestoneSyncRepository;
  milestoneDetails: MilestoneDefinition;
}

@injectable()
export class SyncMilestoneLogic implements Logic, ScheduleListener, PushListener {
  @inject('number')
  @named('MAX_CREATE_MILESTONE_PER_RUN')
  private maxCreateMilestonePerRun: number;

  @inject('number')
  @named('MAX_UPDATE_MILESTONE_PER_RUN')
  private maxUpdateMilestonePerRun: number;

  @inject(MilestoneHelper)
  private milestoneHelper: MilestoneHelper;

  @inject(CheRepositoriesFetcher)
  private cheRepositoriesFetcher: CheRepositoriesFetcher;

  async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  async execute(): Promise<void> {
    // grab all repositories
    const repositories = await (await this.cheRepositoriesFetcher.getRepositories()).filter(repo => repo.useCheReleaseLifecycle === true);

    // grab all milestones from all repository
    const milestonesPerRepository = await this.milestoneHelper.searchMilestones(
      repositories.map(repository => repository.url.substring('https://github.com/'.length))
    );

    // filter out all starting with 7.x and upwards
    const cheMilestones = milestonesPerRepository.get('eclipse/che');
    let filteredMilestones: string[] = [];
    if (!cheMilestones) {
      return;
    }
    filteredMilestones = Array.from(cheMilestones.keys()).filter(milestone => {
      const firstChar = milestone[0];
      const intVal = Number(firstChar);
      return !isNaN(intVal) && intVal >= 7;
    });

    // now, search all inconsistencies for each repository

    const milestonesToAdd: MilestoneSync[] = [];
    const milestonesToUpdate: MilestoneSync[] = [];

    Array.from(milestonesPerRepository.keys()).forEach(repositoryKey => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const repoMilestones = milestonesPerRepository.get(repositoryKey)!;

      // compare with che milestones
      filteredMilestones.forEach(cheMilestoneTitle => {
        const repoMilestoneDetails = repoMilestones.get(cheMilestoneTitle);
        // compare details
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const cheMilestoneDetails = cheMilestones.get(cheMilestoneTitle)!;

        let cheMilestoneDate;
        // eslint-disable-next-line no-null/no-null
        if (cheMilestoneDetails.dueOn !== null) {
          cheMilestoneDate = moment(cheMilestoneDetails.dueOn).format('YYYY-MM-DD');
        } else {
          // eslint-disable-next-line no-null/no-null
          cheMilestoneDate = null;
        }

        const entry = {
          repository: {
            owner: repositoryKey.substring(0, repositoryKey.indexOf('/')),
            name: repositoryKey.substring(repositoryKey.indexOf('/') + 1),
          },
          milestoneDetails: {
            title: cheMilestoneDetails.title,
            number: repoMilestoneDetails ? repoMilestoneDetails.number : cheMilestoneDetails.number,
            description: cheMilestoneDetails.description,
            dueOn: cheMilestoneDate,
            state: cheMilestoneDetails.state,
          },
        };
        // do not exists
        if (!repoMilestoneDetails) {
          milestonesToAdd.push(entry);
        } else {
          let repoMilestoneDate;

          // eslint-disable-next-line no-null/no-null
          if (repoMilestoneDetails.dueOn !== null) {
            repoMilestoneDate = moment(repoMilestoneDetails.dueOn).format('YYYY-MM-DD');
          } else {
            // eslint-disable-next-line no-null/no-null
            repoMilestoneDate = null;
          }
          if (
            cheMilestoneDetails.title !== repoMilestoneDetails.title ||
            cheMilestoneDetails.description !== repoMilestoneDetails.description ||
            cheMilestoneDate !== repoMilestoneDate ||
            cheMilestoneDetails.state !== repoMilestoneDetails.state
          ) {
            milestonesToUpdate.push(entry);
          }
        }
      });
    });

    console.log(`Milestones to add: ${milestonesToAdd.length}`);
    console.log(`Milestones to update: ${milestonesToUpdate.length}`);

    if (milestonesToAdd.length > this.maxCreateMilestonePerRun) {
      milestonesToAdd.length = this.maxCreateMilestonePerRun;
      console.log(`Milestones to add > ${this.maxCreateMilestonePerRun}, keep only ${milestonesToAdd.length} for this run`);
    }
    if (milestonesToUpdate.length > this.maxUpdateMilestonePerRun) {
      milestonesToUpdate.length = this.maxUpdateMilestonePerRun;
      console.log(`Milestones to update > ${this.maxUpdateMilestonePerRun}, keep only ${milestonesToUpdate.length} for this run`);
    }

    // ok so now, create milestones in all repositories

    for await (const entry of milestonesToAdd) {
      // do not flush too many calls at once on github
      await this.wait(500);
      await this.milestoneHelper.createMilestone(entry.repository.owner, entry.repository.name, entry.milestoneDetails);
    }

    // do update of milestones in all repositories
    for await (const entry of milestonesToUpdate) {
      // do not flush too many calls at once on github
      await this.wait(500);
      await this.milestoneHelper.updateMilestone(entry.repository.owner, entry.repository.name, entry.milestoneDetails);
    }
  }
}
