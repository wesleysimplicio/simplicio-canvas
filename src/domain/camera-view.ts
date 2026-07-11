export type CameraView = 'perspective' | 'top'

export function nextCameraView(current: CameraView): CameraView {
  return current === 'perspective' ? 'top' : 'perspective'
}
