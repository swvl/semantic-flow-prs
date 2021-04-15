import { cond, stubTrue, conforms, constant, isEqual, get } from 'lodash';
import { types } from 'conventional-commit-types';
import { sync } from 'conventional-commits-parser';

export type CommitState = "error" | "failure" | "pending" | "success";

export const conventionalCommitTypes: (string | null | undefined)[] = [
  ...Object.keys(types),
  'hotfeat' //TODO: get from context config
]

export const not = (callback: Function) => (value: boolean) => !callback(value)

export const isSemanticType = (type: string): boolean => conventionalCommitTypes.includes(type)
export const isEqualFeat = (type: string) => isEqual(type, 'feat')
export const isEqualPR = (source: string) => isEqual(source, 'pr')


export const isBaseMaintenanceBranch = (ref: string): boolean => /^(\d+)\.(\d+)\.x$/.test(ref)

export const getSquashMessageType = (prTitle: string, commits: any) => {
  const isOneCommit = commits?.data?.length === 1
  const source = isOneCommit ? 'commit' : 'pr'
  console.log('===================================')
  console.log(commits?.data[0]?.commit?.message)
  console.log('===================================')
  console.log(prTitle)
  console.log('===================================')
  const message = isOneCommit ? commits?.data[0]?.commit?.message : prTitle
  const { type } = sync(message);
  return { type, source }
}

export const messageValidationOptions = {
  FEAT: constant({ state: 'failure', description: 'Disallowed feat type on a maintenance branch' }),
  NOT_SEMANTIC_PR: constant({ state: 'failure', description: 'The pr title does not have semantic type' }),
  NOT_SEMANTIC_COMMIT: constant({ state: 'failure', description: 'The commit does not have semantic type' }),
  READY: constant({ state: 'success', description: 'ready to be squashed' })
}

export const validateMessageType = cond([
  [conforms({ type: isEqualFeat, ref: isBaseMaintenanceBranch }), get(messageValidationOptions, 'FEAT')],
  [conforms({ type: not(isSemanticType), source: isEqualPR, ref: stubTrue }), get(messageValidationOptions, 'NOT_SEMANTIC_PR')],
  [conforms({ type: not(isSemanticType), source: not(isEqualPR), ref: stubTrue }), get(messageValidationOptions, 'NOT_SEMANTIC_COMMIT')],
  [stubTrue, get(messageValidationOptions, 'READY')]
]);

