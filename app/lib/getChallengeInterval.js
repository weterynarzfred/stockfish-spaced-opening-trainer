import { BASE_INTERVAL } from "@/app/lib/config";

export default function getChallengeInterval(challenge) {
  return BASE_INTERVAL * (2 / (1 + Math.E ** -(challenge.level ** 4 / 1e6)) - 1);
}
