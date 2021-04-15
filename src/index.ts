import { Probot } from "probot";
import { CommitState, getSquashMessageType, validateMessageType } from "./utils";

export = (app: Probot) => {
  app.on(['pull_request.opened', 'pull_request.edited', 'pull_request.synchronize'], async (context) => {
    const {
      pull_request: { title, number: pull_number, head: { sha }, base: { ref } },
      repository: { owner: { login: owner }, name: repo }
    } = context.payload;

    const commits = await context.octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number,
    });

    const { type, source } = getSquashMessageType(title, commits)
    const message = { type, ref, source }

    
    const { state: commitState, description } = validateMessageType(message)
    const state = commitState as CommitState;

    const result = await context.octokit.repos.createCommitStatus({
      sha,
      owner,
      repo,
      state,
      description
    });
    return result
  });
};
