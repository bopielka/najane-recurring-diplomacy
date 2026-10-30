import { Audio } from '../../../core/ui/audio-base/audio-support.js';
import { ContextManager } from '../../../core/ui/context-manager/context-manager.js';
import { Navigation } from '../../../core/ui/input/navigation-support.js';
import { InterfaceModeChangedEventName, InterfaceMode } from '../../../core/ui/interface-modes/interface-modes.js';
import NavTray from '../../../core/ui/navigation-tray/model-navigation-tray.js';
import { IconState } from '../../../core/ui/stateful-icon/stateful-icon.js';
import { getModifierTextByContext } from '../../../core/ui/utilities/utilities-core-textprovider.js';
import { MustGetElement } from '../../../core/ui/utilities/utilities-dom.js';
import { Icon } from '../../../core/ui/utilities/utilities-image.js';
import { FocusManager } from '../../../core/ui-next/services/focus-manager.js';
import { isMobile } from '../../../core/ui-next/services/view-experience.js';
import { DiploRibbonData, RibbonStatsToggleStatus } from '../diplo-ribbon/model-diplo-ribbon.js';
import DiplomacyManager, { DiplomacyInputPanel } from '../diplomacy/diplomacy-manager.js';
import LeaderModelManager from '../diplomacy/leader-model-manager.js';
import { RelationshipBreakdown } from '../relationship-breakdown/relationship-breakdown.js';
import { ConstructibleHasTagType } from '../utilities/utilities-tags.js';

var PlayerDiplomacyType = /* @__PURE__ */ ((PlayerDiplomacyType2) => {
  PlayerDiplomacyType2[PlayerDiplomacyType2["LocalPlayerDiplomacy"] = 0] = "LocalPlayerDiplomacy";
  PlayerDiplomacyType2[PlayerDiplomacyType2["OtherPlayerDiplomacy"] = 1] = "OtherPlayerDiplomacy";
  return PlayerDiplomacyType2;
})(PlayerDiplomacyType || {});
class DiplomacyActionPanel extends DiplomacyInputPanel {
  interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
  selectedPlayerChangedListener = this.onSelectedPlayerChanged.bind(this);
  supportChangedListener = this.onSupportChanged.bind(this);
  viewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
  actionCanceledListener = this.onActionCanceled.bind(this);
  diplomacyEventEndedListener = this.onDiplomacyEventEnded.bind(this);
  diplomacyQueueChangedListener = this.onDiplomacyQueueChanged.bind(this);
  gameCoreEventPlaybackCompleteListener = this.onGameCoreEventPlaybackComplete.bind(this);
  populateInitialDataTimerListener = this.onPopulateInitialDataTimerFinished.bind(this);
  onHandleWarSupportClosedListener = this.onHandleWarSupportClosed.bind(this);
  majorActionsSlot;
  leaderNameElement;
  mementosHeaderElement;
  befriendIndependentDetails;
  civSymbol;
  diploTint;
  tabBar;
  tabItems = [];
  panels = [];
  slotGroup;
  initialLoadComplete = false;
  firstFocusSection = null;
  ongoingActionPageNumber = 0;
  needsRefresh = false;
  infoTabIndex = 3;
  actionTabIndex = 0;
  relationshipTabIndex = 1;
  governmentTabIndex = 2;
  previousPlayer = -1;
  relationshipToolTip = "";
  relationshipIcon = [];
  previousPlayerIsMajor = true;
  initDataPopulationTimerHandle = 0;
  render() {
    this.Root.classList.add("flex-1");
    this.Root.innerHTML = `
		<fxs-hslot id="panel-diplomacy-actions__horizontal-container" data-navrule-left="wrap" class="-top-1 -bottom-8 absolute actions-horizontal-container">
			<fxs-vslot>
				<fxs-subsystem-frame box-style="b3" class="flex-auto">
					<fxs-header id="panel-diplomacy-actions__leader-name-header" filigree-style="none" data-slot="header" class="panel-diplomacy__leader-name-header leading-none flex uppercase self-center font-bold text-center min-h-18 mt-6 justify-center font-title text-2xl w-full ${isMobile() ? "items-center px-13 pb-1" : "items-end px-2 pb-3"}" title="LOC_DIPLOMACY_SELECT_TARGET"></fxs-header>
					<fxs-header id="panel-diplomacy-actions__civ-name-header" font-fit-mode="shrink" wrap="nowrap" filigree-style="none" data-slot="header" class="panel-diplomacy__civ-name-header flex min-h-11 items-top self-center font-title text-sm text-secondary max-w-full ${isMobile() ? "px-3" : ""}" title="LOC_DIPLOMACY_SELECT_TARGET"></fxs-header>
					<div id="panel-diplomacy-actions__civ-symbol" data-slot="header" class="panel-diplomacy-actions__civ-icon absolute bg-center bg-contain bg-no-repeat self-center ${isMobile() ? "size-18" : "size-24"}"></div>
					<fxs-tab-bar alt-controls="false" rect-render="true" data-slot="header" class="mx-5 mt-16 mb-3 pb-1 bg-primary-4 border-primary-2 border-t-2" data-audio-group-ref="audio-diplo-project-reaction" data-audio-tab-selected="leader-tab-activate" tab-for="fxs-subsystem-frame"></fxs-tab-bar>
					<fxs-hslot data-slot="footer" id="panel-diplomacy-actions__major-action-buttons" class="relative justify-around self-center pb-3 w-145"></fxs-hslot>
					<fxs-slot-group>
						<fxs-vslot id="diplomacy-tab-actions" class="flex-auto">
								<fxs-vslot id="available-projects-slot" disable-focus-allowed="true"></fxs-vslot>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-relationship" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__relationship-event-container"></fxs-vslot>
							<div class="flex flex-col mt-20 mb-4">
								<div id="panel-diplomacy-actions__other-relationships-header-name" class="font-title text-base text-center uppercase pointer-events-auto"></div>
								<fxs-header id="panel-diplomacy-actions__other-relationships-header" class="text-secondary uppercase font-title text-base" title="LOC_DIPLOMACY_ACTIONS_RELATIONSHIPS_HEADER" filigree-style="h4"></fxs-header>
							</div>
							<fxs-inner-frame id="panel-diplomacy-actions__other-relationships-frame" class="w-128 self-center">
								<div id="panel-diplomacy-actions__other-relationships-container"class="flex flex-col w-full"></div>
							</fxs-inner-frame>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-government" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__government-container"></fxs-vslot>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-info" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__info-container"></fxs-vslot>
						</fxs-vslot>
					</fxs-slot-group><fxs-hslot data-slot="footer" id="panel-diplomacy-actions__major-action-buttons" class="relative justify-around self-stretch pb-3"></fxs-hslot>
				</fxs-subsystem-frame>
			</fxs-vslot>
			<fxs-vslot class="panel-diplomacy-actions__ongoing-actions-list hidden">
				<fxs-scrollable class="w-40 h-0 -left-8 panel-diplomacy-actions__ongoing-actions-scrollable" handle-gamepad-pan="true" attached-scrollbar="true">
				<fxs-vslot id="panel-diplomacy-actions__ongoing-actions-container" class="absolute h-auto w-auto">
				</fxs-vslot>
				</fxs-scrollable>
			</fxs-vslot>
		</fxs-hslot>
		`;
    const subsystemPanel = MustGetElement("fxs-subsystem-frame", this.Root);
    subsystemPanel.addEventListener("subsystem-frame-close", () => {
      Audio.playSound("data-audio-hiding", "leader-panel");
      this.close();
    });
    subsystemPanel.setAttribute("data-audio-close-group-ref", "leader-panel");
    this.leaderNameElement = MustGetElement("#panel-diplomacy-actions__leader-name-header", this.Root);
    this.mementosHeaderElement = MustGetElement("#panel-diplomacy-actions__civ-name-header", this.Root);
    this.civSymbol = MustGetElement("#panel-diplomacy-actions__civ-symbol", this.Root);
    this.majorActionsSlot = MustGetElement("#panel-diplomacy-actions__major-action-buttons", this.Root);
    this.tabBar = MustGetElement("fxs-tab-bar", this.Root);
    this.slotGroup = MustGetElement("fxs-slot-group", this.Root);
    const actionsPanel = MustGetElement("#diplomacy-tab-actions", this.Root);
    this.panels.push(actionsPanel);
    this.diploTint = MustGetElement(".subsystem-frame__diplo-tint", this.Root);
    this.updateSelectedPlayerElements(DiplomacyManager.selectedPlayerID);
  }
  updateSelectedPlayerElements(playerID) {
    const playerObject = Players.get(playerID);
    if (!playerObject) {
      console.error(
        "panel-diplomacy-actions: (updateSelectedPlayerElements) Unable to get player object for selected player!"
      );
      return;
    }
    if (playerObject.isIndependent) {
      this.majorActionsSlot?.classList.add("hidden");
    }
    if (playerObject.isMajor) {
      this.leaderNameElement?.setAttribute("title", Locale.compose(playerObject.leaderName));
      this.mementosHeaderElement?.setAttribute(
        "title",
        Locale.compose("LOC_DIPLOMACY_CIV_NAME", playerObject.civilizationAdjective)
      );
    } else {
      this.leaderNameElement?.setAttribute("title", Locale.compose(playerObject.civilizationAdjective));
      if (playerObject.civilizationAdjective != playerObject.name) {
        this.mementosHeaderElement?.setAttribute(
          "title",
          Locale.compose("LOC_DIPLOMACY_INDEPENDENT_CIV_NAME", playerObject.name)
        );
      } else {
        this.mementosHeaderElement?.setAttribute("title", Locale.compose(""));
      }
    }
    this.civSymbol.style.backgroundImage = `url("${Icon.getCivIconForDiplomacyHeader(playerObject.civilizationType)}")`;
    this.previousPlayer = DiplomacyManager.selectedPlayerID;
    this.Root.classList.toggle("independent", !playerObject.isMajor);
    const isLocalPlayer = DiplomacyManager.selectedPlayerID == GameContext.localPlayerID;
    if (isLocalPlayer) {
      this.refreshTabItems(playerObject, 0 /* LocalPlayerDiplomacy */);
    } else {
      this.refreshTabItems(playerObject, 1 /* OtherPlayerDiplomacy */);
    }
    this.tabBar?.addEventListener("tab-selected", this.onOptionsTabSelected.bind(this));
    if (playerObject.id == GameContext.localPlayerID) {
      this.tabBar?.setAttribute("selected-tab-index", `${this.infoTabIndex}`);
    } else {
      this.slotGroup?.setAttribute("selected-slot", "diplomacy-tab-actions");
    }
    waitForLayout(() => {
      this.diploTint?.style.setProperty(
        "fxs-background-image-tint",
        UI.Player.getPrimaryColorValueAsString(playerObject.id)
      );
    });
  }
  populateInitialData() {
    this.refreshFullData();
    if (DiplomacyManager.selectedActionID != -1) {
      const actionData = Game.Diplomacy.getDiplomaticEventData(
        DiplomacyManager.selectedActionID
      );
      if (!actionData) {
        console.log(
          "panel-diplomacy-actions: Unable to get action data for action with ID: " + DiplomacyManager.selectedActionID
        );
        return;
      }
      DiplomacyManager.shouldQuickClose = true;
      if (!(actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN && DiplomacyManager.selectedPlayerID == actionData.targetPlayer)) {
        this.showBefriendIndependentDetails();
      } else {
        const infIndepData = Game.Diplomacy.getInfluenceIndependentData(
          actionData.uniqueID
        );
        Camera.lookAtPlot(infIndepData.location);
      }
    }
    this.initialLoadComplete = true;
  }
  /**
   * Refresh all data (warning: VERY expensive!)
   */
  refreshFullData() {
    this.refreshPartialData();
    this.populateGovernmentInfo();
    this.populatePlayerCivInfo();
    this.showLeaderModel();
    this.populateAvailableActions();
    waitForLayout(() => this.realizeInitialFocus());
  }
  /**
   * Refresh dynamic data (expensive!)
   */
  refreshPartialData() {
    this.populateOngoingProjects();
    this.populateActionsPanel();
    this.populateRelationshipInfo();
  }
  onAttach() {
    super.onAttach();
    this.render();
    this.Root.addEventListener("view-receive-focus", this.viewReceiveFocusListener);
    window.addEventListener(InterfaceModeChangedEventName, this.interfaceModeChangedListener);
    window.addEventListener("diplomacy-selected-player-changed", this.selectedPlayerChangedListener);
    engine.on("DiplomacyEventSupportChanged", this.supportChangedListener);
    engine.on("DiplomacyEventCanceled", this.actionCanceledListener);
    engine.on("DiplomacyEventEnded", this.diplomacyEventEndedListener);
    engine.on("DiplomacyQueueChanged", this.diplomacyQueueChangedListener);
    engine.on("GameCoreEventPlaybackComplete", this.gameCoreEventPlaybackCompleteListener);
    this.startInitDataPopulationTimer();
  }
  startInitDataPopulationTimer() {
    if (this.checkShouldShowPanel()) {
      this.initDataPopulationTimerHandle = setTimeout(this.populateInitialDataTimerListener, 83);
    } else {
      this.initialLoadComplete = true;
    }
  }
  onDetach() {
    super.onDetach();
    this.Root.removeEventListener("view-receive-focus", this.viewReceiveFocusListener);
    window.removeEventListener(InterfaceModeChangedEventName, this.interfaceModeChangedListener);
    window.removeEventListener("diplomacy-selected-player-changed", this.selectedPlayerChangedListener);
    engine.off("DiplomacyEventSupportChanged", this.supportChangedListener);
    engine.off("DiplomacyEventCanceled", this.actionCanceledListener);
    engine.off("DiplomacyEventEnded", this.diplomacyEventEndedListener);
    engine.off("DiplomacyQueueChanged", this.diplomacyQueueChangedListener);
    engine.off("GameCoreEventPlaybackComplete", this.gameCoreEventPlaybackCompleteListener);
    if (this.initDataPopulationTimerHandle != 0) {
      clearTimeout(this.initDataPopulationTimerHandle);
      this.initDataPopulationTimerHandle = 0;
    }
  }
  onPopulateInitialDataTimerFinished() {
    this.populateInitialData();
    if (this.initDataPopulationTimerHandle != 0) {
      clearTimeout(this.initDataPopulationTimerHandle);
      this.initDataPopulationTimerHandle = 0;
    }
  }
  handleInput(inputEvent) {
    const currentTarget = ContextManager.getCurrentTarget();
    if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && !DiplomacyManager.isFirstMeetDiplomacyOpen || currentTarget != void 0 && currentTarget.nodeName != "SCREEN-BEFRIEND-INDEPENDENT-DETAILS") {
      return false;
    }
    if (!this.checkShouldShowPanel() || DiplomacyManager.isClosingActionsPanel) {
      return true;
    }
    const inputEventName = inputEvent.detail.name;
    switch (inputEventName) {
      case "cancel":
      case "keyboard-escape":
      case "mousebutton-right":
        this.close();
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
        return false;
      case "shell-action-2":
        this.trySupportBefriendIndependent();
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
        return false;
      case "shell-action-1":
        if (this.befriendIndependentDetails) {
          this.tryBefriendIndependentShowTooltips();
          inputEvent.stopPropagation();
          inputEvent.preventDefault();
        }
    }
    return true;
  }
  trySupportBefriendIndependent() {
    const ongoingActions = Game.Diplomacy.getPlayerEvents(
      DiplomacyManager.selectedPlayerID
    ).filter((action) => {
      return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
    });
    if (ongoingActions.length == 0) {
      return;
    }
    const supportArgs = {
      ID: ongoingActions[0].uniqueID,
      Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
      Amount: 1,
      SubType: true
    };
    const supportResult = Game.PlayerOperations.canStart(
      GameContext.localPlayerID,
      PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION,
      supportArgs,
      false
    );
    if (!supportResult.Success) {
      Audio.playSound("data-audio-error-press", "befriend-independent-details");
      return;
    }
    Game.PlayerOperations.sendRequest(
      GameContext.localPlayerID,
      PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION,
      supportArgs
    );
    Audio.playSound("data-audio-activate", "befriend-independent-details");
  }
  tryBefriendIndependentShowTooltips() {
    if (!this.befriendIndependentDetails) {
      console.error(
        "panel-diplomacy-actions: tryBefriendIndependentShowTooltips() - Failed to find screen-befriend-independent-details!"
      );
      return;
    }
    const progressBarElement = this.befriendIndependentDetails.querySelector(".step-icon-container");
    if (!progressBarElement) {
      console.error(
        "panel-diplomacy-actions: tryBefriendIndependentShowTooltips() - Failed to find step-icon-container!"
      );
      return;
    }
    const stepIconElements = progressBarElement.querySelectorAll(".step-icon");
    if (stepIconElements.length == 0) {
      console.error(
        "panel-diplomacy-actions: tryBefriendIndependentShowTooltips() - Failed to find any step-icon elements within step-icon-container!"
      );
      return;
    }
    const currentFocusedElement = FocusManager.get().currentFocus();
    if (!progressBarElement.contains(currentFocusedElement)) {
      FocusManager.get().setFocus(stepIconElements[0]);
    } else if (currentFocusedElement == stepIconElements[stepIconElements.length - 1]) {
      const projectToggle = this.Root.querySelector("fxs-minus-plus");
      if (projectToggle) {
        FocusManager.get().setFocus(projectToggle);
      } else {
        console.error(
          "panel-diplomacy-actions: tryBefriendIndependentShowTooltips() - Failed to find fxs-minus-plus to give it focus from step-icon-container!"
        );
      }
    } else {
      for (let i = 0; i < stepIconElements.length; i++) {
        if (currentFocusedElement == stepIconElements[i]) {
          FocusManager.get().setFocus(stepIconElements[i + 1]);
        }
      }
    }
  }
  handleNavigation(navigateInput) {
    const currentTarget = ContextManager.getCurrentTarget();
    if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && !DiplomacyManager.isFirstMeetDiplomacyOpen || currentTarget != void 0 && currentTarget.nodeName != "SCREEN-BEFRIEND-INDEPENDENT-DETAILS") {
      return false;
    }
    if (!this.checkShouldShowPanel()) {
      return true;
    }
    const direction = navigateInput.getDirection();
    switch (direction) {
      case InputNavigationAction.SHELL_PREVIOUS:
      case InputNavigationAction.SHELL_NEXT:
        if (DiplomacyManager.isFirstMeetDiplomacyOpen) {
          return false;
        }
        const diploRibbon = document.querySelector(".diplo-ribbon");
        diploRibbon?.dispatchEvent(navigateInput);
        navigateInput.stopPropagation();
        navigateInput.preventDefault();
        return false;
      case InputNavigationAction.PREVIOUS:
      case InputNavigationAction.NEXT:
        this.tabBar?.dispatchEvent(navigateInput);
        return false;
      case InputNavigationAction.LEFT:
      case InputNavigationAction.RIGHT:
        navigateInput.stopPropagation();
        navigateInput.preventDefault();
        return false;
    }
    return true;
  }
  onViewReceiveFocus() {
    if (!this.checkShouldShowPanel()) {
      return;
    }
    if (DiplomacyManager.selectedActionID != -1 || DiplomacyManager.currentDiplomacyDealData != null) {
      return;
    }
    this.populateAvailableActions();
    this.realizeInitialFocus();
    this.realizeNavTray();
  }
  realizeNavTray() {
    NavTray.clear();
    NavTray.addOrUpdateGenericBack();
    const player = Players.get(DiplomacyManager.selectedPlayerID);
    if (player && player.isIndependent) {
      const ongoingActions = Game.Diplomacy.getPlayerEvents(
        DiplomacyManager.selectedPlayerID
      ).filter((action) => {
        return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
      });
      if (ongoingActions.length != 0) {
        NavTray.addOrUpdateShellAction1(Locale.compose("LOC_DIPLOMACY_SUPPORT_INDEPENDENT"));
      }
    }
  }
  populateOngoingProjects() {
    const ongoingProjectContainer = MustGetElement(
      "#panel-diplomacy-actions__ongoing-actions-container",
      this.Root
    );
    removeAllChildren(ongoingProjectContainer);
    let ongoingActions = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID);
    ongoingActions = ongoingActions.filter((action) => {
      return action.initialPlayer == GameContext.localPlayerID || action.targetPlayer == GameContext.localPlayerID && action.revealed;
    });
    ongoingActions.sort(
      (a, b) => Game.Diplomacy.getCompletionData(a.uniqueID) && Game.Diplomacy.getCompletionData(b.uniqueID) && Game.Diplomacy.getCompletionData(a.uniqueID).turnsToCompletion > Game.Diplomacy.getCompletionData(b.uniqueID).turnsToCompletion ? 1 : -1
    );
    const myActions = ongoingActions.filter((action) => {
      return action.initialPlayer == GameContext.localPlayerID && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE;
    });
    const theirActions = ongoingActions.filter((action) => {
      return action.initialPlayer != GameContext.localPlayerID && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE;
    });
    if (myActions.length > 0) {
      const myActionsHeader = document.createElement("div");
      myActionsHeader.classList.value = "queued-title flex justify-center font-title uppercase text-xs mt-5 py-2";
      myActionsHeader.innerHTML = Locale.compose("LOC_DIPLOMACY_MY_ACTIONS_HEADER");
      ongoingProjectContainer.appendChild(myActionsHeader);
    }
    myActions.forEach((myAction) => {
      const ongoingActionItem = this.createOngoingActionItem(myAction);
      if (ongoingActionItem) {
        ongoingProjectContainer.appendChild(ongoingActionItem);
      }
    });
    if (theirActions.length > 0) {
      const theirActionsHeader = document.createElement("div");
      theirActionsHeader.classList.value = "queued-title flex justify-center font-title uppercase text-xs mt-5 py-2";
      theirActionsHeader.innerHTML = Locale.compose("LOC_DIPLOMACY_THEIR_ACTIONS_HEADER");
      ongoingProjectContainer.appendChild(theirActionsHeader);
    }
    theirActions.forEach((theirAction) => {
      const ongoingActionItem = this.createOngoingActionItem(theirAction);
      if (ongoingActionItem) {
        ongoingProjectContainer.appendChild(ongoingActionItem);
      }
    });
    this.setOngoingActionsScrollablePosition();
    const actionsList = MustGetElement(".panel-diplomacy-actions__ongoing-actions-list", this.Root);
    actionsList.classList.toggle("hidden", ongoingProjectContainer.children.length == 0);
  }
  createOngoingActionItem(action) {
    const actionData = Game.Diplomacy.getProjectDataForUI(
      action.initialPlayer,
      -1,
      DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
      DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP,
      -1,
      DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET
    ).find((project) => project.actionID == action.uniqueID);
    if (action.hidden && !action.revealed && action.initialPlayer != GameContext.localPlayerID && actionData?.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE) {
      return null;
    }
    const ongoingActionItem = document.createElement("fxs-chooser-item");
    ongoingActionItem.classList.add("w-36", "flex", "flex-row", "pointer-events-auto");
    ongoingActionItem.setAttribute("tabindex", "-1");
    const actionDef = GameInfo.DiplomacyActions.lookup(action.actionType);
    if (!actionDef) {
      console.error(
        "panel-diplomacy-actions: Unable to get definition for diplomacy action with type: " + action.actionTypeName
      );
      return null;
    }
    let progressPercent = 0;
    let progressString = "";
    const progressTurnsContainer = document.createElement("div");
    progressTurnsContainer.classList.add(
      "relative",
      "flex",
      "flex-col",
      "grow",
      "justify-center",
      "items-center",
      "min-w-16",
      "m-1"
    );
    const progressBar = document.createElement("div");
    progressBar.classList.add(
      "build-queue__item-progress-bar",
      "relative",
      "p-0\\.5",
      "flex",
      "flex-col-reverse",
      "h-10",
      "w-4"
    );
    const progressBarFill = document.createElement("div");
    progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");
    progressTurnsContainer.appendChild(progressBar);
    ongoingActionItem.appendChild(progressTurnsContainer);
    const actionDetailsContainer = document.createElement("div");
    actionDetailsContainer.classList.add("grow", "relative");
    ongoingActionItem.appendChild(actionDetailsContainer);
    const iconContainer = document.createElement("div");
    iconContainer.classList.value = "size-19 flex self-center items-center justify-center pointer-events-none relative";
    ongoingActionItem.appendChild(iconContainer);
    const iconImage = document.createElement("div");
    iconImage.classList.value = "size-16 -top-px bg-center relative flex flex-col items-center bg-cover justify-center";
    iconContainer.appendChild(iconImage);
    const iconFront = document.createElement("div");
    iconFront.classList.value = "absolute img-civics-icon-frame size-19 flex self-center items-center justify-center pointer-events-none relative";
    iconContainer.appendChild(iconFront);
    const completionData = Game.Diplomacy.getCompletionData(action.uniqueID);
    progressBar.appendChild(progressBarFill);
    if (actionData?.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
      ongoingActionItem.addEventListener("action-activate", () => {
        this.showBefriendIndependentDetails();
      });
      const infIndepData = Game.Diplomacy.getInfluenceIndependentData(action.uniqueID);
      const villageID = infIndepData.independentPlayerID;
      let villageName = "";
      const locVillageName = Game.IndependentPowers.independentName(villageID)?.toString();
      if (locVillageName != void 0) {
        villageName = Locale.compose(locVillageName);
      }
      ongoingActionItem.setAttribute("data-tooltip-content", Locale.compose(action.name, villageName));
      const currentProgress = (completionData.requiredProgress - completionData.turnsToCompletion * completionData.progressPerTurn) / completionData.requiredProgress;
      progressPercent = currentProgress * 100;
      progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
    } else if (actionData?.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && actionData.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
      const stageData = Game.Diplomacy.getActiveStage(action.uniqueID);
      const stages = Game.Diplomacy.getStages(action.uniqueID);
      if (stageData.stageType == stages[0].stageType) {
        const projectDefinition = GameInfo.DiplomacyActions.lookup(
          actionData.actionType
        );
        if (!projectDefinition) {
          console.error(
            "panel-diplomacy-actions: Unable to get project definition for project of type " + actionData.actionTypeName
          );
          return null;
        }
        const stage1MaxTurns = action.completionScore - action.lastStageDuration;
        const stage1MinTurns = stage1MaxTurns - Game.Diplomacy.modifyByGameSpeed(projectDefinition.RandomInitialProgress);
        ongoingActionItem.setAttribute(
          "data-tooltip-content",
          Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.compose(
            "LOC_DIPLOMACY_ACTION_ESPIONAGE_ONGOING",
            stage1MinTurns,
            stage1MaxTurns,
            Game.turn - action.gameTurnStart
          ) + "[N]" + Locale.compose("LOC_DIPLOMACY_SUCCESS_CHANCE", actionDef.SuccessChance) + "[N]" + Locale.compose("LOC_DIPLOMACY_REVEAL_CHANCE", actionDef.RevealChance)
        );
        progressString = (Game.turn - action.gameTurnStart).toString() + "/" + stage1MaxTurns.toString();
        progressPercent = (Game.turn - action.gameTurnStart) / stage1MaxTurns * 100;
      } else {
        if (!action.hidden && DiplomacyManager.selectedPlayerID == GameContext.localPlayerID && action.targetPlayer == GameContext.localPlayerID) {
          ongoingActionItem.setAttribute(
            "data-tooltip-content",
            Locale.compose(action.name) + "[N]" + Locale.compose(action.description + "_TARGET", "LOC_DIPLOMACY_UNKNOWN_PLAYER") + "[N]" + Locale.compose(
              "LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS",
              Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion
            )
          );
        } else if (action.revealed && action.targetPlayer == GameContext.localPlayerID) {
          ongoingActionItem.setAttribute(
            "data-tooltip-content",
            Locale.compose(action.name) + "[N]" + Locale.compose(action.description + "_TARGET", "LOC_DIPLOMACY_UNKNOWN_PLAYER") + "[N]" + Locale.compose(
              "LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS",
              Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion
            )
          );
        } else {
          ongoingActionItem.setAttribute(
            "data-tooltip-content",
            Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.compose(
              "LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS",
              Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion
            )
          );
        }
        const currentProgress = (completionData.requiredProgress - completionData.turnsToCompletion * completionData.progressPerTurn) / completionData.requiredProgress;
        progressPercent = currentProgress * 100;
        progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
      }
    } else {
      const currentProgress = (completionData.requiredProgress - completionData.turnsToCompletion * completionData.progressPerTurn) / completionData.requiredProgress;
      ongoingActionItem.setAttribute(
        "data-tooltip-content",
        Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.compose(
          "LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS",
          Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion
        )
      );
      progressPercent = currentProgress * 100;
      progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
    }
    if (progressPercent > 99) {
      progressPercent = 100;
      progressBarFill.classList.add("build-queue__progress-bar-fill-negative");
    }
    progressBarFill.style.height = progressPercent.toString() + "%";
    iconImage.style.backgroundImage = `url("${actionDef.UIIconPath}")`;
    const turns = document.createElement("div");
    turns.classList.add("build-queue__turn", "relative", "bottom-0", "right-0", "flex", "items-center");
    const turnsClockIcon = document.createElement("div");
    turnsClockIcon.classList.add("build-queue__turn-icon", "size-8", "relative");
    turns.appendChild(turnsClockIcon);
    const turnLabel = document.createElement("div");
    turnLabel.classList.add("build-queue__turn-value", "relative", "text-base", "font-fit-shrink", "w-9");
    turnLabel.innerHTML = progressString;
    turns.appendChild(turnLabel);
    progressTurnsContainer.appendChild(turns);
    return ongoingActionItem;
  }
  /**
   * This says "action", (at base game) the only actions are war support.
   * @param actionID
   */
  clickOngoingAction(actionID) {
    DiplomacyManager.selectedActionID = actionID;
    ContextManager.push("screen-diplomacy-action-details", { createMouseGuard: true, singleton: true });
    window.addEventListener("diplomacy-action-details-closed", this.onHandleWarSupportClosedListener);
  }
  /**
   * Signaled when the war support popup dialog has been dismissed.
   */
  onHandleWarSupportClosed() {
    window.removeEventListener("diplomacy-action-details-closed", this.onHandleWarSupportClosedListener);
    this.populateActionsPanel();
  }
  refreshTabItems(playerObject, isLocal) {
    if (!this.tabBar) {
      console.error(`panel-diplomacy-actions: refreshTabItems - no tab bar to refresh!`);
      return;
    }
    if (!playerObject.isMajor) {
      this.tabBar.setAttribute(
        "tab-items",
        JSON.stringify([
          {
            id: "diplomacy-tab-actions",
            icon: "blp:projects_normal-tab-button",
            iconClass: "size-13",
            highlight: true
          }
        ])
      );
    } else {
      const playerDiplomacy = playerObject.Diplomacy;
      if (!playerDiplomacy) {
        console.error(
          `panel-diplomacy-actions: refreshTabItems - playerObject with playerID ${playerObject.id} has no diplomacy library!`
        );
        return;
      }
      this.tabItems = [];
      this.tabItems.push({
        id: "diplomacy-tab-actions",
        icon: {
          [IconState.Default]: "blp:projects_normal-tab-button",
          [IconState.Hover]: "blp:projects_active-tab-button",
          [IconState.Focus]: "blp:projects_active-tab-button",
          [IconState.Active]: "blp:projects_active-tab-button",
          [IconState.Pressed]: "blp:projects_active-tab-button"
        },
        className: "",
        iconClass: "size-13",
        highlight: true,
        tooltip: "LOC_UI_DIPLOMACY_ALL_ACTIONS_TOOLTIP"
      });
      if (isLocal == 0 /* LocalPlayerDiplomacy */) {
        this.relationshipToolTip = "LOC_UI_DIPLOMACY_MINOR_POWERS_TOOLTIP";
        this.relationshipIcon = ["blp:citystate_normal-tab-button.png", "blp:citystate_active-tab-button.png"];
      } else {
        this.relationshipToolTip = "LOC_UI_DIPLOMACY_RELATIONSHIPS_TOOLTIP";
        this.relationshipIcon = ["blp:relationships_normal-tab-button", "blp:relationships_active-tab-button"];
      }
      this.tabItems.push({
        id: "diplomacy-tab-relationship",
        icon: {
          [IconState.Default]: this.relationshipIcon[0],
          [IconState.Hover]: this.relationshipIcon[1],
          [IconState.Focus]: this.relationshipIcon[1],
          [IconState.Active]: this.relationshipIcon[1],
          [IconState.Pressed]: this.relationshipIcon[1]
        },
        className: "",
        iconClass: "size-13",
        highlight: true,
        tooltip: this.relationshipToolTip
      });
      this.tabItems.push({
        id: "diplomacy-tab-government",
        icon: {
          [IconState.Default]: "blp:govtreligion_normal-tab-button",
          [IconState.Hover]: "blp:govtreligion_active-tab-button",
          [IconState.Focus]: "blp:govtreligion_active-tab-button",
          [IconState.Active]: "blp:govtreligion_active-tab-button",
          [IconState.Pressed]: "blp:govtreligion_active-tab-button"
        },
        className: "",
        iconClass: "size-13",
        highlight: true,
        tooltip: "LOC_UI_DIPLOMACY_GOVERNMENT_TOOLTIP"
      });
      this.tabItems.push({
        id: "diplomacy-tab-info",
        icon: {
          [IconState.Default]: "blp:lore_normal-tab-button",
          [IconState.Hover]: "blp:lore_active-tab-button",
          [IconState.Focus]: "blp:lore_active-tab-button",
          [IconState.Active]: "blp:lore_active-tab-button",
          [IconState.Pressed]: "blp:lore_active-tab-button"
        },
        className: "",
        iconClass: "size-13",
        highlight: true,
        tooltip: "LOC_UI_DIPLOMACY_ABILITIES_TOOLTIP"
      });
      this.tabBar.setAttribute("tab-items", JSON.stringify(this.tabItems));
      this.infoTabIndex = this.tabItems.findIndex((tab) => tab.id == "diplomacy-tab-info");
      this.actionTabIndex = this.tabItems.findIndex((tab) => tab.id == "diplomacy-tab-actions");
      const { playerId, section } = DiploRibbonData.sectionSelected;
      if (this.previousPlayer != GameContext.localPlayerID && this.previousPlayerIsMajor == false && DiplomacyManager.selectedPlayerID == GameContext.localPlayerID || section == "relationship") {
        const tabIndex = this.tabItems.findIndex((tab) => tab.id == "diplomacy-tab-relationship");
        if (tabIndex != -1) {
          this.tabBar.setAttribute("selected-tab-index", `${tabIndex}`);
        }
      }
      if (isNaN(playerId) || playerId == PlayerIds.NO_PLAYER) {
        return;
      }
      DiploRibbonData.sectionSelected = {
        playerId: PlayerIds.NO_PLAYER,
        section: "unset"
      };
    }
  }
  populatePlayerCivInfo() {
    if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
      return;
    }
    const infoContainer = MustGetElement("#panel-diplomacy-actions__info-container", this.Root);
    removeAllChildren(infoContainer);
    const playerObject = Players.get(DiplomacyManager.selectedPlayerID);
    if (!playerObject) {
      console.error(
        "panel-diplomacy-actions: Unable to get player object for selected player while trying to show civ and leader info!"
      );
      return;
    }
    const leaderDefinition = GameInfo.Leaders.lookup(playerObject.leaderType);
    if (!leaderDefinition) {
      console.error("panel-diplomacy-actions: Unable to get leader definition for selected player");
      return;
    }
    const leaderAbilitiesTitle = document.createElement("fxs-header");
    leaderAbilitiesTitle.classList.add("uppercase", "mb-4", "text-secondary", "font-title", "text-base");
    leaderAbilitiesTitle.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_LEADER_ABILITIES_TITLE");
    leaderAbilitiesTitle.setAttribute("filigree-style", "h4");
    leaderAbilitiesTitle.setAttribute("tabindex", "-1");
    infoContainer.appendChild(leaderAbilitiesTitle);
    const leaderBonusItems = Database.query(
      "config",
      "select * from LeaderItems order by SortIndex"
    )?.filter((item) => item.LeaderType == leaderDefinition.LeaderType);
    const leaderTrait = leaderBonusItems?.find(
      (item) => item.Kind == "KIND_TRAIT"
    );
    const leaderAbilityName = leaderTrait?.Name;
    const leaderAbilityDescription = leaderTrait?.Description;
    const leaderValidGreatPeople = [];
    if (DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
      const playerUnits = playerObject.Units;
      if (playerUnits) {
        GameInfo.GreatPersonClasses.forEach((greatPersonClass) => {
          if (playerUnits.canEverTrain(greatPersonClass.UnitType)) {
            leaderValidGreatPeople.push(greatPersonClass);
          }
        });
      }
    }
    const ageData = /* @__PURE__ */ new Map();
    Database.query("config", "SELECT * FROM Ages")?.forEach(
      ({ AgeType, PlayerCivilizationDomain, Name, SortIndex }) => {
        ageData.set(AgeType, { AgeType, Name, SortIndex });
        ageData.set(PlayerCivilizationDomain, AgeType);
      }
    );
    const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType ?? "";
    const currentAgeIndex = ageData.get(currentAge)?.SortIndex ?? 0;
    const leaderAbilityItem = document.createElement("div");
    leaderAbilityItem.classList.value = "flex flex-row items-center";
    infoContainer.appendChild(leaderAbilityItem);
    const leaderPortrait = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
    leaderPortrait.classList.add("mr-2");
    leaderAbilityItem.appendChild(leaderPortrait);
    const leaderAbilityText = document.createElement("div");
    leaderAbilityText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
    leaderAbilityItem.appendChild(leaderAbilityText);
    const leaderAbilityNameElement = document.createElement("div");
    leaderAbilityNameElement.role = "paragraph";
    leaderAbilityNameElement.classList.value = "font-title text-base uppercase pointer-events-auto";
    leaderAbilityNameElement.innerHTML = Locale.stylize(leaderAbilityName);
    leaderAbilityText.appendChild(leaderAbilityNameElement);
    const divider = document.createElement("div");
    divider.classList.value = "w-72 filigree-divider-inner-frame my-2";
    leaderAbilityText.appendChild(divider);
    const leaderAbilityDescriptionElement = document.createElement("div");
    leaderAbilityNameElement.role = "paragraph";
    leaderAbilityDescriptionElement.classList.value = "font-body text-sm w-full pointer-events-auto";
    leaderAbilityDescriptionElement.innerHTML = Locale.stylize(leaderAbilityDescription);
    leaderAbilityText.appendChild(leaderAbilityDescriptionElement);
    const mementosData = Online.Metaprogression.getEquippedMementos(DiplomacyManager.selectedPlayerID);
    if (mementosData.length > 0) {
      const mementosHeader = document.createElement("fxs-header");
      mementosHeader.classList.add("uppercase", "mt-8", "mb-2", "text-secondary", "font-title", "text-base");
      mementosHeader.setAttribute("title", "LOC_LEADER_MEMENTOS_TITLE");
      mementosHeader.setAttribute("filigree-style", "h4");
      infoContainer.appendChild(mementosHeader);
      mementosData.forEach((memento, index) => {
        const mementoItem = document.createElement("div");
        mementoItem.role = "paragraph";
        mementoItem.classList.value = "flex flex-row items-center ml-2 pointer-events-auto";
        mementoItem.classList.toggle("mb-4", index != mementosData.length - 1);
        infoContainer.appendChild(mementoItem);
        const itemIcon = document.createElement("div");
        itemIcon.classList.value = "relative size-14 mr-2 bg-center bg-contain bg-no-repeat";
        itemIcon.style.backgroundImage = `url("blp:${memento.mementoIcon || (memento.isMajorTier ? "mem_maj_leader" : "mem_min_leader")}")`;
        mementoItem.appendChild(itemIcon);
        const itemText = document.createElement("div");
        itemText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
        const itemName = document.createElement("div");
        itemName.classList.value = "font-title text-sm mt-4  uppercase";
        itemName.innerHTML = Locale.stylize(memento.mementoName);
        itemText.appendChild(itemName);
        itemText.appendChild(divider.cloneNode(true));
        const itemDescription = document.createElement("div");
        itemDescription.classList.value = "font-body text-sm w-full";
        itemDescription.innerHTML = Locale.stylize(memento.functionalTextDesc);
        itemText.appendChild(itemDescription);
        mementoItem.appendChild(itemText);
        infoContainer.appendChild(mementoItem);
      });
    }
    const civDefinition = GameInfo.Civilizations.lookup(
      playerObject.civilizationType
    );
    if (!civDefinition) {
      console.error("panel-diplomacy-actions: Unable to get civilization definition for selected player");
      return;
    }
    const player = Players.get(DiplomacyManager.selectedPlayerID);
    if (player?.Culture != null) {
      const playerIdeology = player.Culture.getChosenIdeology();
      if (playerIdeology != -1) {
        const ideologyDef = GameInfo.Ideologies.find((item) => {
          return Database.makeHash(item.IdeologyType) == playerIdeology;
        });
        if (ideologyDef != null) {
          const ideologyTitle = document.createElement("fxs-header");
          ideologyTitle.classList.add(
            "uppercase",
            "mt-8",
            "mb-4",
            "text-secondary",
            "font-title",
            "text-base"
          );
          ideologyTitle.setAttribute("title", "LOC_IDEOLOGY");
          ideologyTitle.setAttribute("filigree-style", "h4");
          infoContainer.appendChild(ideologyTitle);
          const ideologyItem = document.createElement("div");
          ideologyItem.classList.value = "flex flex-row items-center";
          infoContainer.appendChild(ideologyItem);
          const leaderPortrait2 = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
          ideologyItem.appendChild(leaderPortrait2);
          const ideologyText = document.createElement("div");
          ideologyText.role = "paragraph";
          ideologyText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start pointer-events-auto";
          ideologyItem.appendChild(ideologyText);
          const ideologyName = document.createElement("div");
          ideologyName.classList.value = "font-title text-sm uppercase";
          ideologyName.innerHTML = Locale.stylize(ideologyDef.Name);
          ideologyText.appendChild(ideologyName);
          const divider2 = document.createElement("div");
          divider2.classList.value = "w-72 filigree-divider-inner-frame my-2";
          ideologyText.appendChild(divider2);
        }
      }
    }
    const agendaNames = Game.Diplomacy.getAgendaNames(DiplomacyManager.selectedPlayerID);
    if (player != null && player.isAI && agendaNames.length > 0) {
      const agendaDescs = Game.Diplomacy.getAgendaDescriptions(DiplomacyManager.selectedPlayerID);
      const agendaTitle = document.createElement("fxs-header");
      agendaTitle.classList.add("uppercase", "mt-8", "mb-4", "text-secondary", "font-title", "text-base");
      agendaTitle.setAttribute("title", "LOC_DIPLOMACY_AGENDA_TITLE");
      agendaTitle.setAttribute("filigree-style", "h4");
      infoContainer.appendChild(agendaTitle);
      const leaderAgendaItem = document.createElement("div");
      leaderAgendaItem.classList.value = "flex flex-row items-center";
      infoContainer.appendChild(leaderAgendaItem);
      const leaderPortrait2 = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
      leaderAgendaItem.appendChild(leaderPortrait2);
      const agendaText = document.createElement("div");
      agendaText.role = "paragraph";
      agendaText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start pointer-events-auto";
      leaderAgendaItem.appendChild(agendaText);
      for (let i = 0; i < agendaNames.length && i < agendaDescs.length; i++) {
        const agendaName = document.createElement("div");
        agendaName.classList.value = "font-title text-sm  uppercase";
        if (i > 0) {
          agendaName.classList.value += " mt-6";
        }
        agendaName.innerHTML = Locale.stylize(agendaNames[i]);
        agendaText.appendChild(agendaName);
        const divider2 = document.createElement("div");
        divider2.classList.value = "w-72 filigree-divider-inner-frame my-2";
        agendaText.appendChild(divider2);
        const agendaDesc = document.createElement("div");
        agendaDesc.classList.value = "font-body text-sm ";
        agendaDesc.innerHTML = Locale.stylize(agendaDescs[i]);
        agendaText.appendChild(agendaDesc);
      }
    }
    const civilizationHeader = document.createElement("fxs-header");
    civilizationHeader.classList.add("uppercase", "mt-8", "mb-4", "text-secondary", "font-title", "text-base");
    civilizationHeader.setAttribute("title", civDefinition.FullName);
    civilizationHeader.setAttribute("filigree-style", "h4");
    infoContainer.appendChild(civilizationHeader);
    const gameAgeType = GameInfo.Ages.lookup(Game.age)?.AgeType;
    const civBonusItems = Database.query(
      "config",
      "select * from CivilizationItems order by SortIndex"
    )?.filter((item) => item.CivilizationType == civDefinition.CivilizationType);
    let civTrait;
    const civTraits = civBonusItems?.filter((item) => item.Kind == "KIND_TRAIT");
    civTraits?.forEach((trait) => {
      if (!civTrait || trait.AgeType == gameAgeType) {
        civTrait = trait;
      }
    });
    const civAbilityName = civTrait?.Name;
    const civAbilityDescription = civTrait?.Description;
    const civUniqueItems = civBonusItems?.filter(
      (item) => item.Kind == "KIND_BUILDING" || item.Kind == "KIND_IMPROVEMENT" || item.Kind == "KIND_UNIT" || item.Kind == "KIND_QUARTER"
    );
    const civLegacyTrait = GameInfo.LegacyCivilizationTraits.lookup(civDefinition.CivilizationType);
    if (civLegacyTrait) {
      const civTraditions = Database.query(
        "gameplay",
        `SELECT *, TraditionType as Type, "KIND_TRADITION" AS Kind FROM Traditions`
      )?.filter(
        (item) => item.TraitType == civLegacyTrait?.TraitType && !item.IsCrisis && (!item.AgeType || item.AgeType == gameAgeType)
      );
      if (civTraditions) {
        civUniqueItems?.push(...civTraditions);
      }
    }
    const uniqueTypes = `${civUniqueItems?.map((item) => {
      return `"${item.Type}"`;
    }).join(",")}`;
    const unlockNodes = Database.query(
      "gameplay",
      `SELECT ProgressionTreeNodes.ProgressionTreeNodeType, ProgressionTreeNodeUnlocks.TargetType, ProgressionTreeNodes.Name FROM ProgressionTreeNodeUnlocks JOIN ProgressionTreeNodes ON ProgressionTreeNodes.ProgressionTreeNodeType == ProgressionTreeNodeUnlocks.ProgressionTreeNodeType WHERE ProgressionTreeNodeUnlocks.TargetType IN (${uniqueTypes});`
    );
    const syncretismUnlocks = GameInfo.CivSelfSyncretismUnlocks.filter(
      (r) => r.CivilizationType == civDefinition.CivilizationType
    ).map((r) => r.UnlockType);
    const civBonusItem = document.createElement("div");
    civBonusItem.classList.value = "flex flex-row items-center mb-4 ml-2";
    infoContainer.appendChild(civBonusItem);
    const civBonusIcon = document.createElement("fxs-icon");
    civBonusIcon.classList.add("size-12", "mr-4");
    civBonusIcon.setAttribute("data-icon-context", "DEFAULT");
    civBonusIcon.setAttribute("data-icon-id", civDefinition.CivilizationType);
    civBonusItem.appendChild(civBonusIcon);
    const civBonusText = document.createElement("div");
    civBonusText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
    civBonusItem.appendChild(civBonusText);
    const abilityNameElement = document.createElement("div");
    abilityNameElement.classList.value = "font-title text-sm  uppercase";
    abilityNameElement.innerHTML = Locale.stylize(civAbilityName);
    civBonusText.appendChild(abilityNameElement);
    civBonusText.appendChild(divider.cloneNode());
    const abilityDescriptionElement = document.createElement("div");
    abilityDescriptionElement.classList.value = "font-body text-sm w-full pointer-events-auto";
    abilityDescriptionElement.innerHTML = Locale.stylize(civAbilityDescription);
    civBonusText.appendChild(abilityDescriptionElement);
    civUniqueItems?.sort((a, b) => {
      if (a.Kind == b.Kind) return 0;
      let targetItem;
      let sort = 1;
      if (a.Kind === "KIND_UNIT") {
        targetItem = a;
      } else if (b.Kind === "KIND_UNIT") {
        targetItem = b;
        sort = -1;
      }
      if (!targetItem) return 0;
      const ageType = targetItem.AgeType ?? ageData.get(targetItem.CivilizationDomain);
      const ageIndex = ageData.get(ageType)?.SortIndex ?? 0;
      if (ageIndex < currentAgeIndex) return sort;
      return 0;
    });
    civUniqueItems?.forEach((uniqueItem) => {
      const civBonusItem2 = document.createElement("div");
      civBonusItem2.classList.value = "flex flex-row items-center mb-4 ml-2";
      const ageType = uniqueItem.AgeType ?? ageData.get(uniqueItem.CivilizationDomain);
      const ageIndex = ageData.get(ageType)?.SortIndex ?? 0;
      const ageName = ageData.get(ageType)?.Name ?? "";
      let iconName = "";
      let typeName = "";
      switch (uniqueItem.Kind) {
        case "KIND_UNIT":
          iconName = uniqueItem.Type;
          typeName = Locale.compose("LOC_UNIT_UNIQUE_TITLE");
          break;
        case "KIND_IMPROVEMENT":
          iconName = uniqueItem.Type;
          typeName = Locale.compose("LOC_BUILDING_UNIQUE_TITLE");
          break;
        case "KIND_BUILDING":
          iconName = uniqueItem.Type;
          typeName = Locale.compose("LOC_BUILDING_UNIQUE_TITLE");
          break;
        case "KIND_QUARTER":
          typeName = Locale.compose("LOC_UI_PRODUCTION_UNIQUE_QUARTER");
          iconName = "CITY_UNIQUE_QUARTER";
          break;
        case "KIND_TRADITION":
          typeName = Locale.compose("LOC_UI_TRADITION_TITLE");
          iconName = "KIND_TRADITION_UNLOCK";
          break;
        default:
          break;
      }
      let isAvailableInAge = true;
      let ageText = "";
      if (ageIndex != currentAgeIndex) {
        if (uniqueItem.Kind == "KIND_UNIT") {
          isAvailableInAge = false;
          ageText = Locale.compose("LOC_UI_CREATE_GAME_AVAILABLE_IN_THE_AGE", ageName);
        } else if (ageIndex > currentAgeIndex) {
          isAvailableInAge = false;
          ageText = Locale.compose("LOC_UI_CREATE_GAME_AVAILABLE_IN_THE_AGE", ageName);
        }
      }
      let itemDesc;
      const unlockedGreatPeople = /* @__PURE__ */ new Set();
      if (uniqueItem.Kind == "KIND_IMPROVEMENT" || uniqueItem.Kind == "KIND_BUILDING") {
        for (const greatPersonClass of leaderValidGreatPeople) {
          if (!greatPersonClass.ConstructibleType && !greatPersonClass.ConstructibleTag) continue;
          if (greatPersonClass.ConstructibleType) {
            if (greatPersonClass.ConstructibleType !== uniqueItem.Type) continue;
          }
          if (greatPersonClass.ConstructibleTag) {
            if (!ConstructibleHasTagType(uniqueItem.Type, greatPersonClass.ConstructibleTag))
              continue;
          }
          unlockedGreatPeople.add(greatPersonClass.UnitType);
        }
      } else if (uniqueItem.Kind == "KIND_QUARTER") {
        for (const greatPersonClass of leaderValidGreatPeople) {
          if (greatPersonClass.UniqueQuarterType !== uniqueItem.Type) continue;
          unlockedGreatPeople.add(greatPersonClass.UnitType);
        }
      }
      if (unlockedGreatPeople.size > 0) {
        itemDesc = `{${uniqueItem.Description}}`;
        for (const greatPersonType of unlockedGreatPeople) {
          const greatPersonUnitDef = GameInfo.Units.lookup(greatPersonType);
          if (greatPersonUnitDef) {
            const unitName = greatPersonUnitDef.Description ? `[TIP:${greatPersonUnitDef.Description}]{${greatPersonUnitDef.Name}}[/TIP]` : greatPersonUnitDef.Name;
            itemDesc += `[nn]` + Locale.compose("LOC_UI_PRODUCTION_ALLOWS_TRAINING", greatPersonType, unitName);
          }
        }
      }
      const itemIcon = document.createElement("fxs-icon");
      itemIcon.classList.add("size-12", "mr-4", "relative");
      itemIcon.setAttribute("data-icon-context", "DEFAULT");
      itemIcon.setAttribute("data-icon-id", iconName);
      if (!isAvailableInAge) {
        const itemLock = document.createElement("div");
        itemLock.classList.add("size-8", "absolute", "-bottom-2", "-right-2", "pointer-events-auto");
        itemLock.style.backgroundImage = `url('blp:civ_timetested_100x100')`;
        itemLock.style.backgroundSize = "contain";
        itemLock.style.backgroundRepeat = "no-repeat";
        itemLock.setAttribute("data-tooltip-content", ageText);
        itemIcon.appendChild(itemLock);
        if (uniqueItem.Kind == "KIND_UNIT" && ageIndex < currentAgeIndex) {
          civBonusItem2.classList.add("opacity-40");
        }
      }
      civBonusItem2.appendChild(itemIcon);
      const itemText = document.createElement("div");
      itemText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
      const itemName = document.createElement("div");
      itemName.role = "paragraph";
      itemName.classList.value = "font-title text-sm mt-4 uppercase pointer-events-auto";
      itemName.innerHTML = Locale.stylize(uniqueItem.Name);
      itemText.appendChild(itemName);
      const unlockNode = unlockNodes?.filter((item) => item.TargetType == uniqueItem.Type);
      const hasUnlock = unlockNode && unlockNode.length > 0;
      const isSyncreticUnlock = syncretismUnlocks.includes(uniqueItem.Type);
      if (isSyncreticUnlock || hasUnlock) {
        const unlockNodeName = hasUnlock ? unlockNode[0].Name : "";
        const itemUnlock = document.createElement("div");
        itemUnlock.role = "paragraph";
        itemUnlock.classList.value = "font-body text-accent-3 text-sm w-full pointer-events-auto";
        itemUnlock.innerHTML = Locale.stylize(
          `{LOC_LOADING_TRADITION_UNLOCKED_WITH} [B]{${unlockNodeName || "LOC_UI_SYNCRETISM_TITLE"}}[/B]`
        );
        itemText.appendChild(itemUnlock);
      }
      if (!isAvailableInAge) {
        const itemAge = document.createElement("div");
        itemAge.role = "paragraph";
        itemAge.classList.value = "font-body text-accent-3 text-sm w-full pointer-events-auto";
        itemAge.innerHTML = ageText;
        itemText.appendChild(itemAge);
      }
      itemText.appendChild(divider.cloneNode(true));
      const itemTypeName = document.createElement("div");
      itemTypeName.role = "paragraph";
      itemTypeName.classList.value = "font-body text-sm font-bold pointer-events-auto mb-2";
      itemTypeName.innerHTML = typeName;
      itemText.appendChild(itemTypeName);
      const itemDescription = document.createElement("div");
      itemDescription.role = "paragraph";
      itemDescription.classList.value = "font-body text-sm w-full pointer-events-auto";
      itemDescription.innerHTML = Locale.stylize(itemDesc ?? uniqueItem.Description);
      itemText.appendChild(itemDescription);
      civBonusItem2.appendChild(itemText);
      infoContainer.appendChild(civBonusItem2);
    });
  }
  populateGovernmentInfo() {
    if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
      return;
    }
    const governmentContainer = MustGetElement("#panel-diplomacy-actions__government-container", this.Root);
    removeAllChildren(governmentContainer);
    const playerObject = Players.get(DiplomacyManager.selectedPlayerID);
    if (!playerObject) {
      console.error(
        "panel-diplomacy-actions: Unable to get player object for selected player while trying to government info!"
      );
      return;
    }
    if (!playerObject.Culture) {
      console.error("panel-diplomacy-actions: No valid culture object attached to selected player!");
      return;
    }
    const governmentDefinition = GameInfo.Governments.lookup(
      playerObject.Culture.getGovernmentType()
    );
    if (governmentDefinition) {
      const governmentTitle = document.createElement("fxs-header");
      governmentTitle.classList.add("uppercase", "mb-4", "font-title", "text-base", "text-secondary");
      governmentTitle.setAttribute("title", governmentDefinition.Name);
      governmentTitle.setAttribute("filigree-style", "h4");
      governmentTitle.setAttribute("tabindex", "-1");
      governmentContainer.appendChild(governmentTitle);
      if (!governmentDefinition.Description) {
        console.error(
          "panel-diplomacy-actions: No description for government: " + governmentDefinition.GovernmentType
        );
        return;
      }
      const governmentAbilityTitle = document.createElement("div");
      governmentAbilityTitle.classList.value = "flex flex-auto w-full uppercase text-accent-3 justify-center font-title-xs tracking-100 my-2";
      governmentAbilityTitle.innerHTML = Locale.stylize("LOC_UI_GOVERNMENT_ABILITY");
      governmentContainer.appendChild(governmentAbilityTitle);
      const govModifiers = GameInfo.GovernmentModifiers.filter(
        (m) => m.GovernmentType === governmentDefinition.GovernmentType
      );
      for (const govMod of govModifiers) {
        const govAbilityText = getModifierTextByContext(govMod.ModifierId, "Description");
        if (govAbilityText) {
          const governmentAbility = document.createElement("div");
          governmentAbility.classList.value = "flex items-center text-center px-2 text-sm";
          governmentAbility.innerHTML = Locale.stylize(govAbilityText);
          governmentContainer.appendChild(governmentAbility);
          break;
        }
      }
      const divider = document.createElement("div");
      divider.classList.add("w-60", "filigree-divider-inner-frame", "self-center", "mt-7", "mb-4");
      governmentContainer.appendChild(divider);
      const celebrationTitle = document.createElement("div");
      celebrationTitle.classList.value = "flex flex-auto w-full uppercase text-accent-3 justify-center font-title-xs tracking-100 mb-2";
      celebrationTitle.innerHTML = Locale.stylize("LOC_UI_CELEBRATION_OPTIONS");
      governmentContainer.appendChild(celebrationTitle);
      const governmentDescription = document.createElement("p");
      governmentDescription.classList.add("font-body", "text-center", "text-sm", "mb-2");
      governmentDescription.innerHTML = Locale.stylize(governmentDefinition.Description);
      governmentContainer.appendChild(governmentDescription);
      const governmentCelebrationTypes = Game.Culture.GetCelebrationTypesForGovernment(
        governmentDefinition.GovernmentType
      );
      const playerHappiness = playerObject.Happiness;
      if (playerHappiness != void 0) {
        for (const celebrationChoice of governmentCelebrationTypes) {
          const celebrationItemDef = GameInfo.GoldenAges.lookup(celebrationChoice);
          if (!celebrationItemDef) {
            console.error(
              `screen-government-picker: render - No golden age definition found for ${celebrationChoice}!`
            );
            continue;
          }
          const celebrationChoiceContainer = document.createElement("div");
          celebrationChoiceContainer.classList.value = "flex items-center mb-3 max-w-3\\/4 text-sm pl-2 my-3";
          const celebrationItemImage = document.createElement("div");
          celebrationItemImage.classList.value = "bg-no-repeat bg-center bg-contain size-8 mr-2";
          celebrationItemImage.style.backgroundImage = `url(${UI.getIconURL(celebrationItemDef.GoldenAgeType)})`;
          celebrationChoiceContainer.appendChild(celebrationItemImage);
          const celebrationItemDesc = document.createElement("div");
          celebrationItemDesc.classList.value = "font-body text-sm";
          celebrationItemDesc.innerHTML = Locale.stylize(
            celebrationItemDef.Description,
            playerHappiness.getGoldenAgeDuration()
          );
          celebrationChoiceContainer.appendChild(celebrationItemDesc);
          governmentContainer.appendChild(celebrationChoiceContainer);
        }
      }
    }
    const govTypeString = governmentDefinition?.GovernmentType ?? "";
    if (govTypeString) {
      const govtNodes = GameInfo.ProgressionTreeNodeUnlocks.filter(
        (o) => o.RequiredGovernmentType == govTypeString
      );
      if (govtNodes) {
        if (govtNodes.length > 0) {
          const divider = document.createElement("div");
          divider.classList.add("w-60", "filigree-divider-inner-frame", "my-4", "self-center");
          governmentContainer.appendChild(divider);
          const traditionTitle = document.createElement("div");
          traditionTitle.classList.value = "flex flex-auto w-full uppercase text-accent-3 justify-center font-title-xs tracking-100 mb-2";
          traditionTitle.innerHTML = Locale.stylize("LOC_UI_TRADITIONS_TITLE");
          governmentContainer.appendChild(traditionTitle);
        }
        for (const govtTraditions in govtNodes) {
          const tradition = GameInfo.Traditions.lookup(govtNodes[govtTraditions].TargetType);
          if (tradition) {
            const traditionItem = document.createElement("div");
            traditionItem.classList.value = `flex flex-row items-center ml-2 mb-4`;
            governmentContainer.appendChild(traditionItem);
            const itemIcon = document.createElement("fxs-icon");
            itemIcon.classList.add("size-12", "mr-4", "relative");
            itemIcon.setAttribute("data-icon-context", "DEFAULT");
            itemIcon.style.backgroundImage = `url('blp:unlock_tradition')`;
            traditionItem.appendChild(itemIcon);
            const itemText = document.createElement("div");
            itemText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
            const itemName = document.createElement("div");
            itemName.role = "paragraph";
            itemName.classList.value = "font-title text-sm mt-4 uppercase pointer-events-auto";
            itemName.innerHTML = Locale.stylize(tradition.Name ?? "");
            itemText.appendChild(itemName);
            const unlockNode = govtNodes.filter(
              (item) => item.TargetType == govtNodes[govtTraditions].TargetType
            );
            if (unlockNode) {
              const nodeObject = GameInfo.ProgressionTreeNodes.lookup(
                unlockNode[0].ProgressionTreeNodeType
              );
              const unlockNodeName = nodeObject ? nodeObject.Name : "";
              const itemUnlock = document.createElement("div");
              itemUnlock.role = "paragraph";
              itemUnlock.classList.value = "font-body text-accent-3 text-sm w-full pointer-events-auto";
              itemUnlock.innerHTML = Locale.stylize(
                `{LOC_LOADING_TRADITION_UNLOCKED_WITH} [B]{${unlockNodeName}}[/B]`
              );
              itemText.appendChild(itemUnlock);
            }
            const itemDescription = document.createElement("div");
            itemDescription.role = "paragraph";
            itemDescription.classList.value = "font-body text-sm w-full pointer-events-auto";
            itemDescription.innerHTML = Locale.stylize(tradition.Description ?? "");
            itemText.appendChild(itemDescription);
            traditionItem.appendChild(itemText);
            governmentContainer.appendChild(traditionItem);
          }
        }
        const spacer = document.createElement("div");
        spacer.classList.value = "h-8 w-full";
        governmentContainer.appendChild(spacer);
      }
    }
    if (!playerObject.Religion) {
      console.error("panel-diplomacy-actionss: no valid PlayerReligion attached to player!");
      return;
    }
    const playerPantheons = playerObject.Religion.getPantheons();
    if (playerPantheons.length > 0) {
      let religionTitleText = playerObject.Religion.getReligionName();
      if (religionTitleText == "") {
        religionTitleText = "LOC_TUTORIAL_PANTHEON_UNLOCKED_TITLE";
      }
      const religionTitle = document.createElement("fxs-header");
      religionTitle.classList.add("uppercase", "mt-6", "mb-1", "font-title", "text-base", "text-secondary");
      religionTitle.setAttribute("title", religionTitleText);
      religionTitle.setAttribute("filigree-style", "h4");
      governmentContainer.appendChild(religionTitle);
    }
    playerPantheons.forEach((pantheon, index) => {
      const pantheonDef = GameInfo.Beliefs.lookup(pantheon);
      if (!pantheonDef) {
        console.error(
          `screen-diplomacy-actions: populateGovernmentInfo - No belief def found for type ${pantheon}`
        );
        return;
      }
      if (index > 0) {
        const divider = document.createElement("div");
        divider.classList.add("w-60", "filigree-divider-inner-frame", "self-center", "mb-2");
        governmentContainer.appendChild(divider);
      }
      const pantheonItem = document.createElement("div");
      pantheonItem.classList.value = "flex flex-row items-center";
      const pantheonIconContainer = document.createElement("div");
      pantheonIconContainer.classList.value = "size-19 flex items-center justify-center pointer-events-none relative";
      pantheonItem.appendChild(pantheonIconContainer);
      const pantheonIcon = document.createElement("fxs-icon");
      pantheonIcon.classList.add("size-12");
      pantheonIcon.setAttribute("data-icon-context", "DEFAULT");
      pantheonIcon.setAttribute("data-icon-id", pantheonDef.BeliefType);
      pantheonIconContainer.appendChild(pantheonIcon);
      const iconFront = document.createElement("div");
      iconFront.classList.value = "absolute img-civics-icon-frame size-19 flex self-center items-center justify-center pointer-events-none relative";
      pantheonIconContainer.appendChild(iconFront);
      const pantheonInfoContainer = document.createElement("div");
      pantheonInfoContainer.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
      pantheonItem.appendChild(pantheonInfoContainer);
      const pantheonTitle = document.createElement("div");
      pantheonTitle.role = "paragraph";
      pantheonTitle.classList.value = "font-title text-base pointer-events-auto";
      pantheonTitle.innerHTML = Locale.stylize(pantheonDef.Name);
      pantheonInfoContainer.appendChild(pantheonTitle);
      const pantheonDescription = document.createElement("div");
      pantheonDescription.role = "paragraph";
      pantheonDescription.classList.value = "font-body text-sm flex flex-col pointer-events-auto";
      pantheonDescription.innerHTML = Locale.stylize(pantheonDef.Description);
      pantheonInfoContainer.appendChild(pantheonDescription);
      governmentContainer.appendChild(pantheonItem);
    });
    const isLocalPlayer = DiplomacyManager.selectedPlayerID == GameContext.localPlayerID;
    if (!governmentContainer.hasChildNodes()) {
      const emptyGovDescription = document.createElement("div");
      emptyGovDescription.role = "paragraph";
      emptyGovDescription.classList.value = "font-body text-sm flex flex-col pointer-events-auto items-center";
      if (isLocalPlayer) {
        emptyGovDescription.innerHTML = Locale.stylize("LOC_UI_DIPLOMACY_GOVERNMENT_EMPTY");
      } else {
        emptyGovDescription.innerHTML = Locale.stylize("LOC_UI_DIPLOMACY_OTHER_GOVERNMENT_EMPTY");
      }
      governmentContainer.appendChild(emptyGovDescription);
    }
  }
  populateRelationshipInfo() {
    if (!this.checkShouldShowPanel()) {
      return;
    }
    const relationshipEventContainer = MustGetElement(
      "#panel-diplomacy-actions__relationship-event-container",
      this.Root
    );
    removeAllChildren(relationshipEventContainer);
    const playerLibrary = Players.get(DiplomacyManager.selectedPlayerID);
    if (!playerLibrary) {
      console.error(
        "panel-diplomacy-actions: Unable to get player library for player with id: " + DiplomacyManager.selectedPlayerID
      );
      return;
    }
    const playerDiplomacy = playerLibrary.Diplomacy;
    if (playerDiplomacy === void 0) {
      console.error(
        "panel-diplomacy-actions: Attempting to update relationship info screen, but unable to get selected player diplomacy library"
      );
      return;
    }
    const relationshipBreakdown = new RelationshipBreakdown(
      DiplomacyManager.selectedPlayerID,
      GameContext.localPlayerID
    );
    relationshipBreakdown.root.classList.add("w-128", "self-center");
    relationshipEventContainer.appendChild(relationshipBreakdown.root);
    relationshipBreakdown.update(DiplomacyManager.selectedPlayerID, GameContext.localPlayerID);
    const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
    if (!localPlayerDiplomacy) {
      console.error("panel-diplomacy-actions: Unable to get PlayerLibrary for local player!");
      return;
    }
    const otherRelationships = [];
    for (const id of Players.getAliveIds()) {
      const playerLibrary2 = Players.get(id);
      if (!playerLibrary2 || !playerLibrary2.isMajor || id != GameContext.localPlayerID && !playerDiplomacy.hasMet(id)) {
        continue;
      }
      const otherRelationshipData = {
        leaderID: id,
        relationshipLevel: playerDiplomacy.getRelationshipEnum(id),
        portraitIcon: localPlayerDiplomacy.hasMet(id) || GameContext.localPlayerID == id ? Icon.getLeaderPortraitIcon(playerLibrary2.leaderType) : "blp:leader_portrait_unknown"
      };
      if (playerDiplomacy.isAtWarWith(id)) {
        otherRelationshipData.atWar = true;
      } else if (playerDiplomacy.hasAllied(id)) {
        otherRelationshipData.allied = true;
      }
      otherRelationships.push(otherRelationshipData);
    }
    const otherRelationshipsHeader = MustGetElement(
      "#panel-diplomacy-actions__other-relationships-header-name",
      this.Root
    );
    otherRelationshipsHeader.role = "header";
    otherRelationshipsHeader.innerHTML = Locale.compose(playerLibrary.leaderName);
    const otherRelationshipsContainer = MustGetElement(
      "#panel-diplomacy-actions__other-relationships-container",
      this.Root
    );
    removeAllChildren(otherRelationshipsContainer);
    otherRelationships.forEach((relationship) => {
      const row = this.getRelationshipRow(relationship);
      if (!row) {
        console.error(
          "Panel-diplomacy-actions: Unable to find relationship row for relationship type: " + relationship.relationshipLevel
        );
        return;
      }
      const iconRow = MustGetElement("#relationship-icon-row", row);
      iconRow.appendChild(this.createBorderedIcon(relationship.portraitIcon, relationship.leaderID));
      otherRelationshipsContainer.appendChild(row);
    });
    const relationshipAmountValue = playerDiplomacy.getRelationshipLevel(GameContext.localPlayerID);
    waitForLayout(() => {
      const relationshipButton = this.Root.querySelector("#diplomacy-tab-relationship-tab-item");
      if (relationshipButton) {
        let relationshipButtonNumber = relationshipButton.querySelector("#relationship-button-number");
        if (!relationshipButtonNumber) {
          const relationshipButtonImg = MustGetElement("fxs-stateful-icon", relationshipButton);
          relationshipButtonImg.classList.add("flex", "justify-center");
          relationshipButtonNumber = document.createElement("div");
          relationshipButtonNumber.setAttribute("id", "relationship-button-number");
          relationshipButtonNumber.classList.value = "font-title text-xs text-center self-center font-bold absolute";
          relationshipButtonImg.appendChild(relationshipButtonNumber);
        }
        let relationshipAmountString = relationshipAmountValue.toString();
        if (relationshipAmountValue < 0) {
          relationshipAmountString = (relationshipAmountValue * -1).toString();
        }
        relationshipButtonNumber.innerHTML = relationshipAmountString;
        relationshipButtonNumber.classList.toggle("text-positive-dark", relationshipAmountValue > 0);
        relationshipButtonNumber.classList.toggle("text-negative-dark", relationshipAmountValue < 0);
      }
    });
  }
  createBorderedIcon(iconURL, leaderID) {
    const portrait = document.createElement("div");
    portrait.classList.add("panel-diplomacy-actions__ongoing-action-portrait", "pointer-events-auto");
    const portraitBG = document.createElement("div");
    portraitBG.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg");
    portrait.appendChild(portraitBG);
    const portraitBGInner = document.createElement("div");
    portraitBGInner.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg-inner");
    portrait.appendChild(portraitBGInner);
    const portraitIcon = document.createElement("div");
    portraitIcon.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-image");
    portraitIcon.style.backgroundImage = `url(${iconURL})`;
    portrait.appendChild(portraitIcon);
    if (leaderID != void 0) {
      const otherLeaderLibrary = Players.get(leaderID);
      if (!otherLeaderLibrary) {
        console.error(
          `panel-diplomacy-action: createBorderedIcon - no player library found for player ID ${leaderID}`
        );
        return portrait;
      }
      const localPlayer = Players.get(GameContext.localPlayerID);
      if (!localPlayer) {
        console.error(`panel-diplomacy-action: createBorderedIcon - no local player library found!`);
        return portrait;
      }
      const localPlayerDiplomacy = localPlayer.Diplomacy;
      if (!localPlayerDiplomacy) {
        console.error(`panel-diplomacy-action: createBorderedIcon - no local player diplomacy library found!`);
        return portrait;
      }
      if (localPlayerDiplomacy.hasMet(leaderID) || GameContext.localPlayerID == leaderID) {
        portrait.setAttribute("data-tooltip-content", Locale.compose(otherLeaderLibrary.name));
      } else {
        portrait.setAttribute("data-tooltip-content", Locale.compose("LOC_LEADER_UNMET_NAME"));
      }
    }
    return portrait;
  }
  getRelationshipRow(relationship) {
    if (relationship.atWar) {
      return this.findOrCreateRelationshipRow("at-war", "LOC_PLAYER_RELATIONSHIP_AT_WAR");
    } else if (relationship.allied) {
      return this.findOrCreateRelationshipRow("allied", "LOC_PLAYER_RELATIONSHIP_ALLIANCE");
    } else {
      switch (relationship.relationshipLevel) {
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
          return this.findOrCreateRelationshipRow(
            DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY.toString(),
            "LOC_PLAYER_RELATIONSHIP_FRIENDLY"
          );
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
          return this.findOrCreateRelationshipRow(
            DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL.toString(),
            "LOC_PLAYER_RELATIONSHIP_HELPFUL"
          );
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
          return this.findOrCreateRelationshipRow(
            DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE.toString(),
            "LOC_PLAYER_RELATIONSHIP_HOSTILE"
          );
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
          return this.findOrCreateRelationshipRow(
            DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY.toString(),
            "LOC_PLAYER_RELATIONSHIP_UNFRIENDLY"
          );
        case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL:
          return this.findOrCreateRelationshipRow(
            DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL.toString(),
            "LOC_PLAYER_RELATIONSHIP_NEUTRAL"
          );
        default:
          return null;
      }
    }
  }
  findOrCreateRelationshipRow(id, titleString) {
    let relatioshipRowWrapper = this.Root.querySelector(
      `#panel-diplomacy-actions__relationship-row-${id}`
    );
    if (!relatioshipRowWrapper) {
      relatioshipRowWrapper = document.createElement("div");
      relatioshipRowWrapper.setAttribute("id", `panel-diplomacy-actions__relationship-row-${id}`);
      const relationshipRow = document.createElement("div");
      relationshipRow.role = "paragraph";
      relationshipRow.classList.add(
        "flex",
        "flex-row",
        "h-15",
        "items-center",
        "mt-2",
        "border-b-accent",
        "pointer-events-auto"
      );
      const title = document.createElement("div");
      title.classList.value = "font-body text-sm ml-2 w-24 font-fit-shrink";
      title.innerHTML = Locale.compose(titleString);
      const iconRow = document.createElement("div");
      iconRow.classList.value = "flex-wrap flex flex-auto relative flex-row";
      iconRow.setAttribute("id", "relationship-icon-row");
      relationshipRow.appendChild(title);
      relationshipRow.appendChild(iconRow);
      relatioshipRowWrapper.appendChild(relationshipRow);
      const divider = document.createElement("div");
      divider.classList.add("w-60", "filigree-divider-inner-frame", "self-center");
      relatioshipRowWrapper.appendChild(divider);
    }
    return relatioshipRowWrapper;
  }
  setOngoingActionsScrollablePosition() {
    const ongoingActionsScrollable = MustGetElement(
      ".panel-diplomacy-actions__ongoing-actions-scrollable",
      this.Root
    );
    const ribbonStats = Configuration.getUser().getValue("RibbonStats");
    if (ribbonStats == RibbonStatsToggleStatus.RibbonStatsShowing) {
      ongoingActionsScrollable.classList.add("panel-diplomacy-actions__ribbons-showing");
      ongoingActionsScrollable.classList.remove("panel-diplomacy-actions__ribbons-not-showing");
    } else {
      ongoingActionsScrollable.classList.add("panel-diplomacy-actions__ribbons-not-showing");
      ongoingActionsScrollable.classList.remove("panel-diplomacy-actions__ribbons-showing");
    }
  }
  onCollapseActionSection(collapseButton, actionsContainer) {
    const type = collapseButton.getAttribute("type");
    if (type == "minus") {
      collapseButton.setAttribute("type", "plus");
      actionsContainer.classList.add("hidden");
      Audio.playSound("data-audio-dropdown-close");
    } else {
      collapseButton.setAttribute("type", "minus");
      actionsContainer.classList.remove("hidden");
      Audio.playSound("data-audio-dropdown-open");
    }
  }
  populateActionsPanel() {
    if (!this.checkShouldShowPanel()) {
      return;
    }
    if (DiplomacyManager.selectedPlayerID == PlayerIds.NO_PLAYER) {
      console.error(
        "panel-diplomacy-actions: Trying to view ongoing diplomatic actions without a valid player selected!"
      );
      this.close();
      return;
    }
    const availableProjectsSlot = MustGetElement("#available-projects-slot", this.Root);
    removeAllChildren(availableProjectsSlot);
    const wars = [];
    const otherPlayer = Players.get(DiplomacyManager.selectedPlayerID);
    if (otherPlayer != null && otherPlayer.isMajor) {
      const theirWars = Game.Diplomacy.getPlayerEvents(
        DiplomacyManager.selectedPlayerID
      ).filter((action) => {
        return action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR;
      });
      theirWars.forEach((war) => {
        if ((war.targetPlayer == GameContext.localPlayerID || war.initialPlayer == GameContext.localPlayerID) && (war.targetPlayer == DiplomacyManager.selectedPlayerID || war.initialPlayer == DiplomacyManager.selectedPlayerID) && !wars.find((w) => war.uniqueID == w.uniqueID)) {
          wars.push(war);
        }
      });
    }
    this.firstFocusSection = null;
    if (wars.length > 0) {
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_WAR_HEADER");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-5");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      this.firstFocusSection = collapseButton;
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "h-auto",
        "w-auto",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      wars.forEach((war) => {
        const warChooserItem = this.createWarInfoElement(war);
        actionsContainer.appendChild(warChooserItem);
        warChooserItem.addEventListener("action-activate", () => {
          this.clickOngoingAction(war.uniqueID);
        });
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    DiplomacyManager.queryAvailableProjectData(DiplomacyManager.selectedPlayerID);
    let hasAvailableProjects = false;
    if (DiplomacyManager.availableTreaties.length > 0) {
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_AVAILABLE_TREATIES");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-5");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      if (this.firstFocusSection == null) {
        this.firstFocusSection = collapseButton;
      }
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      DiplomacyManager.availableTreaties.forEach((project) => {
        const newItem = this.createStartActionListItem(project);
        actionsContainer.appendChild(newItem);
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    if (DiplomacyManager.availableProjects.length > 0) {
      hasAvailableProjects = true;
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_AVAILABLE_PROJECTS");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-5");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      if (this.firstFocusSection == null) {
        this.firstFocusSection = collapseButton;
      }
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      DiplomacyManager.availableProjects.forEach((project) => {
        const newItem = this.createStartActionListItem(project);
        actionsContainer.appendChild(newItem);
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    if (DiplomacyManager.availableEndeavors.length > 0) {
      hasAvailableProjects = true;
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_AVAILABLE_ENDEAVORS");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-5");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      if (this.firstFocusSection == null) {
        this.firstFocusSection = collapseButton;
      }
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      DiplomacyManager.availableEndeavors.forEach((project) => {
        const newItem = this.createStartActionListItem(project);
        actionsContainer.appendChild(newItem);
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    if (DiplomacyManager.availableSanctions.length > 0) {
      hasAvailableProjects = true;
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_AVAILABLE_SANCTIONS");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-5");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      if (this.firstFocusSection == null) {
        this.firstFocusSection = collapseButton;
      }
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      DiplomacyManager.availableSanctions.forEach((project) => {
        const newItem = this.createStartActionListItem(project);
        actionsContainer.appendChild(newItem);
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    if (DiplomacyManager.availableEspionage.length > 0) {
      hasAvailableProjects = true;
      const header = document.createElement("fxs-header");
      header.classList.add("relative");
      header.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_AVAILABLE_ESPIONAGE");
      header.setAttribute("filigree-style", "h3");
      availableProjectsSlot.appendChild(header);
      const collapseButton = document.createElement("fxs-minus-plus");
      collapseButton.classList.add("absolute", "top-1", "right-4");
      collapseButton.setAttribute("type", "minus");
      collapseButton.setAttribute("tabindex", "-1");
      header.appendChild(collapseButton);
      if (this.firstFocusSection == null) {
        this.firstFocusSection = collapseButton;
      }
      const actionsContainer = document.createElement("fxs-vslot");
      actionsContainer.classList.add(
        "overflow-hidden",
        "transition-all",
        "duration-100",
        "scale-y-100",
        "origin-top"
      );
      DiplomacyManager.availableEspionage.forEach((project) => {
        const newItem = this.createStartActionListItem(project);
        actionsContainer.appendChild(newItem);
      });
      collapseButton.addEventListener("action-activate", () => {
        this.onCollapseActionSection(collapseButton, actionsContainer);
      });
      availableProjectsSlot.appendChild(actionsContainer);
    }
    if (!hasAvailableProjects) {
      const noAvailableProjectsElement = document.createElement("p");
      noAvailableProjectsElement.classList.value = "mt-16 font-title text-2xl text-center";
      noAvailableProjectsElement.innerHTML = Locale.compose("LOC_DIPLOMACY_NO_AVAILABLE_PROJECTS");
      availableProjectsSlot.appendChild(noAvailableProjectsElement);
    }
  }
  createWarInfoElement(war) {
    const warElement = document.createElement("fxs-chooser-item");
    warElement.setAttribute("show-frame-on-hover", "false");
    const localPlayer = Players.get(GameContext.localPlayerID);
    if (!localPlayer?.Diplomacy) {
      console.error("panel-diplomacy-actions: createWarInfoElement - No valid PlayerDiplomacy for localPlayer");
      return warElement;
    }
    warElement.classList.add(
      "panel-diplomacy-actions__war-item",
      "text-accent-2",
      "w-136",
      "flex",
      "flex-row",
      "mb-2",
      "grow",
      "justify-between"
    );
    const bg = document.createElement("div");
    bg.classList.value = "panel-diplomacy-actions__war-item-bg absolute size-full";
    warElement.appendChild(bg);
    const border = document.createElement("div");
    border.classList.value = "panel-diplomacy-actions__war-item-border absolute size-full";
    warElement.appendChild(border);
    const initiator = Configuration.getPlayer(war.initialPlayer);
    if (!initiator.leaderTypeName) {
      console.error(
        "panel-diplomacy-actions: createWarInfoElement - Attempting to assign initiator leader icon, but no valid leaderTypeName!"
      );
      return warElement;
    }
    const initiatorIcon = document.createElement("leader-icon");
    initiatorIcon.classList.add("mx-2", "w-16", "h-16", "my-3", "pointer-events-auto");
    initiatorIcon.setAttribute("leader", initiator.leaderTypeName);
    initiatorIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(war.initialPlayer));
    if (initiator.leaderName) {
      initiatorIcon.setAttribute("data-tooltip-content", Locale.compose(initiator.leaderName));
    }
    warElement.appendChild(initiatorIcon);
    const warDetailsContainer = document.createElement("div");
    warDetailsContainer.classList.value = "flex flex-col grow mt-2 relative";
    const warData = Game.Diplomacy.getWarData(war.uniqueID, GameContext.localPlayerID);
    const warNameElement = document.createElement("div");
    warNameElement.classList.value = "font-title text-sm uppercase text-center mb-2";
    warNameElement.innerHTML = warData.warName;
    warDetailsContainer.appendChild(warNameElement);
    const supportBar = document.createElement("div");
    supportBar.classList.value = "panel-diplomacy-actions__war-item-support-tracker flex-auto h-5 relative";
    warDetailsContainer.appendChild(supportBar);
    let supportDelta = 0;
    if (war.initialPlayer == GameContext.localPlayerID || localPlayer.Diplomacy.hasAllied(war.initialPlayer) || Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(war.uniqueID).includes(GameContext.localPlayerID)) {
      bg.classList.add("-scale-x-100");
      supportDelta = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(war.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(war.uniqueID).length;
    } else if (war.targetPlayer != GameContext.localPlayerID && !localPlayer.Diplomacy.hasAllied(war.targetPlayer) && !Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(war.uniqueID).includes(GameContext.localPlayerID)) {
      bg.classList.add("hidden");
      supportDelta = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(war.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(war.uniqueID).length;
    } else {
      supportBar.classList.add("-scale-x-100");
      supportDelta = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(war.uniqueID).length - Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(war.uniqueID).length;
    }
    const supportBarBorder = document.createElement("div");
    supportBarBorder.classList.value = "panel-diplomacy-actions__war-item-support-border size-full";
    supportBar.appendChild(supportBarBorder);
    const supportTracker = document.createElement("div");
    supportTracker.classList.value = "pledge-slots-container h-full absolute";
    let cappedDelta = supportDelta;
    if (cappedDelta > 20) {
      cappedDelta = 20;
    }
    if (cappedDelta < -20) {
      cappedDelta = -20;
    }
    const normalizedDelta = cappedDelta * 50 / 20;
    if (normalizedDelta > 0) {
      supportTracker.style.right = "50%";
    } else {
      supportTracker.style.left = "50%";
    }
    supportTracker.style.width = Math.abs(normalizedDelta).toString() + "%";
    supportBar.appendChild(supportTracker);
    const supportDeltaElement = document.createElement("div");
    supportDeltaElement.classList.value = "font-title text-sm text-center";
    supportDeltaElement.innerHTML = supportDelta > 0 ? "+" + supportDelta : supportDelta.toString();
    warDetailsContainer.appendChild(supportDeltaElement);
    warElement.appendChild(warDetailsContainer);
    const target = Configuration.getPlayer(war.targetPlayer);
    if (!target.leaderTypeName) {
      console.error(
        "panel-diplomacy-actions: createWarInfoElement - Attempting to assign target leader icon, but no valid leaderTypeName!"
      );
      return warElement;
    }
    const targetIcon = document.createElement("leader-icon");
    targetIcon.classList.add("mx-2", "w-16", "h-16", "my-3");
    targetIcon.setAttribute("leader", target.leaderTypeName);
    targetIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(war.targetPlayer));
    if (target.leaderName) {
      targetIcon.setAttribute("data-tooltip-content", Locale.compose(target.leaderName));
    }
    warElement.appendChild(targetIcon);
    return warElement;
  }
  onOptionsTabSelected(e) {
    e.stopPropagation();
    const player = Players.get(DiplomacyManager.selectedPlayerID);
    if (player?.isMajor && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID) {
      this.majorActionsSlot?.classList.toggle("hidden", e.detail.selectedItem.id != "diplomacy-tab-actions");
    }
    this.slotGroup?.setAttribute("selected-slot", e.detail.selectedItem.id);
    waitForLayout(() => this.realizeInitialFocus());
  }
  onInterfaceModeChanged(event) {
    if (this.checkShouldShowPanel() && event.detail.newMode == "INTERFACEMODE_DIPLOMACY_HUB") {
      this.checkRefesh();
      this.realizeInitialFocus();
    }
  }
  onSelectedPlayerChanged() {
    this.previousPlayerIsMajor = Players.get(this.previousPlayer)?.isMajor == true;
    if (this.checkShouldShowPanel()) {
      const playerObject = Players.get(DiplomacyManager.selectedPlayerID);
      if (!playerObject) {
        console.error("panel-diplomacy-actions: Unable to get player object for selected player!");
        return;
      }
      this.updateSelectedPlayerElements(DiplomacyManager.selectedPlayerID);
      if (playerObject.isMajor) {
        this.leaderNameElement?.setAttribute("title", Locale.compose(playerObject.leaderName));
        Audio.playSound("data-audio-showing", "leader-panel");
        this.mementosHeaderElement?.setAttribute(
          "title",
          Locale.compose("LOC_DIPLOMACY_CIV_NAME", playerObject.civilizationAdjective)
        );
      } else {
        this.leaderNameElement?.setAttribute("title", Locale.compose(playerObject.civilizationAdjective));
        if (playerObject.civilizationAdjective != playerObject.name) {
          this.mementosHeaderElement?.setAttribute(
            "title",
            Locale.compose("LOC_DIPLOMACY_INDEPENDENT_CIV_NAME", playerObject.name)
          );
        } else {
          this.mementosHeaderElement?.setAttribute("title", Locale.compose(""));
        }
      }
      this.civSymbol.style.backgroundImage = `url("${Icon.getCivIconForDiplomacyHeader(playerObject.civilizationType)}")`;
      this.diploTint?.style.setProperty(
        "fxs-background-image-tint",
        UI.Player.getPrimaryColorValueAsString(playerObject.id)
      );
      this.Root.classList.toggle("independent", !playerObject.isMajor);
      const isLocalPlayer = DiplomacyManager.selectedPlayerID == GameContext.localPlayerID;
      if (isLocalPlayer) {
        this.refreshTabItems(playerObject, 0 /* LocalPlayerDiplomacy */);
      } else {
        this.refreshTabItems(playerObject, 1 /* OtherPlayerDiplomacy */);
      }
      if (playerObject.isMajor) {
        if (isLocalPlayer && this.previousPlayerIsMajor) {
          this.tabBar?.setAttribute("selected-tab-index", `${this.infoTabIndex}`);
        } else if (this.previousPlayer == GameContext.localPlayerID && this.previousPlayer != DiplomacyManager.selectedPlayerID) {
          this.tabBar?.setAttribute("selected-tab-index", `${this.actionTabIndex}`);
        }
      }
      if (this.initialLoadComplete) {
        this.refreshFullData();
      }
      this.realizeNavTray();
    }
    this.previousPlayer = DiplomacyManager.selectedPlayerID;
  }
  realizeInitialFocus() {
    const playerObject = Players.get(DiplomacyManager.selectedPlayerID);
    if (playerObject && playerObject.isMajor) {
      const tabIndex = this.tabBar?.getAttribute("selected-tab-index");
      if (tabIndex !== null && tabIndex !== void 0) {
        const index = parseInt(tabIndex);
        this.slotGroup?.setAttribute("selected-slot", this.tabItems[index].id);
      }
    }
    const props = { isDisableFocusAllowed: false, direction: InputNavigationAction.NONE };
    if (this.firstFocusSection && this.tabBar?.getAttribute("selected-tab-index")?.valueOf() != this.infoTabIndex.toString() && this.tabBar?.getAttribute("selected-tab-index")?.valueOf() != this.governmentTabIndex.toString() && this.tabBar?.getAttribute("selected-tab-index")?.valueOf() != this.relationshipTabIndex.toString() && this.tabBar?.getAttribute("selected-tab-index")?.valueOf() != this.actionTabIndex.toString() && this.previousPlayerIsMajor == true) {
      FocusManager.get().setFocus(this.firstFocusSection);
    } else {
      if (this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.infoTabIndex.toString() || this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.governmentTabIndex.toString() || this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.relationshipTabIndex.toString() || this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.actionTabIndex.toString()) {
        if (this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.infoTabIndex.toString()) {
          const currentSelectedTab = this.Root.querySelector("#diplomacy-tab-info");
          if (currentSelectedTab) {
            FocusManager.get().setFocus(currentSelectedTab);
          }
        } else if (this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.governmentTabIndex.toString()) {
          const currentSelectedTab = this.Root.querySelector("#diplomacy-tab-government");
          if (currentSelectedTab) {
            FocusManager.get().setFocus(currentSelectedTab);
          }
        } else if (this.tabBar?.getAttribute("selected-tab-index")?.valueOf() == this.actionTabIndex.toString()) {
          const currentSelectedTab = this.Root.querySelector("#diplomacy-tab-actions");
          if (currentSelectedTab) {
            FocusManager.get().setFocus(currentSelectedTab);
          }
        } else {
          const currentSelectedTab = this.Root.querySelector("#diplomacy-tab-relationship");
          if (currentSelectedTab) {
            FocusManager.get().setFocus(currentSelectedTab);
          }
        }
      } else {
        const focusableElement = Navigation.getFirstFocusableElement(this.Root, props);
        if (focusableElement) {
          FocusManager.get().setFocus(focusableElement);
        }
      }
    }
  }
  onActionCanceled(data) {
    const actionData = Game.Diplomacy.getDiplomaticEventData(data.actionID);
    if ((actionData.initialPlayer == DiplomacyManager.selectedPlayerID || actionData.targetPlayer == DiplomacyManager.selectedPlayerID) && this.checkShouldShowPanel() && this.initialLoadComplete) {
      this.refreshPartialData();
    }
  }
  /**
   * Handler to be overrdien in child classes for updates in response to a support change.
   * @param _actionData
   * @returns true if updates occurred, false if nothing changed.
   */
  supportChangedHandler(_actionData) {
    return false;
  }
  /**
   * Support has changed from the players.
   * @param event Gamecore event data
   */
  onSupportChanged(event) {
    const actionData = Game.Diplomacy.getDiplomaticEventData(event.actionID);
    this.supportChangedHandler(actionData);
  }
  // ------------------------------------------------------------------------
  // Handle diplomacy events that may change available options, i.e. suzerainty
  onDiplomacyEventEnded(data) {
    if (data.initialPlayer == GameContext.localPlayerID) {
      this.needsRefresh = true;
    }
  }
  // ------------------------------------------------------------------------
  // Handle diplomacy queue changed event
  onDiplomacyQueueChanged(data) {
    if (data.player1 == GameContext.localPlayerID || data.player2 == GameContext.localPlayerID) {
      this.needsRefresh = true;
    }
  }
  // ------------------------------------------------------------------------
  // Handle the event stream completing
  onGameCoreEventPlaybackComplete() {
    this.checkRefesh();
  }
  // ------------------------------------------------------------------------
  // Check to see if anything needs a refresh
  checkRefesh() {
    if (this.needsRefresh) {
      this.needsRefresh = false;
      DiplomacyManager.populateDiplomacyActions();
      this.populateActionsPanel();
      this.populateAvailableActions();
    }
  }
  /**
   * Check if we are in the proper state to show this panel
   * @returns true if panel should be shown, false otherwise.
   */
  checkShouldShowPanel() {
    return true;
  }
  showLeaderModel() {
  }
  getCostFromTargetList(projectData) {
    let cost = -1;
    projectData.targetList1.forEach((targetData) => {
      if (targetData.targetID == DiplomacyManager.selectedPlayerID) {
        cost = targetData.costYieldD;
      }
    });
    return cost;
  }
  getTargetPlayerFromTargetList(projectData) {
    const targetID = projectData.targetList1.find((targetData) => targetData.targetID)?.targetID;
    if (targetID !== void 0) {
      const targetPlayer = Players.get(targetID);
      return targetPlayer;
    } else {
      return null;
    }
  }
  refreshActionPanel() {
    const projectActionButtons = Array.from(
      this.Root.querySelectorAll(".diplomacy-projects__action-button")
    );
    DiplomacyManager.queryAvailableProjectData(DiplomacyManager.selectedPlayerID);
    for (const actionButton of projectActionButtons) {
      const actionType = actionButton.getAttribute("action-type");
      if (!actionType) {
        console.error(
          "panel-diplomacy-actions: refreshActionPanel - action button did not have an action-type attribute!"
        );
        continue;
      }
      const availableProject = DiplomacyManager.allAvailableActions.find(
        (project) => project.actionTypeName == actionType
      );
      if (!availableProject) {
        continue;
      }
      if (availableProject.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE && actionButton.getAttribute("disabled") != "true") {
        const replacedButton = this.createStartActionListItem(availableProject);
        actionButton.parentElement?.insertBefore(replacedButton, actionButton);
        actionButton.remove();
      }
    }
  }
  createStartActionListItem(projectData, recentlyCompletedData) {
    const startActionItem = document.createElement("fxs-chooser-item");
    startActionItem.classList.add(
      "diplomacy-projects__action-button",
      "min-h-19",
      "w-full",
      "flex",
      "flex-row",
      "justify-start",
      "items-start",
      "mb-2"
    );
    startActionItem.setAttribute("tabindex", "-1");
    startActionItem.setAttribute("data-tooltip-content", Locale.compose(projectData.projectDescription));
    startActionItem.setAttribute("action-type", projectData.actionTypeName);
    startActionItem.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
    const iconContainer = document.createElement("div");
    iconContainer.classList.value = "size-19 flex self-center items-center justify-center pointer-events-none relative";
    startActionItem.appendChild(iconContainer);
    const iconImage = document.createElement("div");
    iconImage.classList.value = "size-16 -top-px bg-center relative flex flex-col items-center bg-cover  justify-center";
    iconContainer.appendChild(iconImage);
    const iconFront = document.createElement("div");
    iconFront.classList.value = "absolute img-civics-icon-frame size-19 flex self-center items-center justify-center pointer-events-none relative";
    iconContainer.appendChild(iconFront);
    let targetPlayerId = PlayerIds.NO_PLAYER;
    if (recentlyCompletedData) {
      switch (projectData.target1Type) {
        case DiplomacyActionTargetTypes.DIPLOMACY_TARGET_INDEPENDENT:
          targetPlayerId = recentlyCompletedData.independentTarget;
          break;
        case DiplomacyActionTargetTypes.DIPLOMACY_TARGET_PLAYER:
          targetPlayerId = recentlyCompletedData.playerTarget;
          break;
      }
      const repeatIcon = document.createElement("img");
      repeatIcon.src = "blp:dip_renew_project";
      iconImage.appendChild(repeatIcon);
      const target2 = Configuration.getPlayer(targetPlayerId);
      if (target2?.leaderTypeName) {
        const targetIcon = document.createElement("leader-icon");
        targetIcon.classList.add("mr-2", "mt-1", "w-16", "h-16", "relative");
        targetIcon.setAttribute("leader", target2.leaderTypeName);
        targetIcon.setAttribute(
          "bg-color",
          UI.Player.getPrimaryColorValueAsString(recentlyCompletedData.playerTarget)
        );
        startActionItem.appendChild(targetIcon);
      }
    }
    const actionDef = GameInfo.DiplomacyActions.lookup(projectData.actionType);
    if (!actionDef) {
      console.error(
        "panel-diplomacy-actions: Unable to get definition for diplomacy action with type: " + projectData.actionTypeName
      );
      iconImage.style.backgroundImage = `url("blp:yield_influence")`;
    } else {
      iconImage.style.backgroundImage = `url("${actionDef.UIIconPath}")`;
    }
    const actionDetailsContainer = document.createElement("div");
    actionDetailsContainer.classList.add(
      "flex-auto",
      "flex",
      "flex-col",
      "justify-between",
      "items-start",
      "self-center",
      "relative"
    );
    const actionName = document.createElement("div");
    actionName.classList.add("font-title", "text-sm", "mb-1", "mt-1", "pointer-events-none", "font-fit-shrink");
    if (projectData.actionTypeName == "DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN") {
      actionName.innerHTML = Locale.compose("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_START_ACTION_NAME");
    } else {
      actionName.innerHTML = Locale.compose(projectData.actionDisplayName);
    }
    actionDetailsContainer.appendChild(actionName);
    startActionItem.appendChild(actionDetailsContainer);
    let targetPlayer = null;
    if (recentlyCompletedData && targetPlayerId != PlayerIds.NO_PLAYER) {
      targetPlayer = Players.get(targetPlayerId);
    } else {
      targetPlayer = this.getTargetPlayerFromTargetList(projectData);
    }
    if (targetPlayer && (targetPlayer.isIndependent || targetPlayer.isMinor)) {
      const IPName = document.createElement("div");
      IPName.classList.add(
        "grow",
        "flex",
        "flex-col",
        "justify-between",
        "items-start",
        "self-center",
        "relative",
        "font-title",
        "text-sm",
        "font-fit-shrink",
        "mr-8",
        "pointer-events-none"
      );
      IPName.innerHTML = Locale.stylize(targetPlayer.civilizationFullName);
      startActionItem.appendChild(IPName);
    }
    const target = recentlyCompletedData ? targetPlayerId : DiplomacyManager.selectedPlayerID;
    const relationshipDeltas = Game.Diplomacy.getActionRelationshipDelta(target, projectData.actionType);
    if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
      const turnsToComplete = Game.Diplomacy.getBaseDiplomaticActionDuration(projectData.actionType);
      let tooltip = projectData.projectDescription + "[N]" + (turnsToComplete > 0 ? Locale.compose("LOC_DIPLOMACY_ACTION_LASTS_FOR_TURNS", turnsToComplete) : "");
      if (relationshipDeltas[0] != 0) {
        const acceptedRelationshipTooltip = Locale.compose(
          "LOC_DIPLOMACY_RELATIONSHIP_CHANGE_ACCEPTED",
          relationshipDeltas[0]
        );
        tooltip = tooltip + "[N]" + acceptedRelationshipTooltip;
      }
      if (relationshipDeltas[1] != 0) {
        const supportedRelationshipTooltip = Locale.compose(
          "LOC_DIPLOMACY_RELATIONSHIP_CHANGE_SUPPORTED",
          relationshipDeltas[1]
        );
        tooltip = tooltip + "[N]" + supportedRelationshipTooltip;
      }
      startActionItem.setAttribute("data-tooltip-content", tooltip);
      startActionItem.setAttribute("disabled", "true");
      const disabledReason = document.createElement("div");
      disabledReason.classList.add("font-body", "text-2xs", "mb-1", "text-negative", "z-1");
      let failureString = "";
      projectData.resultData.FailureReasons?.forEach((reason, index) => {
        if (index > 0) {
          failureString += "[N]";
        }
        failureString += reason;
      });
      disabledReason.innerHTML = Locale.stylize(failureString);
      actionDetailsContainer.appendChild(disabledReason);
    } else {
      const turnsToComplete = Game.Diplomacy.getBaseDiplomaticActionDuration(projectData.actionType);
      let tooltip = projectData.projectDescription + "[N]" + (turnsToComplete > 0 ? Locale.compose("LOC_DIPLOMACY_ACTION_LASTS_FOR_TURNS", turnsToComplete) : "");
      if (relationshipDeltas[0] != 0) {
        const acceptedRelationshipTooltip = Locale.compose(
          "LOC_DIPLOMACY_RELATIONSHIP_CHANGE_ACCEPTED",
          relationshipDeltas[0]
        );
        tooltip = tooltip + "[N]" + acceptedRelationshipTooltip;
      }
      if (relationshipDeltas[1] != 0) {
        const supportedRelationshipTooltip = Locale.compose(
          "LOC_DIPLOMACY_RELATIONSHIP_CHANGE_SUPPORTED",
          relationshipDeltas[1]
        );
        tooltip = tooltip + "[N]" + supportedRelationshipTooltip;
      }
      startActionItem.setAttribute("data-tooltip-content", tooltip);
    }
    if (projectData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && projectData.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
      const projectDefinition = GameInfo.DiplomacyActions.lookup(
        projectData.actionType
      );
      if (!projectDefinition) {
        console.error(
          `panel-diplomacy-actions: createStartActionListItem - no project definition found for ${projectData.actionType}`
        );
        return startActionItem;
      }
      const chanceContainer = document.createElement("div");
      chanceContainer.classList.add("flex", "flex-row");
      actionDetailsContainer.appendChild(chanceContainer);
      const successChance = document.createElement("div");
      successChance.classList.add("font-body", "text-2xs", "mr-3", "font-bold");
      successChance.innerHTML = Locale.compose(
        "LOC_DIPLOMACY_SUCCESS_REVEAL_CHANCE",
        projectDefinition.SuccessChance,
        projectDefinition.RevealChance
      );
      chanceContainer.appendChild(successChance);
      const penalty = Game.Diplomacy.getEspionagePenaltyForReveal(
        projectData.actionType,
        GameContext.localPlayerID
      );
      if (penalty.influence != 0) {
        const penaltyContainer = document.createElement("div");
        penaltyContainer.classList.add("flex", "flex-row");
        actionDetailsContainer.appendChild(penaltyContainer);
        const influencePenalty = document.createElement("div");
        influencePenalty.classList.add("font-body", "mb-1", "text-2xs", "font-bold");
        influencePenalty.innerHTML = Locale.stylize(
          "LOC_DIPLOMACY_ESPIONAGE_PENALTY",
          penalty.influence,
          penalty.turns
        );
        penaltyContainer.appendChild(influencePenalty);
      }
      const stage1MaxTurns = Game.Diplomacy.modifyByGameSpeed(projectDefinition.BaseDuration) - projectData.lastStageDuration;
      const stage1MinTurns = stage1MaxTurns - Game.Diplomacy.modifyByGameSpeed(projectDefinition.RandomInitialProgress);
      let additionalDescriptionString = "";
      if (projectData.lastStageDuration > 0) {
        additionalDescriptionString = Locale.compose(
          "LOC_DIPLOMACY_ACTION_ESPIONAGE_TURNS_AND_DURATION",
          stage1MinTurns,
          stage1MaxTurns,
          projectData.lastStageDuration
        );
      } else {
        additionalDescriptionString = Locale.compose(
          "LOC_DIPLOMACY_ACTION_ESPIONAGE_TURNS",
          stage1MinTurns,
          stage1MaxTurns
        );
      }
      startActionItem.setAttribute(
        "data-tooltip-content",
        projectData.projectDescription + "[N]" + additionalDescriptionString
      );
    }
    if (projectData.targetList2.length > 0 && !recentlyCompletedData) {
      startActionItem.addEventListener("action-activate", () => {
        this.clickStartActionItem(projectData);
      });
      const selectTargetButton = document.createElement("fxs-button");
      selectTargetButton.classList.add("min-w-16", "self-center", "mr-3", "relative");
      selectTargetButton.removeAttribute("tabindex");
      selectTargetButton.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_SELECT_TARGET"));
      selectTargetButton.addEventListener("action-activate", () => {
        this.clickStartActionItem(projectData);
      });
      selectTargetButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
      if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
        selectTargetButton.setAttribute("disabled", "true");
      }
      startActionItem.appendChild(selectTargetButton);
    } else {
      const soundTuple = DiplomacyManager.getAudioIdForDiploAction(projectData);
      startActionItem.setAttribute(soundTuple[0], soundTuple[1]);
      if (recentlyCompletedData) {
        const actionOperationArguments = {
          Amount: 1,
          Player1: GameContext.localPlayerID,
          Type: projectData.actionType
        };
        if (recentlyCompletedData.independentTarget != -1) {
          actionOperationArguments.ID = recentlyCompletedData.independentTarget;
        }
        if (recentlyCompletedData.playerTarget != -1) {
          actionOperationArguments.Player2 = recentlyCompletedData.playerTarget;
        }
        if (recentlyCompletedData.playerTarget2 != -1) {
          actionOperationArguments.Player3 = recentlyCompletedData.playerTarget2;
        }
        if (recentlyCompletedData.targetSettlement != -1) {
          actionOperationArguments.City = recentlyCompletedData.targetSettlement;
        }
        if (recentlyCompletedData.targetUnit != -1) {
          actionOperationArguments.Unit = recentlyCompletedData.targetUnit;
        }
        startActionItem.addEventListener("action-activate", () => {
          this.clickQuickStartActionItem(projectData, recentlyCompletedData);
        });
        const results = Game.PlayerOperations.canStart(
          GameContext.localPlayerID,
          projectData.operationType,
          actionOperationArguments,
          false
        );
        if (!results.Success) {
          startActionItem.classList.add("disabled");
        }
      } else {
        startActionItem.addEventListener("action-activate", () => {
          this.clickQuickStartActionItem(projectData);
        });
      }
      const influenceContainer = document.createElement("div");
      influenceContainer.classList.add(
        "flex",
        "flex-row",
        "self-center",
        "panel-diplomacy-actions__influence-container",
        "pointer-events-none",
        "pr-3",
        "relative"
      );
      const influenceIcon = document.createElement("img");
      influenceIcon.classList.add("w-8", "h-8");
      influenceIcon.src = "blp:yield_influence";
      influenceContainer.appendChild(influenceIcon);
      const influenceCostText = document.createElement("div");
      influenceCostText.classList.add("font-body", "text-sm", "self-center");
      if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
        influenceCostText.classList.add("text-negative", "z-1");
      }
      influenceCostText.innerHTML = this.getCostFromTargetList(projectData).toString();
      influenceContainer.appendChild(influenceCostText);
      const navHelp = document.createElement("fxs-nav-help");
      navHelp.setAttribute("action-key", "inline-accept");
      influenceContainer.appendChild(navHelp);
      startActionItem.appendChild(influenceContainer);
    }
    return startActionItem;
  }
  clickStartActionItem(projectData) {
    DiplomacyManager.clickStartProject(projectData);
  }
  clickQuickStartActionItem(projectData, recentlyCompletedData) {
    if (DiplomacyManager.isClosingActionsPanel) {
      return;
    }
    const actionOperationArguments = {
      Amount: 1,
      Player1: GameContext.localPlayerID,
      Type: projectData.actionType
    };
    if (recentlyCompletedData) {
      if (recentlyCompletedData.independentTarget != -1) {
        actionOperationArguments.ID = recentlyCompletedData.independentTarget;
      }
      if (recentlyCompletedData.playerTarget != -1) {
        actionOperationArguments.Player2 = recentlyCompletedData.playerTarget;
      }
      if (recentlyCompletedData.playerTarget2 != -1) {
        actionOperationArguments.Player3 = recentlyCompletedData.playerTarget2;
      }
      if (recentlyCompletedData.targetSettlement != -1) {
        actionOperationArguments.City = recentlyCompletedData.targetSettlement;
      }
      if (recentlyCompletedData.targetUnit != -1) {
        actionOperationArguments.Unit = recentlyCompletedData.targetUnit;
      }
    } else if (DiplomacyManager.selectedPlayerID != GameContext.localPlayerID) {
      actionOperationArguments.Player2 = DiplomacyManager.selectedPlayerID;
      actionOperationArguments.ID = DiplomacyManager.selectedPlayerID;
    }
    const results = Game.PlayerOperations.canStart(
      GameContext.localPlayerID,
      projectData.operationType,
      actionOperationArguments,
      false
    );
    if (results.Success) {
      Game.PlayerOperations.sendRequest(
        GameContext.localPlayerID,
        projectData.operationType,
        actionOperationArguments
      );
    }
  }
  populateAvailableActions() {
  }
  close() {
    if (DiplomacyManager.isClosingActionsPanel) {
      return;
    }
    if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
      DiplomacyManager.selectedActionID = -1;
      if (DiplomacyManager.currentProjectReactionRequest) {
        const closeToDiploHub = false;
        DiplomacyManager.closeCurrentDiplomacyProject(closeToDiploHub);
      }
      DiplomacyManager.lowerDiplomacyHub();
    } else {
      LeaderModelManager.clear();
    }
    if (this.initDataPopulationTimerHandle != 0) {
      clearTimeout(this.initDataPopulationTimerHandle);
      this.initDataPopulationTimerHandle = 0;
    }
  }
  showBefriendIndependentDetails() {
    if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
      const ourActions = Game.Diplomacy.getPlayerEvents(
        DiplomacyManager.selectedPlayerID
      ).filter((action) => {
        return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
      });
      let befriendIndependentActionID = -1;
      if (ourActions.length > 0) {
        befriendIndependentActionID = ourActions[0].uniqueID;
      }
      if (befriendIndependentActionID == -1) {
        const otherActions = Game.Diplomacy.getPlayerEvents(
          DiplomacyManager.selectedPlayerID
        ).filter((action) => {
          return action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
        });
        if (otherActions.length > 0) {
          befriendIndependentActionID = otherActions[0].uniqueID;
        }
      }
      if (befriendIndependentActionID == -1) {
        return;
      }
      DiplomacyManager.selectedActionID = befriendIndependentActionID;
      this.befriendIndependentDetails = ContextManager.push("screen-befriend-independent-details", {
        singleton: true
      });
      if (this.checkShouldShowPanel()) {
        waitForLayout(() => {
          this.realizeInitialFocus();
        });
      }
    } else {
      ContextManager.pop("screen-befriend-independent-details");
      this.befriendIndependentDetails = void 0;
    }
  }
}

export { DiplomacyActionPanel };
//# sourceMappingURL=panel-diplomacy-actions.js.map
