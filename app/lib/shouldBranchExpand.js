import { MAX_BRANCH_LEVEL, MIN_LEVEL_TO_CONTINUE } from "@/app/lib/config";

export function branchLevelNeededToExpand(branch) {
  return Math.floor(Math.min(
    MIN_LEVEL_TO_CONTINUE + (branch.moveList.length - 1) / 2,
    MAX_BRANCH_LEVEL
  ));
}

export default function shouldExpandBranch(branch) {
  return branch.level >= branchLevelNeededToExpand(branch);
}
