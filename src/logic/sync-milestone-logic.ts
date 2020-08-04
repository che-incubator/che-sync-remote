import { MilestoneDefinition, MilestoneHelper } from '../helpers/milestone-helper';
import { inject, injectable, named } from 'inversify';

import { CheRepositoriesFetcher } from '../fetchers/che-repositories-fetcher';
import { Logic } from '../api/logic';
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
export class SyncMilestoneLogic implements Logic, ScheduleListener {
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

  async execute(): Promise<void> {
    // grab all repositories
    const repositories = await this.cheRepositoriesFetcher.getRepositories();

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
        const entry = {
          repository: {
            owner: repositoryKey.substring(0, repositoryKey.indexOf('/')),
            name: repositoryKey.substring(repositoryKey.indexOf('/') + 1),
          },
          milestoneDetails: cheMilestoneDetails,
        };
        // do not exists
        if (!repoMilestoneDetails) {
          milestonesToAdd.push(entry);
        } else {
          if (
            cheMilestoneDetails.title !== repoMilestoneDetails.title ||
            cheMilestoneDetails.description !== repoMilestoneDetails.description ||
            cheMilestoneDetails.dueOn !== repoMilestoneDetails.dueOn ||
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
      console.log(`Milestones to add > ${this.maxCreateMilestonePerRun}, keep to only ${milestonesToAdd.length} for this run`);
    }
    if (milestonesToUpdate.length > this.maxUpdateMilestonePerRun) {
      milestonesToUpdate.length = this.maxUpdateMilestonePerRun;
      console.log(`Milestones to update > ${this.maxUpdateMilestonePerRun}, keep to only ${milestonesToUpdate.length} for this run`);
    }

    // ok so now, create milestones in all repositories
    await Promise.all(
      milestonesToAdd.map(async entry =>
        this.milestoneHelper.createMilestone(entry.repository.owner, entry.repository.name, entry.milestoneDetails)
      )
    );

    // do update of milestones in all repositories
    await Promise.all(
      milestonesToUpdate.map(async entry =>
        this.milestoneHelper.updateMilestone(entry.repository.owner, entry.repository.name, entry.milestoneDetails)
      )
    );
  }
}
