import { FxsActivatable } from './fxs-activatable.js';

const ChooserItemSelectedEventName = "chooser-item-selected";
class ChooserItemSelectedEvent extends CustomEvent {
  constructor() {
    super(ChooserItemSelectedEventName, { bubbles: true, cancelable: true });
  }
}
class FxsChooserItem extends FxsActivatable {
  highlight = document.createElement("div");
  container = document.createElement("div");
  selectedOverlay = document.createElement("div");
  disabledOverlay = document.createElement("div");
  iconLockToggleFuncs = /* @__PURE__ */ new Map();
  get selected() {
    return this.Root.getAttribute("selected") == "true";
  }
  set selected(value) {
    const guardedValue = (this.selectableWhenDisabled || !this.disabled) && value;
    this.Root.setAttribute("selected", guardedValue.toString());
  }
  get selectOnFocus() {
    return this.Root.getAttribute("select-on-focus") == "true";
  }
  set selectOnFocus(value) {
    this.Root.setAttribute("select-on-focus", value.toString());
  }
  get selectOnActivate() {
    return this.Root.getAttribute("select-on-activate") == "true";
  }
  set selectOnActivate(value) {
    this.Root.setAttribute("select-on-activate", value.toString());
  }
  get selectableWhenDisabled() {
    return this.Root.getAttribute("selectable-when-disabled") == "true";
  }
  set selectableWhenDisabled(value) {
    this.Root.setAttribute("selectable-when-disabled", value.toString());
  }
  get showFrameOnHover() {
    return (this.Root.getAttribute("show-frame-on-hover") ?? "true") == "true";
  }
  set showFrameOnHover(value) {
    this.Root.setAttribute("show-frame-on-hover", value.toString());
  }
  get showColorBG() {
    return (this.Root.getAttribute("show-color-bg") ?? "true") == "true";
  }
  set showColorBG(value) {
    this.Root.setAttribute("show-color-bg", value.toString());
  }
  get contentDirection() {
    return this.Root.getAttribute("content-direction") ?? "flex-row";
  }
  constructor(root) {
    super(root);
    this.renderChooserItem();
  }
  onAttach() {
    super.onAttach();
    const childNodes = Array.from(this.Root.children);
    for (const childNode of childNodes) {
      if (childNode != this.container && childNode != this.highlight && childNode != this.disabledOverlay && childNode != this.selectedOverlay) {
        this.container.appendChild(childNode);
      }
    }
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "disabled":
        this.disabledOverlay.classList.toggle("hidden", newValue != "true");
        super.onAttributeChanged(name, oldValue, newValue);
        break;
      case "selected":
        this.selectedOverlay.classList.toggle("selected", newValue == "true");
        break;
      case "show-frame-on-hover":
        this.selectedOverlay.classList.toggle("show-on-hover", newValue == "true");
        break;
      case "show-color-bg":
        this.Root.classList.toggle("hud_sidepanel_list-bg", newValue == "true");
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
  onActivatableBlur() {
    super.onActivatableBlur();
    if (this.selectOnFocus) {
      this.selected = false;
    }
  }
  onActivatableFocus() {
    super.onActivatableFocus();
    if (this.selectOnFocus) {
      this.triggerSelection();
    }
  }
  onActivatableEngineInput(inputEvent) {
    if (inputEvent.detail.name == "touch-touch") {
      super.onActivatableEngineInput(inputEvent);
      return;
    }
    if (inputEvent.detail.status == InputActionStatuses.START) {
      super.onActivatableEngineInput(inputEvent);
      return;
    }
    if (inputEvent.detail.status != InputActionStatuses.FINISH) {
      return;
    }
    if (this.disabled && !this.selectableWhenDisabled) {
      return;
    }
    if (!this.selectOnFocus || inputEvent.detail.name == "accept" || inputEvent.detail.name == "keyboard-enter") {
      super.onActivatableEngineInput(inputEvent);
    }
    if (inputEvent.detail.name == "mousebutton-left" || inputEvent.detail.name == "accept" || inputEvent.detail.name == "touch-tap" || inputEvent.detail.name == "keyboard-enter") {
      if (this.selectOnActivate) {
        this.triggerSelection();
      }
      if (!inputEvent.defaultPrevented) {
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
      }
    }
  }
  enableDirectDriveMode() {
    this.selectOnActivate = true;
    this.selectOnFocus = true;
    this.showFrameOnHover = false;
  }
  toggleIconLock(iconEle, isLocked) {
    this.iconLockToggleFuncs.get(iconEle)?.(isLocked);
  }
  createChooserIcon(iconStr, isLocked) {
    const iconEle = document.createElement("div");
    iconEle.classList.value = "relative flex self-center items-center justify-center pointer-events-none size-19";
    const image = document.createElement("div");
    image.classList.value = "fxs-chooser-item-icon-image relative flex flex-col items-center";
    image.style.setProperty("background-image", `url(${iconStr})`);
    iconEle.appendChild(image);
    const iconBg = document.createElement("div");
    iconBg.classList.value = "fxs-chooser-item-icon-bg absolute";
    iconEle.appendChild(iconBg);
    const lockImageBg = document.createElement("div");
    lockImageBg.classList.value = "fxs-chooser-item-lock-bg absolute inset-0";
    image.appendChild(lockImageBg);
    const lockImage = document.createElement("div");
    lockImage.classList.add("hidden");
    lockImage.classList.value = "fxs-chooser-item-lock-image absolute bg-cover";
    image.appendChild(lockImage);
    const toggleLockFunc = (isLocked2) => {
      image.classList.toggle("opacity-50", isLocked2);
      lockImage.classList.toggle("hidden", !isLocked2);
    };
    this.iconLockToggleFuncs.set(iconEle, toggleLockFunc);
    toggleLockFunc(isLocked);
    return iconEle;
  }
  renderChooserItem() {
    this.Root.setAttribute("tabindex", "-1");
    if (this.Root.getAttribute("hover-only-trigger") == null) {
      this.Root.setAttribute("hover-only-trigger", "true");
    }
    this.Root.classList.add(
      "fxs-chooser-item",
      "hud_sidepanel_list-bg",
      "flex",
      "justify-stretch",
      "items-stretch",
      "relative"
    );
    this.highlight.classList.add("fxs-chooser-item-highlight", "absolute", "inset-0");
    this.Root.appendChild(this.highlight);
    this.selectedOverlay.classList.add(
      "fxs-chooser-item-selected",
      "show-on-hover",
      "fxs-chooser-item-selected-frame",
      "absolute",
      "inset-0"
    );
    this.Root.appendChild(this.selectedOverlay);
    this.container.classList.add(
      "fxs-chooser-item-container",
      "hud_sidepanel_list-bg-no-fill",
      "relative",
      "flex",
      "flex-auto",
      this.contentDirection
    );
    this.Root.appendChild(this.container);
    this.disabledOverlay.classList.value = "fxs-chooser-item-disabled absolute inset-0 opacity-70 pointer-events-none hidden";
    this.Root.appendChild(this.disabledOverlay);
  }
  triggerSelection() {
    const valid = this.Root.dispatchEvent(new ChooserItemSelectedEvent());
    if (valid) {
      this.selected = true;
    }
  }
}
Controls.define("fxs-chooser-item", {
  createInstance: FxsChooserItem,
  description: "A chooser item base class",
  attributes: [
    { name: "disabled" },
    { name: "selected", description: "Is this chooser item selected? (Default: false)" },
    { name: "show-frame-on-hover", description: "Shows the selection frame on hover" },
    { name: "show-color-bg", description: "Shows the standard gray bg" }
  ],
  images: ["fs://game/hud_sidepanel_list-bg.png", "fs://game/hud_list-focus_frame.png"],
  tabIndex: -1
});

export { ChooserItemSelectedEvent, ChooserItemSelectedEventName, FxsChooserItem };
//# sourceMappingURL=fxs-chooser-item.js.map
