let activeAudio = null;
export function claimAudio(element) {
  if (activeAudio && activeAudio !== element) activeAudio.pause();
  activeAudio = element;
}
export function releaseAudio(element) {
  if (activeAudio === element) activeAudio = null;
}
