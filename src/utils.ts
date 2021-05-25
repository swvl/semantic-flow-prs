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
const isMergeOrRevertCommit = (message: string) => isMergeCommit(message) || isRevertCommit(message)


/* alter: 
const or = (func1, func2) => arg => func1(arg) || func2(arg)
const isMergeOrRevertCommit = or(isMergeCommit, isRevertCommit)
*/

const filterCommits = (filterFunc: (value: string) => boolean ) => (commits: Commits) => commits?.map(commit => commit.commit.message)
  .filter(filterFunc)

/*
also: getAcceptedCommits = filterCommits(negate(isMergeOrRevertCommit))
*/

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
  const filteredCommits = filterCommits(negate(isMergeOrRevertCommit))(commits)
  const type = extractCommitType(extractCommitMessage(prTitle, filteredCommits))
  const source = extractCommitSource(filteredCommits)
  return { type, source }
}

const validationMessage = (state: CommitState) => (description: string) => ({ state, description })
const failure = validationMessage('failure')
const success = validationMessage('success')

const validationMessages = {
  DISALLOWED_FEAT: failure('Disallowed feat type on a maintenance branch'),
  NOT_SEMANTIC_PR: failure('The PR title does not have semantic type'),
  NOT_SEMANTIC_COMMIT: failure('The commit message does not have semantic type'),
  READY: success('Ready to be squashed'),
}

const isFeatureOnMaintenanceBranch = conforms({ type: isEqualFeat, ref: isBaseMaintenanceBranch })
const isNotSemanticPRTitle = conforms({ type: negate(isSemanticType), source: isEqualPR, ref: stubTrue })
const isNotSemanticCommit = conforms({ type: negate(isSemanticType), source: negate(isEqualPR), ref: stubTrue })

const validateMessageType = cond([
  [isFeatureOnMaintenanceBranch, constant(validationMessages.DISALLOWED_FEAT)],
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
