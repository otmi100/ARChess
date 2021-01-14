import {
  WebGLRenderer,
  XRFrame,
  XRHitTestSource,
  XRPose,
  XRReferenceSpace,
} from "three";

export default class HitTest {
  private hitTestSource: XRHitTestSource | null = null;
  private hitTestSourceRequested = false;
  private renderer: WebGLRenderer;
  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  getRefPose(frame: XRFrame): XRPose | null | undefined {
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    const session = this.renderer.xr.getSession();

    if (this.hitTestSourceRequested === false) {
      session
        .requestReferenceSpace("viewer")
        .then((referenceSpace: XRReferenceSpace) => {
          session
            .requestHitTestSource({ space: referenceSpace })
            .then((source) => {
              this.hitTestSource = source;
            });
        });

      session.addEventListener("end", () => {
        this.hitTestSourceRequested = false;
        this.hitTestSource = null;
      });

      this.hitTestSourceRequested = true;
    }

    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        if (hit && referenceSpace) {
          return hit.getPose(referenceSpace);
        }
      }
    }
  }
}
