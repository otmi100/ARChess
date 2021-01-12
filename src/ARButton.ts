// credits: A lot from this file is copied from https://unpkg.com/three@0.124.0/examples/jsm/webxr/ARButton.js
import { WebGLRenderer, XRSession, XRSessionInit } from "three";

interface XRSessionInitWithDom extends XRSessionInit {
  domOverlay: {
    root: HTMLElement;
  };
}

export default class ARButton {
  static createButton(
    renderer: WebGLRenderer,
    sessionInit: XRSessionInitWithDom
  ): HTMLElement {
    const button = document.createElement("button");

    // Workaround, because Typescript doesnt know the latest features yet..
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let myNav: any;
    // eslint-disable-next-line prefer-const
    myNav = navigator;

    function showStartAR(/*device*/) {
      let currentSession: XRSession | null = null;

      function onSessionStarted(session: XRSession) {
        session.addEventListener("end", onSessionEnded);

        renderer.xr.setReferenceSpaceType("local");
        renderer.xr.setSession(session);

        button.textContent = "STOP AR";
        sessionInit.domOverlay.root.style.display = "";

        currentSession = session;
      }

      function onSessionEnded(/*event*/) {
        currentSession?.removeEventListener("end", onSessionEnded);

        button.textContent = "START AR";
        sessionInit.domOverlay.root.style.display = "none";

        currentSession = null;
      }

      //

      button.style.display = "";

      button.style.cursor = "pointer";
      button.style.left = "calc(50% - 50px)";
      button.style.width = "100px";

      button.textContent = "START AR";

      button.onmouseenter = function () {
        button.style.opacity = "1.0";
      };

      button.onmouseleave = function () {
        button.style.opacity = "0.5";
      };

      button.onclick = function () {
        if (currentSession === null) {
          myNav.xr
            .requestSession("immersive-ar", sessionInit)
            .then(onSessionStarted);
        } else {
          currentSession.end();
        }
      };
    }

    function disableButton() {
      button.style.display = "";

      button.style.cursor = "auto";
      button.style.left = "calc(50% - 75px)";
      button.style.width = "150px";

      button.onmouseenter = null;
      button.onmouseleave = null;

      button.onclick = null;
    }

    function showARNotSupported() {
      disableButton();

      button.textContent = "AR NOT SUPPORTED";
    }

    function stylizeElement(element: HTMLButtonElement | HTMLAnchorElement) {
      element.style.position = "absolute";
      element.style.bottom = "200px";
      element.style.padding = "12px 6px";
      element.style.border = "1px solid #fff";
      element.style.borderRadius = "4px";
      element.style.background = "rgba(0,0,0,0.1)";
      element.style.color = "#fff";
      element.style.font = "normal 13px sans-serif";
      element.style.textAlign = "center";
      element.style.opacity = "0.5";
      element.style.outline = "none";
      element.style.zIndex = "999";
    }

    if ("xr" in navigator) {
      button.id = "ARButton";
      button.style.display = "none";

      stylizeElement(button);

      myNav.xr
        .isSessionSupported("immersive-ar")
        .then(function (supported: boolean) {
          supported ? showStartAR() : showARNotSupported();
        })
        .catch(showARNotSupported);

      return button;
    } else {
      const message = document.createElement("a");

      if (window.isSecureContext === false) {
        message.href = document.location.href.replace(/^http:/, "https:");
        message.innerHTML = "WEBXR NEEDS HTTPS"; // TODO Improve message
      } else {
        message.href = "https://immersiveweb.dev/";
        message.innerHTML = "WEBXR NOT AVAILABLE";
      }

      message.style.left = "calc(50% - 90px)";
      message.style.width = "180px";
      message.style.textDecoration = "none";

      stylizeElement(message);

      return message;
    }
  }
}

export { ARButton };
