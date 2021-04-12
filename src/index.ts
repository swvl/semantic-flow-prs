import { Probot } from "probot";
import { types } from 'conventional-commit-types';
import { sync } from 'conventional-commits-parser';

export = (app: Probot) => {
  app.on(['pull_request.opened', 'pull_request.edited', 'pull_request.synchronize'], async (context) => {
    const {
      pull_request: { title, head: { sha }, base: { ref } },
      repository: { owner: { login: owner }, name: repo }
    } = context.payload

    const isBaseMaintenanceBranch = /([0-9])+?\.([0-9])+\.x/.test(ref)    
    const { type } = sync(title)
    const isSemanticType = Object.keys(types).includes(type || '')
    const state = isBaseMaintenanceBranch && type === 'feat' ? 'failure' : isSemanticType ? 'success' : 'failure'

    const result = await context.octokit.repos.createCommitStatus({
      sha,
      state,
      owner,
      repo
    })
    return result
  });
};
