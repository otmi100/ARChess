import { WebGLRenderer, XRSession, XRSessionInit } from "three";

interface XRSessionInitWithDom extends XRSessionInit {
  domOverlay: {
    root: HTMLElement;
  };
}

export default class ARButton {
  private currentSession: XRSession | null = null;
  private button: HTMLButtonElement;

  // Workaround, because Typescript doesnt know the latest features yet..
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private myNav: any;

  constructor(
    button: HTMLButtonElement,
    startGameFunction: () => void,
    renderer: WebGLRenderer,
    sessionInit: XRSessionInitWithDom
  ) {
    this.button = button;
    this.myNav = navigator;
    /*
    this.startGameFunction = startGameFunction;
    this.button = button;
    this.renderer = renderer;
    this.sessionInit = sessionInit;*/

    button.onclick = () => {
      if (this.currentSession === null) {
        console.log("Trying to start XR Session");
        console.log(sessionInit);

        this.myNav.xr
          .requestSession("immersive-ar", sessionInit)
          .then((session: XRSession) => {
            if ("xr" in navigator) {
              this.myNav.xr
                .isSessionSupported("immersive-ar")
                .then((supported: boolean) => {
                  if (supported) {
                    session.addEventListener("end", this.onSessionEnded);

                    renderer.xr.setReferenceSpaceType("local");
                    renderer.xr.setSession(session);

                    startGameFunction();

                    this.currentSession = session;
                  } else {
                    this.showARNotSupported();
                  }
                })
                .catch(this.showARNotSupported);
            }
          })
          .catch(this.showARNotSupported);
      } else {
        if (window.isSecureContext === false) {
          button.textContent = "WEBXR NEEDS HTTPS";
        } else {
          button.textContent = "WEBXR NOT AVAILABLE";
        }
        button.style.textDecoration = "none";
      }
    };
  }

  onSessionEnded(): void {
    this.currentSession?.removeEventListener("end", this.onSessionEnded);
    this.currentSession = null;
    // show button again?
  }

  disableButton(): void {
    this.button.style.display = "";
    this.button.style.cursor = "auto";

    this.button.onmouseenter = null;
    this.button.onmouseleave = null;

    this.button.onclick = null;
  }

  showARNotSupported(): void {
    this.disableButton();
    this.button.textContent = "AR NOT SUPPORTED";
  }
}

export { ARButton };
