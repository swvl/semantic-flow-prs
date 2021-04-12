import { Probot } from "probot";

export = (app: Probot) => {
  app.on(['pull_request.opened', 'pull_request.edited', 'pull_request.synchronize'], async (context) => {
    console.log('===================================')
    console.log(context)
    console.log('===================================')
    const { title, head } = context.payload.pull_request
    console.log('===================================')
    console.log({ title, head })
    console.log('===================================')
    // const issueComment = context.issue({
    //   body: "Thanks for opening this issue!",
    // });
    // await context.octokit.issues.createComment(issueComment);
    // const status = {
    //   sha: head.sha,
    //   state: 'failure',
    //   target_url: 'https://github.com/probot/semantic-pull-requests',
    //   description: getDescription(),
    //   context: 'Semantic Pull Request'
    // }
    // const result = await context.github.repos.createStatus(context.repo(status))
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
