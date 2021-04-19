import { cond, stubTrue, conforms, constant, isEqual, negate } from 'lodash';
import { types } from 'conventional-commit-types';
import { sync } from 'conventional-commits-parser';
import { Endpoints } from '@octokit/types';

export type CommitState = "error" | "failure" | "pending" | "success";

type Commits = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"]['response']['data']

const conventionalCommitTypes: (string | null | undefined)[] = [
  ...Object.keys(types),
  'hotfeat' //TODO: get from context config
]

const isMergeCommit = (message: string) => message.startsWith('Merge')
const isRevertCommit = (message: string) => message.startsWith('Revert')

const nonMergeOrRevertCommits = (commits: Commits) => commits?.map(commit => commit.commit.message)
  .filter(negate(isMergeCommit))
  .filter(negate(isRevertCommit))

const isSemanticType = (type: string): boolean => conventionalCommitTypes.includes(type)
const isEqualFeat = (type: string) => isEqual(type, 'feat')
const isEqualPR = (source: string) => isEqual(source, 'pr')
const isBaseMaintenanceBranch = (ref: string): boolean => /^(\d+)\.(\d+)\.x$/.test(ref)

const isOneCommit = (commits: string[]) => commits.length === 1

const extractCommitMessage = (prTitle: string, filteredCommits: string[]) =>
  isOneCommit(filteredCommits) ? filteredCommits[0] : prTitle

const extractCommitSource = (filteredCommits: string[]) =>
  isOneCommit(filteredCommits) ? 'commit' : 'pr'

const extractCommitType = (message: string) => sync(message).type

const getSquashMessageType = (prTitle: string, commits: Commits) => {
  const filteredCommits = nonMergeOrRevertCommits(commits)
  const type = extractCommitType(extractCommitMessage(prTitle, filteredCommits))
  const source = extractCommitSource(filteredCommits)
  return { type, source }
}

const validationMessages = {
  FEAT: { state: 'failure', description: 'Disallowed feat type on a maintenance branch' },
  NOT_SEMANTIC_PR: { state: 'failure', description: 'The pr title does not have semantic type' },
  NOT_SEMANTIC_COMMIT: { state: 'failure', description: 'The commit does not have semantic type' },
  READY: { state: 'success', description: 'ready to be squashed' }
}

const isFeatureOnMaintenanceBranch = conforms({ type: isEqualFeat, ref: isBaseMaintenanceBranch })
const isNotSemanticPRTitle = conforms({ type: negate(isSemanticType), source: isEqualPR, ref: stubTrue })
const isNotSemanticCommit = conforms({ type: negate(isSemanticType), source: negate(isEqualPR), ref: stubTrue })

const validateMessageType = cond([
  [isFeatureOnMaintenanceBranch, constant(validationMessages.FEAT)],
  [isNotSemanticPRTitle, constant(validationMessages.NOT_SEMANTIC_PR)],
  [isNotSemanticCommit, constant(validationMessages.NOT_SEMANTIC_COMMIT)],
  [stubTrue, constant(validationMessages.READY)]
]);

export const isSemanticPR = (title: string, commits: any, ref: string) => {
  const { type, source } = getSquashMessageType(title, commits)
  const message = { type, ref, source }

  const { state: commitState, description } = validateMessageType(message)
  const state = commitState as CommitState;

  return { state, description }
}
