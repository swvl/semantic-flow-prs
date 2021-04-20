import { Probot } from "probot";
import { test } from "./test";
import { isSemanticPR } from "./utils";

export = (app: Probot) => {
  app.on(['pull_request.opened', 'pull_request.edited', 'pull_request.synchronize'], async (context) => {
    const {
      pull_request: { title, number: pull_number, head: { sha }, base: { ref } },
      repository: { owner: { login: owner }, name: repo }
    } = context.payload;

    const commits = await context.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number,
    });

    const { state, description } = isSemanticPR(title, commits.data, ref)

    test()

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
