/** Best-effort "is this a phone/tablet" check — used to steer camera-dependent
 * registration steps (selfie verification) toward mobile, where a camera is
 * essentially guaranteed, instead of a desktop that may not have one. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as any).userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Windows Phone|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
